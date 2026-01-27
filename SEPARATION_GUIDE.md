# 前后端分离指南

## 项目结构

```
logfolio/
├── backend/          # 后端 API 服务
│   ├── main.py       # FastAPI 应用入口
│   ├── config.py     # 配置文件
│   ├── routers/      # API 路由
│   ├── models.py     # 数据模型
│   └── uploads/      # 上传文件目录
│
└── frontend/         # 前端静态文件
    ├── static/       # CSS, JS, 图片
    └── templates/    # HTML 模板
```

## 后端部署

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
DB_HOST=111.228.0.230
DB_PORT=13306
DB_USER=logfolio
DB_PASSWORD=your_password
DB_NAME=logfolio
UPLOAD_DIR=uploads
API_PORT=8000
```

### 3. 启动后端服务

```bash
cd backend
python main.py
# 或
./start.sh
```

后端将在 `http://localhost:8000` 运行

### 4. API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 前端部署

### 1. 配置 API 地址

在 `frontend/static/js/api.js` 中，默认使用相对路径 `/api`。

如果前后端分离部署，需要修改：

```javascript
const API_BASE = 'http://your-api-domain.com/api';
```

或者在 HTML 中设置：

```html
<script>
    window.API_BASE_URL = 'http://your-api-domain.com/api';
</script>
```

### 2. 使用静态文件服务器

```bash
cd frontend
# Python
python -m http.server 3000

# Node.js
npx serve .
```

### 3. Nginx 配置（生产环境）

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/frontend;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-User-ID $http_x_user_id;  # 传递用户ID
    }

    # 静态文件
    location /static/ {
        alias /path/to/frontend/static/;
    }
}
```

## 图片访问

后端上传的图片通过 `/api/uploads/` 路径访问，前端需要确保：

1. 后端正确配置了静态文件服务（已在 `main.py` 中配置）
2. 前端图片URL指向 `/api/uploads/` 而不是 `/static/uploads/`

## 迁移步骤

1. ✅ 后端文件已复制到 `backend/`
2. ✅ 前端文件已复制到 `frontend/`
3. ✅ 后端 `main.py` 已移除页面路由，只保留 API
4. ✅ 后端图片URL路径已更新为 `/api/uploads/`
5. ⚠️ 需要手动迁移现有的上传文件（如果有）

## 注意事项

1. **CORS**: 后端已配置 CORS，允许所有来源（生产环境建议限制）
2. **用户认证**: 后端依赖 `X-User-ID` 头来识别用户
3. **图片路径**: 数据库中的旧图片路径可能需要迁移脚本更新
