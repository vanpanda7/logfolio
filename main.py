from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import categories, items

# 创建 FastAPI 应用
app = FastAPI(
    title="Logfolio - 个人年度文化成就墙",
    description="记录影视、书籍、游戏等文化成就的时间线系统",
    version="1.0.0"
)

# 配置 CORS（解决前端跨域问题）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应设置为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(categories.router)
app.include_router(items.router)

# 配置静态文件服务
# 上传的图片目录
app.mount("/static", StaticFiles(directory="static"), name="static")

# 前端页面路由
@app.get("/")
async def read_root():
    """主页"""
    return FileResponse("templates/index.html")

@app.get("/add")
async def add_page():
    """添加记录页"""
    return FileResponse("templates/add.html")

@app.get("/manage-categories")
async def manage_categories_page():
    """管理分类页"""
    return FileResponse("templates/manage_categories.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
