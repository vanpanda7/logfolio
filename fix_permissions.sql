-- 数据库权限修复脚本
-- 需要以 root 用户或有 GRANT 权限的用户执行

-- 1. 确保数据库存在（如果不存在则创建）
CREATE DATABASE IF NOT EXISTS culture_wall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 授予用户 logfolio 对数据库 culture_wall 的所有权限
GRANT ALL PRIVILEGES ON culture_wall.* TO 'logfolio'@'%';

-- 3. 刷新权限使更改生效
FLUSH PRIVILEGES;

-- 4. 验证权限（可选）
SHOW GRANTS FOR 'logfolio'@'%';
