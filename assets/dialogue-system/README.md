# Dialogue-System - 对话/任务/成就系统

完整的游戏对话、任务和成就系统，支持复杂的对话流程和条件分支。

## 📦 版本

当前版本：`1.0.0`

## 🔗 依赖

| 模块 | 最小版本 |
|------|----------|
| hunter | `1.0.0` |
| hunter-ui | `1.0.0` |

## ✨ 功能模块

### DialogueManager - 对话管理

管理对话流程、分支选择、条件判断。

```typescript
import { dialogueManager } from "db://assets/dialogue-system/scripts/index";

// 开始对话
await dialogueManager.startDialogue("npc_001_greeting");

// 监听对话事件
import EventBus from "db://assets/hunter/utils/event-bus";
import { DialogueEvents } from "db://assets/dialogue-system/type";

EventBus.on(DialogueEvents.DialogueStarted, (dialogueId) => {
  console.log("对话开始:", dialogueId);
});

EventBus.on(DialogueEvents.DialogueEnded, (dialogueId) => {
  console.log("对话结束:", dialogueId);
});
```

### QuestManager - 任务管理

管理任务接取、进度追踪、完成判定。

```typescript
import { questManager } from "db://assets/dialogue-system/scripts/index";

// 接取任务
questManager.acceptQuest("quest_001");

// 更新任务进度
questManager.updateProgress("quest_001", "kill_monster", 1);

// 检查任务状态
const quest = questManager.getQuest("quest_001");
console.log("任务状态:", quest.status);

// 监听任务事件
EventBus.on(QuestEvents.QuestAccepted, (questId) => {});
EventBus.on(QuestEvents.QuestCompleted, (questId) => {});
```

### AchievementManager - 成就管理

管理成就解锁和奖励领取。

```typescript
import { achievementManager } from "db://assets/dialogue-system/scripts/index";

// 触发成就条件
achievementManager.trigger("kill_count", 100);

// 获取成就列表
const achievements = achievementManager.getAll();

// 领取成就奖励
achievementManager.claimReward("ach_001");

// 监听成就事件
EventBus.on(AchievementEvents.AchievementUnlocked, (achId) => {});
```

## 🔌 宿主集成

dialogue-system 通过 EventBus 发送事件，宿主游戏需要提供事件承接层。

### 推荐做法

在宿主工程（如 main-game）创建 `DialogueSystemEventHandler.ts`：

```typescript
import { _decorator, Component, director } from "cc";
import EventBus from "db://assets/hunter/utils/event-bus";
import { showToast } from "db://assets/hunter-ui/Toast/ToastManager";
import { DialogueEvents, QuestEvents, AchievementEvents } from "db://assets/dialogue-system/type";
import { achievementManager, questManager, IDialogSystemSaveData } from "db://assets/dialogue-system/scripts/index";
import { StorageManager } from "db://assets/hunter/utils/storage";

const { ccclass } = _decorator;
const DIALOG_SYSTEM_SAVE_KEY = "dialog_system";

@ccclass("DialogueSystemEventHandler")
export class DialogueSystemEventHandler extends Component {
  private saveDialogSystemData(): void {
    const saveData: IDialogSystemSaveData = {
      quests: questManager.toSaveData(),
      achievement: achievementManager.toSaveData(),
    };
    StorageManager.setItem(DIALOG_SYSTEM_SAVE_KEY, saveData);
  }

  protected onLoad(): void {
    EventBus.on(DialogueEvents.NeedLoadScene, (scene: string) => director.loadScene(scene));
    EventBus.on(DialogueEvents.NeedShowToast, (msg: string) => showToast(String(msg ?? "")));

    const save = () => this.saveDialogSystemData();
    EventBus.on(QuestEvents.QuestAccepted, save);
    EventBus.on(QuestEvents.QuestCompleted, save);
    EventBus.on(AchievementEvents.AchievementUnlocked, save);
  }

  protected onDestroy(): void {
    EventBus.off(DialogueEvents.NeedLoadScene);
    EventBus.off(DialogueEvents.NeedShowToast);
    EventBus.off(QuestEvents.QuestAccepted);
    EventBus.off(QuestEvents.QuestCompleted);
    EventBus.off(AchievementEvents.AchievementUnlocked);
  }
}
```

### 初始化示例

```typescript
// Main.ts 中
import { getPersistUICanvas } from "db://assets/hunter-ui/ui-utils";
import { DialogueSystemEventHandler } from "./DialogueSystemEventHandler";

const canvas = getPersistUICanvas();
if (!canvas.node.getComponent(DialogueSystemEventHandler)) {
  canvas.node.addComponent(DialogueSystemEventHandler);
}
```

## 📁 目录结构

```
dialogue-system/
├── scripts/
│   ├── DialogueManager.ts       # 对话管理
│   ├── QuestManager.ts          # 任务管理
│   ├── AchievementManager.ts    # 成就管理
│   ├── DialogueUIManager.ts     # 对话 UI 管理
│   └── index.ts                 # 统一导出
├── prefabs/
│   ├── DialogueUI/              # 对话 UI 预制体
│   ├── QuestUI/                 # 任务 UI 预制体
│   └── AchievementUI/           # 成就 UI 预制体
├── config-template/             # 配置模板
├── images/                      # 图片资源
└── type.ts                      # 类型定义
```

## 📋 配置文件格式

详见 `config-template/` 目录下的模板文件。

## 📝 更新日志

### [1.0.0] - 2026-01-29

#### Added
- DialogueManager 对话管理器
- QuestManager 任务管理器
- AchievementManager 成就管理器
- DialogueUI 对话界面
- QuestNotificationUI 任务通知
- AchievementNotificationUI 成就通知
- 完整的事件系统
- 存档/读档支持