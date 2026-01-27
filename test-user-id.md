# 用户ID传递测试指南

## 问题排查步骤

### 1. 检查 OpenResty 配置
确保配置文件已更新并重载：
```bash
# 检查配置语法
openresty -t -c /path/to/your/nginx.conf

# 重载配置
openresty -s reload
```

### 2. 检查后端日志
查看后端日志中的 `[X-User-ID]` 输出：
```bash
# 查看后端日志
tail -f /path/to/backend/logs/app.log | grep "X-User-ID"
```

应该看到类似这样的输出：
```
INFO: [X-User-ID] path=/api/items/ -> user_id='actual_username'
```

如果看到 `user_id='default_user'`，说明 `X-User-ID` 头没有正确传递。

### 3. 测试 Basic Auth
使用 curl 测试 API 请求：
```bash
# 使用 Basic Auth 测试
curl -u username:password http://tongjun.asia:7777/api/items/ \
  -H "Content-Type: application/json" \
  -v
```

检查响应头中是否包含正确的用户信息。

### 4. 检查浏览器网络请求
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 访问前端页面并触发 API 请求
4. 查看请求头，确认 `Authorization: Basic ...` 存在
5. 查看响应，确认返回的数据是当前用户的数据

### 5. 验证数据库查询
确认后端查询时使用了 `user_id` 过滤：
- 所有 `Item` 查询都应该包含 `Item.user_id == user_id`
- 所有 `Category` 查询都应该包含 `Category.user_id == user_id`

## 常见问题

### 问题1: 所有用户看到相同数据
**原因**: `X-User-ID` 头没有正确传递，后端使用 `default_user`
**解决**: 检查 OpenResty 配置中的 Lua 代码是否正确提取用户名

### 问题2: 认证失败
**原因**: Basic Auth 配置不正确或密码文件路径错误
**解决**: 检查 `auth_basic_user_file` 路径和文件权限

### 问题3: Lua 代码不执行
**原因**: OpenResty 没有加载 Lua 模块或语法错误
**解决**: 检查 OpenResty 错误日志：`/www/sites/logfolio/log/error.log`

## 调试建议

在 OpenResty 配置中添加调试日志：
```nginx
rewrite_by_lua_block {
    local auth = ngx.var.http_authorization
    ngx.log(ngx.ERR, "Authorization header: ", auth or "nil")
    -- ... 其他代码 ...
    ngx.log(ngx.ERR, "Extracted user_id: ", ngx.var.uid)
}
```

然后查看错误日志：
```bash
tail -f /www/sites/logfolio/log/error.log
```
