import { _decorator, Component, director, Node } from "cc";
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";
import { StorageManager } from "db://assets/hunter/utils/storage";
import { getPersistUICanvas } from "db://assets/hunter-ui/ui-utils";
import {
  initAndLoadDialogSystem,
  initDialogueUIManager,
  questManager,
  achievementManager,
  IDialogSystemSaveData,
} from "db://assets/dialogue-system/scripts/index";
import { Quest } from "db://assets/dialogue-system/scripts/entities/Quest";
import { Achievement } from "db://assets/dialogue-system/scripts/entities/Achievement";
import { DialogueSystemEventHandler } from "./DialogueSystemEventHandler";

const { ccclass, property } = _decorator;

/** 对话系统存档 key */
const DIALOG_SYSTEM_SAVE_KEY = "dialog_system";

/** 配置加载实体类映射 */
const ENTITY_MAP = {
  Quest,
  Achievement,
};

@ccclass("Main")
export class Main extends Component {
  start() {
    this.initGame();
  }

  private async initGame() {
    console.log("[Main] Initializing game...");

    // 1. 初始化 UI 管理器（并行）
    await Promise.all([
      initDialogueUIManager(),
    ]);
    console.log("[Main] UI managers initialized");

    this.initDialogueSystemEventHandler();

    // 2. 加载配置（等待完成）
    await new Promise<void>((resolve) => {
      ConfigLoader.instance.loadAllConfigs(ENTITY_MAP, () => {
        console.log("[Main] Configs loaded");
        resolve();
      }, {
        bundleName: "main-game",
        configPathPrefix: "configs",
        allConfigPath: "configs/all_config",
      });
    });

    // 3. 从本地存储获取对话系统存档数据
    const saveData = StorageManager.getItem<IDialogSystemSaveData>(
      DIALOG_SYSTEM_SAVE_KEY,
      null
    );

    // 4. 初始化对话系统
    initAndLoadDialogSystem(saveData);

    // 5. 加载任务配置（业务层控制）
    questManager.loadDailyQuests();
    questManager.loadMainQuests();

    console.log("[Main] Game initialized");
  }

  private initDialogueSystemEventHandler(): void {
    const canvas = getPersistUICanvas();
    const node = canvas.node;
    if (!node.getComponent(DialogueSystemEventHandler)) {
      node.addComponent(DialogueSystemEventHandler);
    }
  }

  update(deltaTime: number) { }

  public onClickDemoBtn() {
    director.loadScene("demo");
  }

  /**
   * 保存对话系统数据到本地存储
   * 在需要保存进度时调用
   */
  public saveDialogSystemData() {
    const questsSave = questManager.toSaveData();
    const achievementsSave = achievementManager.toSaveData();

    const saveData: IDialogSystemSaveData = {
      quests: questsSave,
      achievement: achievementsSave,
    };

    StorageManager.setItem(DIALOG_SYSTEM_SAVE_KEY, saveData);
    console.log("[Main] Dialog system data saved");
  }
}
