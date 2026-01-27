# 前后端访问指南

## 快速开始

### 方式一：开发环境（前后端分离）

#### 1. 启动后端 API

```bash
cd backend
./start.sh
```

后端将在 `http://localhost:8000` 运行

- API 文档: http://localhost:8000/docs
- API 根路径: http://localhost:8000/api/

#### 2. 启动前端服务

打开**新的终端窗口**：

```bash
cd frontend
python3 -m http.server 3000
```

前端将在 `http://localhost:3000` 运行

#### 3. 配置前端 API 地址

编辑 `frontend/templates/index.html`（或其他 HTML 文件），在 `<head>` 中添加：

```html
<script>
    // 开发环境：指向本地后端
    window.API_BASE_URL = 'http://localhost:8000/api';
</script>
```

或者修改 `frontend/static/js/api.js`：

```javascript
const API_BASE = window.API_BASE_URL || 'http://localhost:8000/api';
```

### 方式二：使用 Nginx 反向代理（推荐生产环境）

#### 1. 启动后端

```bash
cd backend
./start.sh
```

后端运行在 `http://localhost:8000`

#### 2. 配置 Nginx

创建或编辑 Nginx 配置文件：

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/frontend;
    index index.html;

    # 前端静态文件
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 前端静态资源
    location /static/ {
        alias /path/to/frontend/static/;
    }

    # API 代理到后端
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-User-ID $http_x_user_id;  # 传递用户ID（如果使用）
    }
}
```

#### 3. 访问

访问 `http://yourdomain.com` 即可，前端会自动通过 `/api/` 路径访问后端。

### 方式三：使用相对路径（最简单）

如果前后端部署在同一域名下，可以使用相对路径：

#### 1. 启动后端

```bash
cd backend
./start.sh
```

#### 2. 启动前端（使用 Nginx 或 Apache）

将 `frontend/` 目录部署到 Web 服务器，配置反向代理将 `/api/` 转发到后端。

前端 `api.js` 默认使用 `/api` 相对路径，会自动指向同一域名下的后端。

## 当前配置检查

### 检查后端是否运行

```bash
curl http://localhost:8000/
# 应该返回: {"message":"Logfolio API","version":"1.0.0"}

curl http://localhost:8000/api/items/years
# 应该返回年份列表
```

### 检查前端 API 配置

查看 `frontend/static/js/api.js` 中的 `API_BASE` 设置。

## 常见问题

### 1. CORS 错误

如果前端和后端不在同一域名，需要确保后端 CORS 配置正确（已在 `main.py` 中配置）。

### 2. 图片无法显示

- 检查图片 URL 是否为 `/api/uploads/xxx.jpg`
- 确保后端 `main.py` 中已挂载 `/api/uploads` 静态文件服务
- 检查文件是否存在于 `backend/uploads/` 目录

### 3. API 请求 404

- 确认后端正在运行
- 检查 API 路径是否正确（应该是 `/api/items/...`）
- 查看浏览器控制台的网络请求

## 推荐部署方案

### 开发环境
- 后端: `http://localhost:8000`
- 前端: `http://localhost:3000`
- 前端配置: `window.API_BASE_URL = 'http://localhost:8000/api'`

### 生产环境
- 使用 Nginx 作为反向代理
- 前端和后端使用同一域名
- 前端通过 `/api/` 路径访问后端
- 图片通过 `/api/uploads/` 访问
