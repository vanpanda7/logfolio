from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging

from routers import categories, items

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


app = FastAPI(title="Logfolio", version="1.0.0")

app.add_middleware(XUserIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(items.router)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def read_root():
    return FileResponse("templates/index.html")


@app.get("/add")
async def add_page():
    return FileResponse("templates/add.html")


@app.get("/manage-categories")
async def manage_categories_page():
    return FileResponse("templates/manage_categories.html")


@app.get("/gallery")
async def gallery_page():
    return FileResponse("templates/gallery.html")


@app.get("/todos")
async def todos_page():
    return FileResponse("templates/todos.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
