# Logfolio - 个人年度成就墙

前后端分离架构的个人记录管理系统。

## 项目结构

```
logfolio/
├── backend/          # 后端服务（FastAPI）
│   ├── routers/      # API 路由
│   ├── models.py     # 数据模型
│   ├── database.py   # 数据库配置
│   ├── config.py     # 配置文件
│   ├── main.py       # 应用入口
│   └── requirements.txt
│
├── frontend/         # 前端应用（HTML/CSS/JS）
│   ├── templates/   # HTML 模板
│   ├── static/       # 静态资源（CSS, JS, 图片）
│   └── cp.sh         # 部署脚本
│
└── 配置文件
    ├── nginx-config-fixed.conf      # OpenResty 配置
    └── openresty-logfolio.conf.example
```

## 快速开始

### 后端启动

```bash
cd backend
./start.sh
```

### 前端部署

```bash
cd frontend
./cp.sh
```

## 详细文档

- [快速开始指南](QUICK_START.md)
- [访问指南](ACCESS_GUIDE.md)
- [前后端分离指南](SEPARATION_GUIDE.md)

## 架构说明

- **后端**: FastAPI + SQLAlchemy + MySQL
- **前端**: 原生 HTML/CSS/JavaScript
- **部署**: OpenResty 作为反向代理，提供 Basic Auth 认证和用户隔离
