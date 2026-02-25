from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import os
import io
import httpx

from routers import categories, items
from config import UPLOAD_DIR

JIKAN_BASE = "https://api.jikan.moe/v4"
BANGUMI_BASE = "https://api.bgm.tv"
BANGUMI_USER_AGENT = "Logfolio/1.0 (https://github.com/your-repo; cover search)"

# 设为 True 时在控制台打印每个 /api 请求的 X-User-ID，便于排查「不同用户互相看见」：确认是否按用户变化
LOG_X_USER_ID = True
logger = logging.getLogger("uvicorn.error")


class XUserIDMiddleware(BaseHTTPMiddleware):
    """从 OpenResty 的 X-User-ID 读取用户标识；无此头时用 default_user"""
    async def dispatch(self, request, call_next):
        raw = request.headers.get("X-User-ID") or "default_user"
        request.state.user_id = raw.strip() or "default_user"
        if LOG_X_USER_ID and request.url.path.startswith("/api/"):
            logger.info(f"[X-User-ID] path={request.url.path} -> user_id={request.state.user_id!r}")
        return await call_next(request)


app = FastAPI(title="Logfolio API", version="1.0.0", description="Logfolio 后端 API 服务")

app.add_middleware(XUserIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 只包含 API 路由
app.include_router(categories.router)
app.include_router(items.router)


# WebP 缓存目录：首次转换后写入，后续直接读文件，避免重复转换
WEBP_CACHE_DIR = os.path.join(UPLOAD_DIR, ".webp_cache")


def _webp_cache_path(source_path: str) -> str:
    """源文件路径对应的 WebP 缓存文件路径（含扩展名区分 a.jpg / a.png）"""
    name = os.path.basename(source_path)
    base, ext = os.path.splitext(name)
    ext = (ext or "").lstrip(".")
    safe_base = "".join(c if c.isalnum() or c in "-_." else "_" for c in base).strip(".") or "img"
    safe_ext = "".join(c if c.isalnum() else "_" for c in ext) or "img"
    return os.path.join(WEBP_CACHE_DIR, f"{safe_base}_{safe_ext}.webp")


@app.get("/api/serve-webp/{path:path}")
async def serve_webp(path: str):
    """将上传目录中的图片以 WebP 格式返回；首次转换后写入磁盘缓存，后续直接读缓存"""
    if not path or ".." in path or path.startswith("/"):
        return Response(status_code=400)
    name = os.path.basename(path)
    file_path = os.path.join(UPLOAD_DIR, name)
    if not os.path.isfile(file_path):
        return Response(status_code=404)
    cache_path = _webp_cache_path(file_path)
    src_mtime = os.path.getmtime(file_path)
    # 有缓存且缓存不旧于源文件则直接返回
    if os.path.isfile(cache_path) and os.path.getmtime(cache_path) >= src_mtime:
        try:
            with open(cache_path, "rb") as f:
                return Response(content=f.read(), media_type="image/webp")
        except Exception as e:
            logger.warning("serve_webp read cache failed for %s: %s", name, e)
    try:
        from PIL import Image
        with Image.open(file_path) as img:
            img.load()
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, "WEBP", quality=85, method=6)
            data = buf.getvalue()
        os.makedirs(WEBP_CACHE_DIR, exist_ok=True)
        try:
            with open(cache_path, "wb") as f:
                f.write(data)
        except Exception as e:
            logger.warning("serve_webp write cache failed for %s: %s", name, e)
        return Response(content=data, media_type="image/webp")
    except Exception as e:
        logger.warning("serve_webp failed for %s: %s", name, e)
        return Response(status_code=500)


# 提供上传文件的静态访问（如果需要）
if os.path.exists(UPLOAD_DIR):
    app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def _bangumi_subject_to_item(s):
    """Bangumi 条目转统一格式；支持中文名"""
    images = s.get("images") or {}
    url = (images.get("large") or images.get("common") or images.get("medium") or "").strip()
    if not url:
        return None
    # 优先中文名
    name_cn = (s.get("name_cn") or "").strip()
    name = (s.get("name") or "").strip()
    title = name_cn or name
    stype = s.get("type")
    if stype == 1:
        type_label = "漫画"
    elif stype == 4:
        type_label = "游戏"
    else:
        type_label = "动漫"
    return {"type": type_label, "title": title, "title_japanese": name if not name_cn else "", "url": url}


