# GitHub 仓库设置指南

## 步骤 1: 在 GitHub 上创建仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `logfolio` (或你喜欢的名字)
   - **Description**: `个人年度文化成就墙 - 记录你的影视、书籍、游戏、音乐等文化消费`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（我们已经有了）
4. 点击 "Create repository"

## 步骤 2: 推送到 GitHub

### 方法一：使用脚本（推荐）

```bash
./push_to_github.sh <你的GitHub用户名> <仓库名>
```

示例：
```bash
./push_to_github.sh rick logfolio
```

### 方法二：手动命令

```bash
# 添加远程仓库（替换为你的 GitHub 用户名和仓库名）
git remote add origin https://github.com/<你的用户名>/<仓库名>.git

# 重命名分支为 main（可选，GitHub 推荐使用 main）
git branch -M main

# 推送到 GitHub
git push -u origin main
```

## 步骤 3: 验证

推送成功后，访问你的 GitHub 仓库页面，应该能看到所有文件。

## 后续操作

### 更新代码后提交

```bash
# 查看更改
git status

# 添加更改的文件
git add .

# 提交更改
git commit -m "描述你的更改"

# 推送到 GitHub
git push
```

### 查看提交历史

```bash
git log --oneline
```

## 注意事项

1. **不要提交敏感信息**：
   - `.env` 文件已在 `.gitignore` 中，不会被提交
   - 确保数据库密码等敏感信息不会出现在代码中

2. **上传的文件**：
   - `static/uploads/` 目录下的文件不会被提交（已在 `.gitignore` 中）

3. **虚拟环境**：
   - `venv/` 目录不会被提交

## 故障排除

### 如果推送失败

1. **认证问题**：
   - 如果使用 HTTPS，可能需要配置 GitHub Personal Access Token
   - 或者使用 SSH：`git remote set-url origin git@github.com:用户名/仓库名.git`

2. **仓库不存在**：
   - 确保已经在 GitHub 上创建了仓库

3. **权限问题**：
   - 确保你有该仓库的写入权限
