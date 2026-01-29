#!/bin/bash

# ================================================
# Submodule 拆分脚本
# ================================================
#
# 使用方法：
#   chmod +x scripts/setup-submodules.sh
#   ./scripts/setup-submodules.sh
#
# ================================================

# GitHub 用户名
GITHUB_USER="zhuhengtan"

# 模块配置：本地目录名 -> 远程仓库名
declare -A MODULE_MAP=(
  ["hunter"]="cc-hunter"
  ["hunter-ui"]="cc-hunter-ui"
  ["dialogue-system"]="cc-dialogue-system"
)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}       Submodule 拆分工具${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# 确认操作
echo -e "${YELLOW}即将执行以下操作：${NC}"
for local_name in "${!MODULE_MAP[@]}"; do
  remote_name="${MODULE_MAP[$local_name]}"
  echo "  - 将 assets/$local_name 转为 submodule"
  echo "    远程仓库: git@github.com:$GITHUB_USER/$remote_name.git"
done
echo ""
echo -e "${YELLOW}请确保已在 GitHub 创建以下仓库：${NC}"
for local_name in "${!MODULE_MAP[@]}"; do
  remote_name="${MODULE_MAP[$local_name]}"
  echo "  - https://github.com/$GITHUB_USER/$remote_name"
done
echo ""
read -p "确认继续？(y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "已取消"
  exit 0
fi

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo ""
echo -e "${GREEN}使用临时目录: $TEMP_DIR${NC}"

# 获取当前目录
PROJECT_ROOT=$(pwd)

# 处理每个模块
for local_name in "${!MODULE_MAP[@]}"; do
  remote_name="${MODULE_MAP[$local_name]}"
  
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}处理模块: $local_name -> $remote_name${NC}"
  echo -e "${GREEN}========================================${NC}"

  MODULE_PATH="assets/$local_name"
  REMOTE_URL="git@github.com:$GITHUB_USER/$remote_name.git"
  TEMP_MODULE_DIR="$TEMP_DIR/$local_name"

  # 检查模块目录是否存在
  if [ ! -d "$MODULE_PATH" ]; then
    echo -e "  ${RED}错误: 目录 $MODULE_PATH 不存在，跳过${NC}"
    continue
  fi

  # 1. 复制模块到临时目录
  echo "  [1/6] 复制模块到临时目录..."
  cp -r "$MODULE_PATH" "$TEMP_MODULE_DIR"

  # 2. 在临时目录初始化 git
  echo "  [2/6] 初始化 git 仓库..."
  cd "$TEMP_MODULE_DIR"
  git init
  git add .
  git commit -m "Initial commit: $local_name module"

  # 3. 添加远程并推送
  echo "  [3/6] 添加远程仓库并推送..."
  git remote add origin "$REMOTE_URL"
  
  # 尝试推送到 main 分支
  if git push -u origin main 2>/dev/null; then
    echo "  成功推送到 main 分支"
  else
    echo "  尝试推送到 master 分支..."
    git branch -M master
    if git push -u origin master 2>/dev/null; then
      echo "  成功推送到 master 分支"
    else
      echo -e "  ${RED}推送失败，请检查远程仓库是否存在${NC}"
      cd "$PROJECT_ROOT"
      continue
    fi
  fi

  # 4. 回到主项目
  cd "$PROJECT_ROOT"

  # 5. 删除原目录（从 git 中移除）
  echo "  [4/6] 从主项目中移除原目录..."
  git rm -rf "$MODULE_PATH"
  git commit -m "chore: remove $local_name directory for submodule conversion"

  # 6. 添加为 submodule
  echo "  [5/6] 添加为 submodule..."
  git submodule add "$REMOTE_URL" "$MODULE_PATH"
  git commit -m "chore: add $local_name as submodule ($remote_name)"

  echo -e "  ${GREEN}[6/6] $local_name 处理完成！${NC}"
done

# 清理临时目录
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}所有模块处理完成！${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "接下来请执行："
echo "  git push origin main"
echo ""
echo "查看 submodule 状态："
echo "  git submodule status"
echo ""
echo "仓库地址："
for local_name in "${!MODULE_MAP[@]}"; do
  remote_name="${MODULE_MAP[$local_name]}"
  echo "  - https://github.com/$GITHUB_USER/$remote_name"
done
echo ""
