#!/bin/bash

# 前端部署入口脚本（放在 logfolio 根目录）
# 作用：在项目根目录下运行 ./cp.sh，内部会调用 frontend/cp.sh 完成实际拷贝

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "错误: 未找到 frontend 目录: $FRONTEND_DIR"
    exit 1
fi

echo "当前目录: $ROOT_DIR"
echo "准备执行: frontend/cp.sh"

cd "$FRONTEND_DIR"

if [ ! -x "./cp.sh" ]; then
    echo "提示: frontend/cp.sh 没有执行权限，将使用 bash 调用。"
    bash ./cp.sh
else
    ./cp.sh
fi

cd "$ROOT_DIR"
echo "✅ 前端部署完成（通过根目录 cp.sh 调用 frontend/cp.sh）"

