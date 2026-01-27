# Logfolio 前端

## 项目结构

```
frontend/
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js          # API 调用封装
│   │   ├── app.js          # 应用主逻辑
│   │   ├── components.js   # 组件
│   │   ├── gallery.js      # 年度墙
│   │   └── todos.js        # 待办列表
│   └── images/
└── templates/
    ├── index.html
    ├── add.html
    ├── gallery.html
    ├── todos.html
    └── categories.html
```

## 配置

### API 地址配置

在 `static/js/api.js` 中配置后端 API 地址：

```javascript
const API_BASE = window.API_BASE_URL || '/api';
```

如果需要指定后端地址，可以在 HTML 中设置：

```html
<script>
    window.API_BASE_URL = 'http://your-api-domain.com/api';
</script>
```

## 部署

### 开发环境

使用任何静态文件服务器，例如：

```bash
# Python
python -m http.server 3000

# Node.js
npx serve .

# 或使用 nginx
```

### 生产环境

1. 将 `frontend/` 目录部署到 Web 服务器（如 Nginx）
2. 配置反向代理，将 `/api/*` 请求转发到后端服务
3. 配置 CORS（如果前后端不同域）

### Nginx 配置示例

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
    }

    # 静态文件
    location /static/ {
        alias /path/to/frontend/static/;
    }
}
```
