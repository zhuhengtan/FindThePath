import { _decorator, Component, director } from "cc";
import EventBus from "db://assets/hunter/utils/event-bus";
import { showToast } from "db://assets/hunter-ui/Toast/ToastManager";
import {
  AchievementEvents,
  DialogueEvents,
  QuestEvents,
} from "db://assets/dialogue-system/type";
import {
  achievementManager,
  IDialogSystemSaveData,
  questManager,
} from "db://assets/dialogue-system/scripts/index";
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

  private onNeedUpdateRecord = (recordPatch: any) => {
    if (!recordPatch || typeof recordPatch !== "object") return;
    const prev = StorageManager.getItem<Record<string, any>>(
      "dialogue_record",
      {}
    );
    StorageManager.setItem("dialogue_record", { ...prev, ...recordPatch });
  };

  private onNeedPlaySoundEffect = (sfx: any) => {
    console.warn("[DialogueSystemEventHandler] NeedPlaySoundEffect:", sfx);
  };

  private onNeedLoadBattle = (payload: any) => {
    console.warn("[DialogueSystemEventHandler] NeedLoadBattle:", payload);
  };

  private onGainedItems = (payload: any) => {
    if (!payload) return;
    showToast("获得物品");
  };

  private onNeedLoadScene = (scene: string) => {
    if (!scene) return;
    director.loadScene(scene);
  };

  private onNeedShowToast = (msg: string) => {
    const text = String(msg ?? "");
    if (!text) return;
    showToast(text);
  };

  private onQuestDataChanged = () => {
    this.saveDialogSystemData();
  };

  private onAchievementDataChanged = () => {
    this.saveDialogSystemData();
  };

  protected onLoad(): void {
    EventBus.on(DialogueEvents.NeedUpdateRecord, this.onNeedUpdateRecord);
    EventBus.on(DialogueEvents.NeedPlaySoundEffect, this.onNeedPlaySoundEffect);
    EventBus.on(DialogueEvents.NeedLoadScene, this.onNeedLoadScene);
    EventBus.on(DialogueEvents.NeedLoadBattle, this.onNeedLoadBattle);
    EventBus.on(DialogueEvents.NeedShowToast, this.onNeedShowToast);
    EventBus.on(DialogueEvents.GainedItems, this.onGainedItems);

    EventBus.on(QuestEvents.QuestAccepted, this.onQuestDataChanged);
    EventBus.on(QuestEvents.QuestProgressUpdated, this.onQuestDataChanged);
    EventBus.on(QuestEvents.QuestCompleted, this.onQuestDataChanged);
    EventBus.on(QuestEvents.DailyQuestsReset, this.onQuestDataChanged);
    EventBus.on(QuestEvents.WeeklyQuestsReset, this.onQuestDataChanged);
    EventBus.on(QuestEvents.MonthlyQuestsReset, this.onQuestDataChanged);
    EventBus.on(QuestEvents.ActivityPointsUpdated, this.onQuestDataChanged);
    EventBus.on(QuestEvents.ActivityRewardClaimed, this.onQuestDataChanged);
    EventBus.on(QuestEvents.QuestRewardsGranted, this.onQuestDataChanged);

    EventBus.on(
      AchievementEvents.AchievementUnlocked,
      this.onAchievementDataChanged
    );
    EventBus.on(
      AchievementEvents.AchievementProgressUpdated,
      this.onAchievementDataChanged
    );
    EventBus.on(
      AchievementEvents.AchievementStageCompleted,
      this.onAchievementDataChanged
    );
    EventBus.on(
      AchievementEvents.AchievementRewardClaimed,
      this.onAchievementDataChanged
    );
  }

  protected onDestroy(): void {
    EventBus.detach(DialogueEvents.NeedUpdateRecord, this.onNeedUpdateRecord);
    EventBus.detach(
      DialogueEvents.NeedPlaySoundEffect,
      this.onNeedPlaySoundEffect
    );
    EventBus.detach(DialogueEvents.NeedLoadScene, this.onNeedLoadScene);
    EventBus.detach(DialogueEvents.NeedLoadBattle, this.onNeedLoadBattle);
    EventBus.detach(DialogueEvents.NeedShowToast, this.onNeedShowToast);
    EventBus.detach(DialogueEvents.GainedItems, this.onGainedItems);

    EventBus.detach(QuestEvents.QuestAccepted, this.onQuestDataChanged);
    EventBus.detach(QuestEvents.QuestProgressUpdated, this.onQuestDataChanged);
    EventBus.detach(QuestEvents.QuestCompleted, this.onQuestDataChanged);
    EventBus.detach(QuestEvents.DailyQuestsReset, this.onQuestDataChanged);
    EventBus.detach(QuestEvents.WeeklyQuestsReset, this.onQuestDataChanged);
    EventBus.detach(QuestEvents.MonthlyQuestsReset, this.onQuestDataChanged);
    EventBus.detach(QuestEvents.ActivityPointsUpdated, this.onQuestDataChanged);
    EventBus.detach(QuestEvents.ActivityRewardClaimed, this.onQuestDataChanged);
    EventBus.detach(QuestEvents.QuestRewardsGranted, this.onQuestDataChanged);

    EventBus.detach(
      AchievementEvents.AchievementUnlocked,
      this.onAchievementDataChanged
    );
    EventBus.detach(
      AchievementEvents.AchievementProgressUpdated,
      this.onAchievementDataChanged
    );
    EventBus.detach(
      AchievementEvents.AchievementStageCompleted,
      this.onAchievementDataChanged
    );
    EventBus.detach(
      AchievementEvents.AchievementRewardClaimed,
      this.onAchievementDataChanged
    );
  }
}

export default DialogueSystemEventHandler;
