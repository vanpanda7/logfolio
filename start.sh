#!/bin/bash

# 后端启动入口脚本（放在 logfolio 根目录）
# 用法：在项目根目录下运行 ./start.sh
# 内部会进入 backend/ 并调用 backend/start.sh

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "错误: 未找到 backend 目录: $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

if [ ! -x "./start.sh" ]; then
    echo "提示: backend/start.sh 没有执行权限，将使用 bash 调用。"
    bash ./start.sh
else
    ./start.sh
fi

