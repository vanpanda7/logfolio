#!/bin/bash

# 启动后端 API 服务
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "安装依赖..."
pip install -r requirements.txt

# 启动应用
echo "启动应用..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000