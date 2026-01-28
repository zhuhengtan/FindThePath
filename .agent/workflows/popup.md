---
description: 如何使用 PopupManager 显示弹窗
---

# Popup 弹窗使用指南

## 快速使用

```typescript
import { PopupManager } from 'db://assets/hunter-ui/Popup/PopupManager';

// 无动画直接显示
PopupManager.show(node);

// 有动画遮罩（推荐）
PopupManager.show(node, true);

// 关闭弹窗
PopupManager.close(node);
```

## API

### show(node, withAnimation?, options?)

| 参数 | 类型 | 说明 |
|------|------|------|
| node | Node | 弹窗节点 |
| withAnimation | boolean | 是否有遮罩和动画，默认 false |
| options.maskClosable | boolean | 点击遮罩是否关闭，默认 true |
| options.maskOpacity | number | 遮罩透明度 0-255，默认 180 |
| options.destroyOnClose | boolean | 关闭时是否销毁，默认 true |
| options.onMaskClick | () => void | 遮罩点击回调 |
| options.onClose | () => void | 关闭后回调 |

## 使用 ModalConfirm

```typescript
import { ModalConfirmManager, showConfirm, showAlert } from 'db://assets/hunter-ui/Modal/ModalConfirmManager';

// 便捷方法（推荐）
await showConfirm({
  content: '确定删除？',
  onConfirm: () => console.log('确认'),
  onCancel: () => console.log('取消'),
});

await showAlert({
  content: '操作成功',
});

// 或使用单例
await ModalConfirmManager.instance.confirm({ content: '确定？' });
```

## 自定义弹窗

1. 创建 prefab，挂载自定义组件
2. 业务层加载并实例化：
```typescript
const node = instantiate(myPrefab);
node.getComponent(MyPopup)?.setData(data);
PopupManager.show(node, true);
```

## 文件位置

- `hunter-ui/Popup/PopupManager.ts` - 弹窗管理器
- `hunter-ui/Modal/ModalConfirm.ts` - 确认弹窗组件
- `hunter-ui/Modal/ModalConfirmManager.ts` - 确认弹窗管理器（动态加载 prefab）
