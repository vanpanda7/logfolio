# Logfolio - 个人年度文化成就墙

基于 FastAPI + MySQL + 原生HTML/JS/CSS 的个人文化记录系统，用于记录影视、书籍、游戏等完成情况并生成年度海报墙。

## 功能特性

- 📝 记录文化成就（影视、书籍、游戏等）
- 🏷️ 自定义分类管理
- 📅 时间线展示（核心功能）
- 🖼️ 图片上传（支持多图）
- 📊 年度统计与筛选

## 技术栈

- 后端：FastAPI + SQLAlchemy + MySQL
- 前端：原生 HTML/CSS/JavaScript
- 文件存储：本地文件系统

## 快速开始

### 1. 安装依赖

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置数据库

创建 MySQL 数据库：

```sql
CREATE DATABASE culture_wall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

复制 `.env.example` 为 `.env` 并填写数据库配置：

```bash
cp .env.example .env
```

### 3. 初始化数据库

运行数据库初始化脚本：

```bash
python init_db.py
```

### 4. 启动应用

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000 查看应用。

## 项目结构

```
logfolio/
├── main.py                 # FastAPI 应用入口
├── models.py               # 数据库模型
├── database.py             # 数据库连接配置
├── routers/                # API 路由
│   ├── categories.py       # 分类管理
│   ├── items.py            # 记录管理
│   └── uploads.py          # 文件上传
├── static/                 # 静态文件
│   ├── uploads/            # 上传的图片
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js
│       └── app.js
├── templates/              # HTML 模板
│   ├── index.html          # 主页（时间线海报墙）
│   ├── add.html            # 添加记录
│   └── manage_categories.html  # 管理分类
├── requirements.txt        # Python 依赖
├── .env.example           # 环境变量示例
└── init_db.py             # 数据库初始化脚本
```

## API 文档

启动应用后，访问 http://localhost:8000/docs 查看 Swagger API 文档。

## 开发计划

- [x] 项目初始化
- [x] 数据库设计
- [ ] 后端API实现
- [ ] 前端页面实现
- [ ] 文件上传功能
- [ ] 时间线展示
- [ ] 年度报告生成
