from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import os

from routers import categories, items
from config import UPLOAD_DIR

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
