#!/bin/bash

# 前端文件部署脚本
# 将 frontend/ 目录下的 static/ 和 templates/ 复制到目标目录

TARGET_DIR="/opt/1panel/www/sites/logfolio/index"

# 检查目标目录是否存在
if [ ! -d "$TARGET_DIR" ]; then
    echo "错误: 目标目录不存在: $TARGET_DIR"
    exit 1
fi

echo "开始复制前端文件到 $TARGET_DIR ..."

# 复制 static/ 目录
if [ -d "static" ]; then
    echo "复制 static/ 目录..."
    sudo cp -r static/ "$TARGET_DIR/"
    sudo chown -R ubuntu:ubuntu "$TARGET_DIR/static/"
    echo "✓ static/ 复制完成"
else
    echo "警告: static/ 目录不存在"
fi

# 复制 templates/ 目录下的文件
if [ -d "templates" ]; then
    echo "复制 templates/ 文件..."
    sudo cp -r templates/* "$TARGET_DIR/"
    sudo chown -R ubuntu:ubuntu "$TARGET_DIR"/*.html 2>/dev/null || true
    echo "✓ templates/ 复制完成"
else
    echo "警告: templates/ 目录不存在"
fi

echo ""
echo "✅ 前端文件复制完成！"
echo "目标目录: $TARGET_DIR"