---
description: 如何发布模块版本（更新 README、CHANGELOG 并推送 Git）
---

# 版本发布流程

本项目使用 Submodule 架构，各模块有独立的 Git 仓库。发布版本时需要更新文档并推送。

## 快速发布（推荐）

```bash
npm run release
```

交互式引导，自动完成：
1. 选择模块
2. 选择版本类型（patch/minor/major）
3. 输入变更说明
4. 更新 README 版本号和更新日志
5. 更新主项目 CHANGELOG
6. 可选：自动 Git 提交和推送

## 命令行发布

```bash
# 发布模块
node scripts/release.js <模块名> <版本号> --type <类型> --message "<说明>"

# 示例
node scripts/release.js hunter 1.0.1 --type patch --message "修复存储兼容性问题"
node scripts/release.js hunter-ui 1.1.0 --type minor --message "新增 Loading 组件"
node scripts/release.js dialogue-system 1.0.2 --type patch --message "修复任务进度bug"
node scripts/release.js main 1.1.0 --type minor --message "更新所有模块"
```

## 模块名对照

| 模块名 | 本地目录 | 远程仓库 |
|--------|----------|----------|
| hunter | assets/hunter | cc-hunter |
| hunter-ui | assets/hunter-ui | cc-hunter-ui |
| dialogue-system | assets/dialogue-system | cc-dialogue-system |
| main | / | real-2d-game-template |

## 版本类型说明

| 类型 | 说明 | 版本号变化 |
|------|------|------------|
| patch | 修复 bug | 1.0.0 → 1.0.1 |
| minor | 新增功能 | 1.0.0 → 1.1.0 |
| major | 破坏性更新 | 1.0.0 → 2.0.0 |

## 发布后的 Git 操作

脚本会提示 Git 命令，也可手动执行：

### 发布模块（submodule）

```bash
# 1. 进入模块目录
cd assets/hunter

# 2. 提交并打标签
git add .
git commit -m "chore: release v1.0.1 - 修复xxx"
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags

# 3. 回到主项目更新 submodule 引用
cd ../..
git add .
git commit -m "chore: update hunter to v1.0.1"
git push origin main
```

### 发布主项目

```bash
git add .
git commit -m "chore: release v1.1.0"
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main --tags
```

## 文档更新内容

发布脚本会自动更新：

1. **模块 README.md**
   - 版本号：`当前版本：\`1.0.1\``
   - 更新日志：在 `## 📝 更新日志` 下添加条目

2. **主项目 CHANGELOG.md**
   - 在 `[Unreleased]` 后添加新版本条目

3. **主项目 README.md**（仅模块发布时）
   - 更新模块依赖表中的版本号

## 常用命令

```bash
# 查看 submodule 状态
git submodule status

# 更新所有 submodule 到最新
git submodule update --remote

# 克隆项目时初始化 submodule
git clone --recursive <仓库地址>
# 或
git clone <仓库地址>
git submodule init
git submodule update
```
