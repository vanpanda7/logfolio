# Logfolio 后端 API

## 项目结构

```
backend/
├── main.py              # FastAPI 应用入口
├── config.py            # 配置文件
├── database.py          # 数据库连接
├── models.py            # 数据模型
├── deps.py              # 依赖注入
├── routers/             # API 路由
│   ├── categories.py   # 分类相关 API
│   └── items.py        # 记录相关 API
├── requirements.txt     # Python 依赖
└── uploads/            # 上传文件目录（需要创建）
```

## 安装依赖

```bash
pip install -r requirements.txt
```

## 配置

1. 复制 `.env.example` 为 `.env`
2. 配置数据库连接信息
3. 配置上传目录路径

## 运行

```bash
python main.py
# 或
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API 文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 环境变量

- `DB_HOST`: 数据库主机
- `DB_PORT`: 数据库端口
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称
- `UPLOAD_DIR`: 上传文件目录（默认: uploads）
- `API_PORT`: API 服务端口（默认: 8000）
