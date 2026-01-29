# Hunter - 核心工具库

Cocos Creator 游戏开发核心工具库，提供基础的事件、配置、存储等功能。

## 📦 版本

当前版本：`1.0.0`

## 🔗 依赖

无外部依赖（基础层模块）

## ✨ 功能模块

### EventBus - 事件总线

全局事件发布/订阅系统。

```typescript
import EventBus from "db://assets/hunter/utils/event-bus";

// 监听事件
EventBus.on("player:levelup", (level: number) => {
  console.log(`升级到 ${level} 级`);
});

// 发送事件
EventBus.emit("player:levelup", 10);

// 取消监听
EventBus.off("player:levelup");
```

### ConfigLoader - 配置加载器

CSV/JSON 配置文件加载和解析。

```typescript
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";

// 加载配置
const loader = new ConfigLoader();
await loader.loadFromBundle("main-game", "configs/items.csv");

// 获取配置
const item = loader.getById("item_001");
const allItems = loader.getAll();
```

### StorageManager - 存储管理

本地数据持久化存储，支持微信小游戏等多平台。

```typescript
import { StorageManager } from "db://assets/hunter/utils/storage";

// 存储数据
StorageManager.setItem("playerData", { level: 10, gold: 1000 });

// 读取数据
const data = StorageManager.getItem("playerData");

// 删除数据
StorageManager.removeItem("playerData");
```

### Device - 设备检测

设备类型和平台检测。

```typescript
import { Device } from "db://assets/hunter/utils/device";

if (Device.isMobile()) {
  // 移动端逻辑
}

if (Device.isWechatGame()) {
  // 微信小游戏逻辑
}
```

### Time - 时间工具

时间格式化和计算工具。

```typescript
import { formatTime, getToday } from "db://assets/hunter/utils/time";

const formatted = formatTime(3661); // "1:01:01"
const today = getToday(); // "2026-01-29"
```

## 📁 目录结构

```
hunter/
├── utils/
│   ├── event-bus.ts      # 事件总线
│   ├── config-loader.ts  # 配置加载器
│   ├── storage.ts        # 存储管理
│   ├── device.ts         # 设备检测
│   └── time.ts           # 时间工具
└── common.ts             # 公共导出
```

## 📝 更新日志

### [1.0.0] - 2026-01-29

#### Added
- EventBus 事件总线
- ConfigLoader 配置加载器
- StorageManager 存储管理器
- Device 设备检测工具
- Time 时间工具函数
