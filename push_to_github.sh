#!/bin/bash

# 推送到 GitHub 的脚本
# 使用方法: ./push_to_github.sh <你的GitHub用户名> <仓库名>

if [ $# -lt 2 ]; then
    echo "使用方法: $0 <GitHub用户名> <仓库名>"
    echo "示例: $0 rick logfolio"
    exit 1
fi

GITHUB_USER=$1
REPO_NAME=$2
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "准备推送到 GitHub..."
echo "远程仓库: ${REMOTE_URL}"
echo ""

# 检查是否已经添加了远程仓库
if git remote | grep -q "^origin$"; then
    echo "远程仓库 'origin' 已存在，更新 URL..."
    git remote set-url origin ${REMOTE_URL}
else
    echo "添加远程仓库..."
    git remote add origin ${REMOTE_URL}
fi

# 显示远程仓库信息
echo ""
echo "当前远程仓库配置:"
git remote -v

echo ""
read -p "是否现在推送到 GitHub? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "推送到 GitHub..."
    git branch -M main 2>/dev/null || git branch -M master
    git push -u origin $(git branch --show-current)
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ 成功推送到 GitHub!"
        echo "访问: https://github.com/${GITHUB_USER}/${REPO_NAME}"
    else
        echo ""
        echo "✗ 推送失败，请检查："
        echo "1. GitHub 仓库是否已创建"
        echo "2. 是否有推送权限"
        echo "3. 网络连接是否正常"
    fi
else
    echo ""
    echo "已配置远程仓库，但未推送。"
    echo "你可以稍后使用以下命令推送："
    echo "  git push -u origin $(git branch --show-current)"
fi
