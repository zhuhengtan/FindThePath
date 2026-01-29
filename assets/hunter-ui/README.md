# Hunter-UI - UI 组件库

Cocos Creator 游戏 UI 组件库，提供常用的 UI 组件和管理器。

## 📦 版本

当前版本：`1.0.0`

## 🔗 依赖

| 模块 | 最小版本 |
|------|----------|
| hunter | `1.0.0` |

## ✨ 组件列表

### Toast - 轻提示

显示短暂的提示消息。

```typescript
import { showToast } from "db://assets/hunter-ui/Toast/ToastManager";

showToast("操作成功！");
showToast("加载中...", 3); // 显示 3 秒
showToast("完成", 2, () => console.log("Toast 结束"));
```

### Modal - 模态确认框

显示确认/取消对话框。

```typescript
import { showModalConfirm } from "db://assets/hunter-ui/Modal/ModalConfirmManager";

const result = await showModalConfirm({
  title: "提示",
  content: "确定要删除吗？",
  confirmText: "确定",
  cancelText: "取消",
});

if (result) {
  // 用户点击确定
}
```

### Popup - 弹窗管理

统一的弹窗显示和管理系统。

```typescript
import { PopupManager } from "db://assets/hunter-ui/Popup/PopupManager";

// 显示弹窗
await PopupManager.instance.show("ShopPopup", { itemId: "item_001" });

// 关闭弹窗
PopupManager.instance.close("ShopPopup");
```

### RedDot - 红点系统

灵活的红点提示系统，支持层级聚合。

```typescript
import RedDotManager from "db://assets/hunter-ui/RedDot/RedDotManager";

// 设置红点状态
RedDotManager.instance.setState("sign.daily.day1", true);
RedDotManager.instance.setState("sign.daily.day2", { active: true, count: 3 });

// 监听红点变化（会自动聚合子路径）
RedDotManager.instance.on("sign.daily", (state) => {
  console.log("签到红点状态:", state.active, state.count);
});

// 在 Cocos Creator 编辑器中：
// 1. 添加 RedDot 组件到节点
// 2. 设置 path = "sign.daily"
// 3. 选择 style（Dot/Count/Exclamation）
```

### TabBar - 标签栏

可复用的标签栏组件。

```typescript
// TabBar 组件使用
// 1. 在预制体中添加 TabBar 组件
// 2. 配置 tabs 数组
// 3. 监听 onTabChange 事件
```

### ProgressBar - 进度条

带动画效果的进度条。

```typescript
// ProgressBar 组件
// 支持平滑过渡动画
progressBar.setProgress(0.75, 0.5); // 0.5秒过渡到75%
```

### DamageNumber - 伤害数字

战斗伤害数字飘字效果。

```typescript
import { DamageNumberManager } from "db://assets/hunter-ui/DamageNumber/DamageNumberManager";

DamageNumberManager.instance.show({
  value: 999,
  position: worldPos,
  type: "critical", // normal | critical | heal
});
```

## 📁 目录结构

```
hunter-ui/
├── Common/           # 公共资源
├── Toast/            # 轻提示组件
├── Modal/            # 模态框组件
├── Popup/            # 弹窗管理
├── RedDot/           # 红点系统
├── TabBar/           # 标签栏
├── ProgressBar/      # 进度条
├── DamageNumber/     # 伤害数字
└── ui-utils/         # UI 工具函数
```

## 🎨 使用方式

### 方式一：代码调用

直接 import 对应的 Manager 类进行调用。

### 方式二：编辑器配置

将对应组件（如 RedDot、TabBar）添加到节点上，在 Inspector 中配置参数。

## 📝 更新日志

### [1.0.0] - 2026-01-29

#### Added
- Toast 轻提示组件
- Modal 模态确认框
- Popup 弹窗管理器
- RedDot 红点系统（字符串路径配置）
- TabBar 标签栏组件
- ProgressBar 进度条组件
- DamageNumber 伤害数字组件
- UI 工具函数（getPersistUICanvas 等）

#### Changed
- RedDot 重构：移除枚举，改用字符串路径配置
- 统一使用 assetManager 加载预制体
