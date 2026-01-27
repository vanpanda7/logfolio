# 快速开始指南

## 🚀 最简单的启动方式

### 步骤 1: 启动后端

```bash
cd backend
./start.sh
```

等待看到类似输出：
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

后端已启动在 `http://localhost:8000`

### 步骤 2: 启动前端（新终端窗口）

打开**新的终端窗口**：

```bash
cd frontend
python3 -m http.server 3000
```

前端已启动在 `http://localhost:3000`

### 步骤 3: 配置前端连接后端

编辑 `frontend/templates/index.html`（或其他 HTML 文件），找到：

```html
<!-- 开发环境：如果前后端分离运行，取消下面的注释并设置后端地址 -->
<!-- <script>
    window.API_BASE_URL = 'http://localhost:8000/api';
</script> -->
```

**取消注释**，改为：

```html
<script>
    window.API_BASE_URL = 'http://localhost:8000/api';
</script>
```

### 步骤 4: 访问

打开浏览器访问：**http://localhost:3000**

## 📝 访问地址总结

- **前端页面**: http://localhost:3000
- **后端 API**: http://localhost:8000/api/
- **API 文档**: http://localhost:8000/docs

## 🔧 如果使用 Nginx（生产环境推荐）

### 配置 Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/frontend;
    index index.html;

    # 前端页面
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 前端静态资源
    location /static/ {
        alias /path/to/frontend/static/;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

这样配置后，访问 `http://yourdomain.com` 即可，前端会自动通过 `/api/` 访问后端。

## ⚠️ 注意事项

1. **开发环境**：前后端需要分别启动，前端需要配置 `API_BASE_URL`
2. **生产环境**：使用 Nginx 反向代理，前端使用相对路径 `/api` 即可
3. **图片访问**：图片通过 `/api/uploads/` 路径访问，确保后端已挂载静态文件服务
