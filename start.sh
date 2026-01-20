#!/bin/bash
# 启动脚本

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "安装依赖..."
pip install -r requirements.txt

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "警告: .env 文件不存在，请复制 .env.example 并配置数据库连接"
    echo "cp .env.example .env"
fi

# 初始化数据库
echo "初始化数据库..."
python init_db.py

# 启动应用
echo "启动应用..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
