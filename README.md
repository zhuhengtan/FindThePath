# 2D Game Template

基于 Cocos Creator 的 2D 游戏开发模板，提供了一套完整的游戏开发基础设施。

## ✨ 特性

- 🔧 **模块化架构** - 各功能模块独立，可按需引入
- 🎮 **开箱即用** - 提供常用游戏功能的完整实现
- 📦 **Asset Bundle 支持** - 支持分包加载，优化包体大小
- 🔄 **版本管理** - 各模块独立版本控制

## 📁 项目结构

```
assets/
├── hunter/              # 核心工具库
├── hunter-ui/           # UI 组件库
├── dialogue-system/     # 对话/任务/成就系统
├── inventory-system/    # 背包/物品系统（开发中）
├── skill-system/        # 技能系统（开发中）
├── launch/              # 启动场景
├── main-game/           # 主游戏模块
└── demo/                # 示例演示
```

## 📦 模块依赖

| 模块 | 最小版本 | 说明 |
|------|----------|------|
| [hunter](./assets/hunter/README.md) | `1.0.0` | 核心工具库，所有模块依赖 |
| [hunter-ui](./assets/hunter-ui/README.md) | `1.0.0` | UI 组件库，依赖 hunter |
| [dialogue-system](./assets/dialogue-system/README.md) | `1.0.0` | 对话系统，依赖 hunter, hunter-ui |
| inventory-system | - | 开发中 |
| skill-system | - | 开发中 |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourname/2d-game-template.git
cd 2d-game-template
```

### 2. 使用 Cocos Creator 打开

使用 Cocos Creator 3.x 打开项目目录。

### 3. 运行示例

打开 `assets/demo/scenes/demo.scene` 查看各模块的使用示例。

## 📖 模块文档

各模块的详细使用文档请参考对应目录下的 README.md：

- [hunter - 核心工具库](./assets/hunter/README.md)
- [hunter-ui - UI 组件库](./assets/hunter-ui/README.md)
- [dialogue-system - 对话系统](./assets/dialogue-system/README.md)

## 🔧 开发规范

### 模块间依赖规则

1. `hunter` 作为基础层，不依赖任何其他模块
2. `hunter-ui` 仅依赖 `hunter`
3. 功能模块（dialogue-system 等）可依赖 `hunter` 和 `hunter-ui`
4. `main-game` 可依赖所有模块

### 版本号规范

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- `MAJOR.MINOR.PATCH`
- 不兼容的 API 修改 → MAJOR
- 向下兼容的功能新增 → MINOR
- 向下兼容的问题修复 → PATCH

## 📝 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 📄 License

MIT License