@app.get("/api/anime-search")
async def anime_search(
    q: str = Query(..., min_length=1),
    type: str = Query("both", regex="^(anime|manga|both|game|all)$"),
    page: int = Query(1, ge=1),
    source: str = Query("both", regex="^(mal|bangumi|both)$"),
):
    """搜索动漫/漫画/游戏封面：type=game 仅 Bangumi 游戏，all=动漫+漫画+游戏"""
    items_list = []
    has_next_page = False
    limit_per_page = 24

    async def search_bangumi():
        nonlocal has_next_page
        if source in ("bangumi", "both") and type != "anime" and type != "manga":
            try:
                if type == "game":
                    filter_types = [4]
                elif type == "all":
                    filter_types = [2, 1, 4]
                else:
                    filter_types = [2]
                    if type in ("manga", "both"):
                        filter_types.append(1)
                offset = (page - 1) * limit_per_page
                async with httpx.AsyncClient(timeout=12.0, headers={"User-Agent": BANGUMI_USER_AGENT}) as client:
                    r = await client.post(
                        f"{BANGUMI_BASE}/v0/search/subjects",
                        json={"keyword": q, "filter": {"type": filter_types}},
                        params={"limit": limit_per_page, "offset": offset},
                    )
                    r.raise_for_status()
                    data = r.json()
                    list_data = data.get("data") or data.get("list") or []
                    results = []
                    for s in list_data:
                        item = _bangumi_subject_to_item(s)
                        if item:
                            results.append(item)
                    if len(list_data) >= limit_per_page:
                        has_next_page = True
                    return results
            except Exception as e:
                logging.getLogger("uvicorn.error").warning("Bangumi search failed: %s", e)
        return []

    async def search_mal_anime():
        nonlocal has_next_page
        if source in ("mal", "both") and type in ("anime", "both", "all"):
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    r = await client.get(f"{JIKAN_BASE}/anime", params={"q": q, "limit": 12, "page": page})
                    r.raise_for_status()
                    data = r.json()
                    pagination = data.get("pagination") or {}
                    if pagination.get("has_next_page"):
                        has_next_page = True
                    results = []
                    for a in (data.get("data") or []):
                        url = (a.get("images") or {}).get("jpg", {}).get("large_image_url") or (a.get("images") or {}).get("jpg", {}).get("image_url")
                        if url:
                            results.append({"type": "动漫", "title": a.get("title"), "title_japanese": a.get("title_japanese"), "url": url})
                    return results
            except Exception as e:
                logging.getLogger("uvicorn.error").warning("Jikan anime search failed: %s", e)
        return []

    async def search_mal_manga():
        nonlocal has_next_page
        if source in ("mal", "both") and type in ("manga", "both", "all"):
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    r = await client.get(f"{JIKAN_BASE}/manga", params={"q": q, "limit": 12, "page": page})
                    r.raise_for_status()
                    data = r.json()
                    pagination = data.get("pagination") or {}
                    if pagination.get("has_next_page"):
                        has_next_page = True
                    results = []
                    for m in (data.get("data") or []):
                        url = (m.get("images") or {}).get("jpg", {}).get("large_image_url") or (m.get("images") or {}).get("jpg", {}).get("image_url")
                        if url:
                            results.append({"type": "漫画", "title": m.get("title"), "title_japanese": m.get("title_japanese"), "url": url})
                    return results
            except Exception as e:
                logging.getLogger("uvicorn.error").warning("Jikan manga search failed: %s", e)
        return []

    import asyncio
    results = await asyncio.gather(search_bangumi(), search_mal_anime(), search_mal_manga())
    for r in results:
        items_list.extend(r)

    return {"data": items_list, "has_next_page": has_next_page}


@app.get("/")
async def root():
    """API 根路径"""
    return {"message": "Logfolio API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
