# Submodule 拆分指南

本文档介绍如何将项目中的模块拆分为独立的 Git 仓库，并配置为 submodule。

## 📋 前置准备

### 1. 创建远程仓库

在 GitHub 创建以下仓库（**空仓库，不要初始化 README**）：

| 模块 | 仓库名 | 仓库地址 |
|------|--------|-------|
| hunter | `cc-hunter` | https://github.com/zhuhengtan/cc-hunter |
| hunter-ui | `cc-hunter-ui` | https://github.com/zhuhengtan/cc-hunter-ui |
| dialogue-system | `cc-dialogue-system` | https://github.com/zhuhengtan/cc-dialogue-system |

### 2. 确保当前代码已提交

```bash
cd /Users/zhuhengtan/Documents/projects/Cocos\ Creator/2d-game-template
git status  # 确保没有未提交的更改
git add .
git commit -m "chore: prepare for submodule split"
```

## 🚀 拆分步骤

### 方式一：使用自动脚本（推荐）

```bash
# 添加执行权限并运行
chmod +x scripts/setup-submodules.sh
./scripts/setup-submodules.sh
```

### 方式二：手动操作（逐个模块）

以 `hunter` 模块为例：

#### Step 1: 备份模块到临时目录

```bash
# 创建临时目录
mkdir -p /tmp/module-split
cp -r assets/hunter /tmp/module-split/hunter
```

#### Step 2: 初始化为独立仓库

```bash
cd /tmp/module-split/hunter

# 初始化 git
git init
git add .
git commit -m "Initial commit: hunter core library"

# 添加远程仓库并推送
git remote add origin git@github.com:zhuhengtan/cc-hunter.git
git push -u origin main
```

#### Step 3: 从主项目移除并添加为 submodule

```bash
# 回到主项目
cd /Users/zhuhengtan/Documents/projects/Cocos\ Creator/2d-game-template

# 从 git 中移除原目录
git rm -rf assets/hunter
git commit -m "chore: remove hunter directory for submodule conversion"

# 添加为 submodule
git submodule add git@github.com:zhuhengtan/cc-hunter.git assets/hunter
git commit -m "chore: add hunter as submodule"
```

#### Step 4: 重复以上步骤处理其他模块

| 模块 | 远程仓库 |
|------|----------|
| hunter-ui | `git@github.com:zhuhengtan/cc-hunter-ui.git` |
| dialogue-system | `git@github.com:zhuhengtan/cc-dialogue-system.git` |

## 📝 完成后的操作

### 推送主项目

```bash
git push origin main
```

### 验证 submodule 状态

```bash
git submodule status
```

应该看到类似：
```
 a1b2c3d assets/hunter (heads/main)
 e4f5g6h assets/hunter-ui (heads/main)
 i7j8k9l assets/dialogue-system (heads/main)
```

## 🔄 日常使用

### 克隆项目（含所有 submodule）

```bash
git clone --recursive git@github.com:zhuhengtan/real-2d-game-template.git
```

或者先克隆再初始化 submodule：

```bash
git clone git@github.com:zhuhengtan/real-2d-game-template.git
cd real-2d-game-template
git submodule init
git submodule update
```

### 更新单个 submodule 到最新

```bash
cd assets/hunter
git pull origin main
cd ../..
git add assets/hunter
git commit -m "chore: update hunter to latest"
```

### 更新所有 submodule

```bash
git submodule update --remote
git add .
git commit -m "chore: update all submodules"
```

### 在 submodule 中开发新功能

```bash
# 进入模块
cd assets/hunter

# 创建分支开发
git checkout -b feature/new-feature
# ... 开发 ...
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 创建 PR 合并后，更新主项目引用
cd ../..
git add assets/hunter
git commit -m "chore: update hunter module"
git push
```

## ⚠️ 注意事项

1. **Cocos Creator 的 .meta 文件**
   - Submodule 中包含 .meta 文件
   - 确保 .meta 文件的 UUID 在不同项目中不冲突

2. **依赖关系**
   - `hunter` 应该最先拆分（其他模块依赖它）
   - 更新 `hunter` 后，依赖它的模块可能需要适配

3. **版本兼容性**
   - 主项目 README 中记录了各模块的最小版本要求
   - 更新模块时注意检查兼容性

## 🔧 相关脚本

| 脚本 | 说明 |
|------|------|
| `scripts/setup-submodules.sh` | 一键拆分脚本 |
| `scripts/release.js` | 版本发布脚本 |
| `scripts/release-interactive.js` | 交互式版本发布 |

## 📦 仓库清单

| 仓库 | 说明 | 地址 |
|------|------|------|
| cc-game-template | 主项目模板 | https://github.com/zhuhengtan/cc-game-template |
| cc-hunter | 核心工具库 | https://github.com/zhuhengtan/cc-hunter |
| cc-hunter-ui | UI 组件库 | https://github.com/zhuhengtan/cc-hunter-ui |
| cc-dialogue-system | 对话系统 | https://github.com/zhuhengtan/cc-dialogue-system |
