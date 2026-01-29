# dialogue-system 最佳实践：宿主事件承接（Adapter）

dialogue-system 会通过 EventBus emit 一系列事件（DialogueEvents/QuestEvents/AchievementEvents）。
宿主游戏需要提供一个“承接层”，把这些事件翻译成自己的：场景切换、toast、音效、战斗、存档等。

## 推荐做法

- 在宿主工程（例如 main-game）里创建组件脚本 `DialogueSystemEventHandler.ts`
- 在启动入口（例如 Main.ts）里把它 addComponent 到 persist canvas（getPersistUICanvas().node）上

## 示例代码（可复制后按项目改造）

> 注意：这里的 showToast / StorageManager / loadScene 仅为示例，你的项目可替换为自己的实现。

```ts
// 复制到：assets/main-game/scripts/DialogueSystemEventHandler.ts
import { _decorator, Component, director } from "cc";
import EventBus from "db://assets/hunter/utils/event-bus";
import { showToast } from "db://assets/hunter-ui/Toast/ToastManager";
import { AchievementEvents, DialogueEvents, QuestEvents } from "db://assets/dialogue-system/type";
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

## 初始化示例

```ts
// Main.ts 中（示例）
// const canvas = getPersistUICanvas();
// if (!canvas.node.getComponent(DialogueSystemEventHandler)) {
//   canvas.node.addComponent(DialogueSystemEventHandler);
// }
```