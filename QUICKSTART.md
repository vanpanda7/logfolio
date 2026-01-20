# 快速开始指南

## 前置要求

- Python 3.8+
- MySQL 5.7+ 或 MySQL 8.0+
- pip（Python 包管理器）

## 安装步骤

### 1. 创建数据库

登录 MySQL，创建数据库：

```sql
CREATE DATABASE culture_wall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，填写你的数据库配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=culture_wall
```

### 3. 安装依赖

```bash
# 创建虚拟环境（如果还没有）
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 4. 初始化数据库

```bash
python init_db.py
```

这将创建所有必要的表，并插入默认分类（影视、书籍、游戏、音乐）。

### 5. 启动应用

```bash
# 方式1：使用启动脚本
./start.sh

# 方式2：直接使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 6. 访问应用

打开浏览器访问：
- 主页：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 使用说明

### 添加记录

1. 点击导航栏的"添加记录"
2. 填写标题、选择分类、选择完成时间
3. 可选：添加备注和上传图片
4. 点击"提交"

### 管理分类

1. 点击导航栏的"管理分类"
2. 在输入框中输入新分类名称，点击"添加"
3. 可以删除用户自定义的分类（系统默认分类不能删除）

### 查看时间线

1. 在主页可以看到所有记录的时间线海报墙
2. 使用筛选器按分类或年份筛选
3. 记录按完成时间倒序排列

## 功能特性

✅ **核心功能**
- 记录文化成就（影视、书籍、游戏等）
- 自定义分类管理
- 时间线展示（按完成时间排序）
- 图片上传（支持多图）
- 按分类和年份筛选

✅ **技术特性**
- RESTful API 设计
- 响应式前端布局
- 文件上传和存储
- 数据库关系管理

## 常见问题

### 数据库连接失败

检查 `.env` 文件中的数据库配置是否正确，确保：
- MySQL 服务正在运行
- 数据库 `culture_wall` 已创建
- 用户名和密码正确

### 图片无法显示

确保 `static/uploads` 目录存在且有写入权限：

```bash
mkdir -p static/uploads
chmod 755 static/uploads
```

### 端口被占用

如果 8000 端口被占用，可以修改启动命令：

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

## 下一步

- 添加年度统计报告功能
- 实现数据导出（JSON/CSV）
- 添加搜索功能
- 优化移动端体验
