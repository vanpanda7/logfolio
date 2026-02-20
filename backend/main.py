from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import os
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
    type_label = "漫画" if stype == 1 else "动漫"
    return {"type": type_label, "title": title, "title_japanese": name if not name_cn else "", "url": url}


@app.get("/api/anime-search")
async def anime_search(
    q: str = Query(..., min_length=1),
    type: str = Query("both", regex="^(anime|manga|both)$"),
    page: int = Query(1, ge=1),
    source: str = Query("both", regex="^(mal|bangumi|both)$"),
):
    """搜索动漫/漫画封面：source=mal 仅英文/日文(MAL)，bangumi 支持中文，both 同时搜并合并"""
    items_list = []
    has_next_page = False
    limit_per_page = 24

    # Bangumi（支持中文搜索）
    if source in ("bangumi", "both"):
        try:
            filter_types = [2]  # 动画
            if type in ("manga", "both"):
                filter_types.append(1)  # 书籍
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
                for s in list_data:
                    item = _bangumi_subject_to_item(s)
                    if item:
                        items_list.append(item)
                if len(list_data) >= limit_per_page:
                    has_next_page = True
        except Exception as e:
            logging.getLogger("uvicorn.error").warning("Bangumi search failed: %s", e)

    # MyAnimeList / Jikan（英文/日文搜索）
    if source in ("mal", "both"):
        async with httpx.AsyncClient(timeout=12.0) as client:
            if type in ("anime", "both"):
                try:
                    r = await client.get(f"{JIKAN_BASE}/anime", params={"q": q, "limit": 12, "page": page})
                    r.raise_for_status()
                    data = r.json()
                    pagination = data.get("pagination") or {}
                    if pagination.get("has_next_page"):
                        has_next_page = True
                    for a in (data.get("data") or []):
                        url = (a.get("images") or {}).get("jpg", {}).get("large_image_url") or (a.get("images") or {}).get("jpg", {}).get("image_url")
                        if url:
                            items_list.append({"type": "动漫", "title": a.get("title"), "title_japanese": a.get("title_japanese"), "url": url})
                except Exception as e:
                    logging.getLogger("uvicorn.error").warning("Jikan anime search failed: %s", e)
            if type in ("manga", "both"):
                try:
                    r = await client.get(f"{JIKAN_BASE}/manga", params={"q": q, "limit": 12, "page": page})
                    r.raise_for_status()
                    data = r.json()
                    pagination = data.get("pagination") or {}
                    if pagination.get("has_next_page"):
                        has_next_page = True
                    for m in (data.get("data") or []):
                        url = (m.get("images") or {}).get("jpg", {}).get("large_image_url") or (m.get("images") or {}).get("jpg", {}).get("image_url")
                        if url:
                            items_list.append({"type": "漫画", "title": m.get("title"), "title_japanese": m.get("title_japanese"), "url": url})
                except Exception as e:
                    logging.getLogger("uvicorn.error").warning("Jikan manga search failed: %s", e)

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
