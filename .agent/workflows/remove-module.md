---
description: 如何从项目中移除可选模块（如 dialogue-system、skill-system、inventory-system 等）
---

# 移除可选模块

本项目使用 Submodule 架构，可选模块可以按需移除。

## 可移除的模块列表

| 模块 | 目录 | 说明 |
|------|------|------|
| dialogue-system | assets/dialogue-system | 对话/任务/成就系统 |
| skill-system | assets/skill-system | 技能系统（规划中） |
| inventory-system | assets/inventory-system | 背包系统（规划中） |

> **注意**: `cc-hunter` 和 `cc-hunter-ui` 是核心模块，不建议移除。

## 移除步骤

### 1. 移除 Submodule

将 `<module>` 替换为要移除的模块名：

```bash
# 移除 Git 跟踪
git submodule deinit -f assets/<module>

# 删除 .git/modules 中的记录
rm -rf .git/modules/assets/<module>

# 从工作区删除
git rm -f assets/<module>

# 提交更改
git commit -m "chore: remove <module> submodule"
```

### 2. 清理代码引用

移除 submodule 后，需要删除或注释掉引用该模块的代码。

**搜索引用**：
```bash
# 通用搜索
grep -rn "<module>" assets/main-game/

# 针对 dialogue-system
grep -rn "DialogueManager\|QuestManager\|AchievementManager\|dialogue-system" assets/main-game/
```

**常见需要清理的位置**：
- `Main.ts` - 系统初始化调用
- `GlobalUIManager.ts` - UI 预加载配置
- 场景脚本 - 触发对话/任务的代码
- 配置文件引用

### 3. 清理配置

如果有 CSV 配置引用了该模块的表，也需要清理：
```bash
grep -rn "<module>" assets/main-game/configs/
```

## 示例：移除 dialogue-system

```bash
# 1. 移除 submodule
git submodule deinit -f assets/dialogue-system
rm -rf .git/modules/assets/dialogue-system
git rm -f assets/dialogue-system

# 2. 搜索代码引用
grep -rn "dialogue-system" assets/main-game/
grep -rn "DialogueManager" assets/main-game/
grep -rn "QuestManager" assets/main-game/
grep -rn "AchievementManager" assets/main-game/

# 3. 手动删除或注释掉搜索到的引用

# 4. 提交
git commit -m "chore: remove dialogue-system and clean up references"
```

## 验证

移除后运行项目确保没有报错：
1. 在 Cocos Creator 中刷新项目
2. 检查控制台是否有找不到模块的错误
3. 尝试构建项目

## 恢复模块

如果需要重新添加模块：

```bash
git submodule add git@github.com:zhuhengtan/<remote-repo>.git assets/<module>
git submodule update --init
git commit -m "chore: add <module> submodule"
```
