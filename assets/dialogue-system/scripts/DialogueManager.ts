import EventBus from "db://assets/hunter/utils/event-bus";
import { StorageManager } from "db://assets/hunter/utils/storage";
import { DialogueEvents, DialogueNodeType, QuestEvents } from "../type";
import { Dialogue } from "./entities/Dialogue";
import { DialogueNode } from "./entities/DialogueNode";
import { QuestManager } from "./QuestManager";
import { AchievementManager } from "./AchievementManager";
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";

/** 对话进度存档 key */
const DIALOGUE_PROGRESS_KEY = "dialogue_progress";

/** 对话进度存档数据 */
export interface IDialogueProgressData {
  dialogueId: number | string;
  nodeId: string;
}

export class DialogueManager {
  private static _instance: DialogueManager;
  private _currentDialog?: Dialogue;
  private _currentNode?: DialogueNode;
  private _dialogCompletedEmitted: boolean = false;
  private _waitingForBattle: boolean = false;
  static get instance(): DialogueManager {
    if (!this._instance) this._instance = new DialogueManager();
    return this._instance;
  }
  constructor() {
    EventBus.on(DialogueEvents.DialogueNextRequested, () => {
      this.next();
    });
    EventBus.on(DialogueEvents.DialogueSkipRequested, () => {
      this.skip();
    });
    EventBus.on(DialogueEvents.DialogueJumpToNodeRequested, (nodeId: number | string) => {
      this.jumpToNodeById(nodeId);
    });
  }
  start(dialogId: number | string): void {
    console.log("[DialogueManager] start() called with dialogId:", dialogId);
    const dialog = ConfigLoader.instance.getConfigByTableNameAndKey(
      "dialogue",
      dialogId
    ) as Dialogue;
    console.log("[DialogueManager] dialog from config:", dialog);
    if (!dialog) {
      console.warn("[DialogueManager] No dialog found for id:", dialogId);
      return;
    }
    this._currentDialog = dialog;
    this._dialogCompletedEmitted = false;
    console.log("[DialogueManager] Emitting DialogueStart event");
    EventBus.emit(DialogueEvents.DialogueStart, dialog);
    console.log("[DialogueManager] Calling gotoNode with entryNode:", dialog.entryNode);
    this.gotoNode(dialog.entryNode);
  }
  startAtNodeWithoutEffects(
    dialogId: number | string,
    nodeId?: number | string
  ): void {
    const dialog = ConfigLoader.instance.getConfigByTableNameAndKey(
      "dialogue",
      dialogId
    ) as Dialogue;
    if (!dialog) return;
    this._currentDialog = dialog;
    this._dialogCompletedEmitted = false;
    EventBus.emit(DialogueEvents.DialogueStart, dialog);
    if (nodeId && nodeId !== 0) {
      this.jumpToNodeByIdWithoutEffects(nodeId);
    } else {
      this._currentNode = dialog.entryNode;
      EventBus.emit(
        DialogueEvents.DialogueNodeEnter,
        this._currentDialog,
        this._currentNode
      );
    }
  }
  choose(choiceKey: string): void {
    if (!this._currentNode || !this._currentDialog) return;
    const node = this._currentNode;
    if (!node.choices || !node.choices.choices.length) return;
    // const c = node.choices.choices.find((x) => x.key === choiceKey);
    // if (!c) return;
    // console.log(`[DialogueManager] choose key=${choiceKey} next=${c.nextNodeId}`);
    // EventBus.emit(Events.DialogueChoiceSelected, this._currentDialog, node, c);
    // this.gotoNode(c.nextNodeId);
  }
  gotoNode(node: DialogueNode): void {
    this._currentNode = node;
    EventBus.emit(
      DialogueEvents.DialogueNodeEnter,
      this._currentDialog,
      this._currentNode
    );
    switch (this._currentNode.type) {
      case DialogueNodeType.SystemBlack:
      case DialogueNodeType.SystemTransparent:
      case DialogueNodeType.Talk:
        return;
      case DialogueNodeType.GrantQuest:
      case DialogueNodeType.GrantAchievement:
      case DialogueNodeType.GrantItems:
      case DialogueNodeType.Record:
      case DialogueNodeType.SoundEffect:
      case DialogueNodeType.ShowToast:
      case DialogueNodeType.CompleteQuest:
        this.executeNodeEffects(this._currentNode);
        this.advanceNext();
        return;
      case DialogueNodeType.LoadScene:
        this.executeNodeEffects(this._currentNode);
        this.emitDialogueCompletedIfNeeded();
        EventBus.emit(DialogueEvents.DialogueEnd, this._currentDialog);
        this._currentDialog = undefined;
        this._currentNode = undefined;
        return;
      case DialogueNodeType.LoadBattle:
        this.executeNodeEffects(this._currentNode);
        return;
      case DialogueNodeType.HideAll:
        this.emitDialogueCompletedIfNeeded();
        EventBus.emit(DialogueEvents.DialogueEnd, this._currentDialog);
        return;
      case DialogueNodeType.End:
        this.emitDialogueCompletedIfNeeded();
        EventBus.emit(DialogueEvents.DialogueEnd, this._currentDialog);
        this._currentDialog = undefined;
        this._currentNode = undefined;
        return;
      default:
        return;
    }
  }
  jumpToNodeByIdWithoutEffects(nodeId: number | string): void {
    if (!this._currentDialog) return;
    const node = ConfigLoader.instance.getConfigByTableNameAndKey(
      "dialogue_node",
      nodeId
    ) as DialogueNode;
    if (!node) {
      return;
    }
    this._currentNode = node;
    // 跳转到指定节点时强制禁止自动前进（除非节点显式设置 autoDuration）
    this._currentNode.nextType = "manual" as any;
    EventBus.emit(
      DialogueEvents.DialogueNodeEnter,
      this._currentDialog,
      this._currentNode
    );
  }
  /**
   * 从 choice 等跳转到指定节点时使用。
   * 会判断目标节点类型：
   * - 后台类型节点（如 completeQuest, grantQuest 等）使用 gotoNode 执行副作用并自动前进
   * - 普通可见节点使用 jumpToNodeByIdWithoutEffects 跳转
   */
  jumpToNodeById(nodeId: number | string): void {
    if (!this._currentDialog) return;
    const node = ConfigLoader.instance.getConfigByTableNameAndKey(
      "dialogue_node",
      nodeId
    ) as DialogueNode;
    if (!node) {
      return;
    }
    // 需要执行副作用的后台类型节点列表
    const effectNodeTypes = [
      DialogueNodeType.LoadBattle,
      DialogueNodeType.LoadScene,
      DialogueNodeType.GrantItems,
      DialogueNodeType.GrantQuest,
      DialogueNodeType.GrantAchievement,
      DialogueNodeType.Record,
      DialogueNodeType.CompleteQuest,
      DialogueNodeType.SoundEffect,
      DialogueNodeType.ShowToast,
      DialogueNodeType.HideAll,
      DialogueNodeType.End,
    ];
    if (effectNodeTypes.includes(node.type)) {
      // 使用 gotoNode 执行节点效果
      this.gotoNode(node);
    } else {
      // 普通可见节点，跳转时禁止自动前进
      this.jumpToNodeByIdWithoutEffects(nodeId);
    }
  }
  private findNodeInCurrentDialogById(id: string): DialogueNode | undefined {
    if (!this._currentDialog) return undefined;
    const visited = new Set<string>();
    let cursor: DialogueNode | undefined = this._currentDialog.entryNode;
    let guard = 0;
    while (cursor && guard++ < 200) {
      if (visited.has(cursor.id)) break;
      visited.add(cursor.id);
      if (cursor.id === id) return cursor;
      cursor = cursor.nextNode;
    }
    return undefined;
  }
  startResumeFromNodeNext(
    dialogId: number | string,
    savedNodeId: string
  ): void {
    const dialog = ConfigLoader.instance.getConfigByTableNameAndKey(
      "dialogue",
      dialogId
    ) as Dialogue;
    if (!dialog) return;
    this._currentDialog = dialog;
    this._dialogCompletedEmitted = false;
    EventBus.emit(DialogueEvents.DialogueStart, dialog);
    const node = this.findNodeInCurrentDialogById(savedNodeId);
    let targetId = node?.nextNode?.id;
    if (!targetId) {
      const saved = ConfigLoader.instance.getConfigByTableNameAndKey(
        "dialogue_node",
        savedNodeId
      ) as DialogueNode;
      targetId = saved?.nextNode?.id || savedNodeId;
    }
    // 获取目标节点，判断是否需要执行副作用
    const targetNode = ConfigLoader.instance.getConfigByTableNameAndKey(
      "dialogue_node",
      targetId
    ) as DialogueNode;
    if (!targetNode) {
      return;
    }
    // 对于需要执行副作用的后台类型节点，使用 gotoNode 正确执行
    // 对于普通可见节点（Talk, SystemBlack, SystemTransparent），使用 jumpToNodeByIdWithoutEffects
    const effectNodeTypes = [
      DialogueNodeType.LoadBattle,
      DialogueNodeType.LoadScene,
      DialogueNodeType.GrantItems,
      DialogueNodeType.GrantQuest,
      DialogueNodeType.GrantAchievement,
      DialogueNodeType.Record,
      DialogueNodeType.CompleteQuest,
      DialogueNodeType.SoundEffect,
      DialogueNodeType.ShowToast,
      DialogueNodeType.HideAll,
      DialogueNodeType.End,
    ];
    if (effectNodeTypes.includes(targetNode.type)) {
      // 使用 gotoNode 执行节点效果
      this.gotoNode(targetNode);
    } else {
      // 普通可见节点，跳转时禁止自动前进
      this.jumpToNodeByIdWithoutEffects(targetId);
    }
  }
  next(): void {
    this.advanceNext();
  }
  skip(): void {
    if (!this._currentDialog || !this._currentNode) return;
    if ((this._currentNode.choices?.choices || []).length) return;
    let cursor: DialogueNode | undefined = this._currentNode.nextNode;
    let guard = 0;
    while (cursor && guard++ < 100) {
      switch (cursor.type) {
        case DialogueNodeType.GrantQuest:
        case DialogueNodeType.GrantAchievement:
        case DialogueNodeType.Record:
        case DialogueNodeType.SoundEffect:
        case DialogueNodeType.ShowToast:
        case DialogueNodeType.CompleteQuest: {
          this.executeNodeEffects(cursor);
          cursor = cursor.nextNode;
          continue;
        }
        case DialogueNodeType.GrantItems: {
          this._currentNode = cursor;
          EventBus.emit(DialogueEvents.DialogueNodeEnter, this._currentDialog, cursor);
          this.executeNodeEffects(cursor);
          return;
        }
        case DialogueNodeType.SystemBlack:
        case DialogueNodeType.SystemTransparent:
        case DialogueNodeType.Talk: {
          if ((cursor.choices?.choices || []).length) {
            this._currentNode = cursor;
            EventBus.emit(
              DialogueEvents.DialogueNodeEnter,
              this._currentDialog,
              cursor
            );
            return;
          }
          cursor = cursor.nextNode;
          continue;
        }
        case DialogueNodeType.LoadBattle:
        case DialogueNodeType.LoadScene:
        case DialogueNodeType.HideAll:
        case DialogueNodeType.End: {
          this.gotoNode(cursor);
          return;
        }
        default: {
          cursor = cursor.nextNode;
          continue;
        }
      }
    }
    this.emitDialogueCompletedIfNeeded();
    EventBus.emit(DialogueEvents.DialogueEnd, this._currentDialog);
    this._currentDialog = undefined;
    this._currentNode = undefined;
  }
  private advanceNext(): void {
    const next = this._currentNode?.nextNode;

    if (!next) {
      this.emitDialogueCompletedIfNeeded();
      EventBus.emit(DialogueEvents.DialogueEnd, this._currentDialog);
      this._currentDialog = undefined;
      this._currentNode = undefined;
      return;
    }
    // simulate entering next preloaded node
    this.gotoNode(next);
  }
  private emitDialogueCompletedIfNeeded(): void {
    if (this._dialogCompletedEmitted) return;
    if (!this._currentDialog) return;
    this._dialogCompletedEmitted = true;
    EventBus.emit(QuestEvents.DialogueCompleted, this._currentDialog.id);
  }
  private executeNodeEffects(node: DialogueNode): void {
    console.log(`[DialogueManager] executeNodeEffects: ${node.id}, type: ${node.type}, achievements:`, node.achievements);
    // 通用处理：所有节点类型都检查 quests 和 achievements 字段
    // 注意：CompleteQuest 节点的 quests 字段表示要完成的任务，不是要接受的任务
    if (node.type !== DialogueNodeType.CompleteQuest && Array.isArray(node.quests) && node.quests.length > 0) {
      node.quests.forEach((q) => {
        // q 可能是 Quest 对象（引用解析成功），也可能是字符串 ID（引用解析失败）
        let questId: string | undefined;
        if (typeof q === 'string') {
          questId = q;
        } else if (q?.id) {
          questId = String(q.id);
        }
        if (questId) {
          const accepted = QuestManager.instance.accept(questId);
          console.log(`[DialogueManager] Grant quest: ${questId}, accepted:`, !!accepted);
        }
      });
    }

    if (Array.isArray(node.achievements) && node.achievements.length > 0) {
      console.log(`[DialogueManager] Node ${node.id} has achievements:`, node.achievements);
      node.achievements.forEach((a) => {
        // a 可能是 Achievement 实例（引用解析成功），也可能是 null（引用解析失败）
        // 还可能是原始字符串 ID（如果引用解析没有生效）
        let achievementId: string | undefined;

        if (a === null || a === undefined) {
          console.warn(`[DialogueManager] Achievement reference is null/undefined`);
          return;
        }

        if (typeof a === 'string') {
          // 原始字符串 ID
          achievementId = a;
        } else if (a?.id) {
          // Achievement 实例
          achievementId = String(a.id);
        }

        if (!achievementId) {
          console.warn(`[DialogueManager] Cannot get achievement ID from:`, a);
          return;
        }

        const inst = AchievementManager.instance.getAchievement(achievementId);
        console.log(`[DialogueManager] Trying to grant achievement: ${achievementId}, found:`, !!inst, 'isUnlocked:', inst?.isUnlocked);

        if (inst && !inst.isUnlocked) {
          const ok = AchievementManager.instance.forceUnlock(achievementId);
          console.log(`[DialogueManager] Grant achievement: ${achievementId}, unlocked:`, ok);
        }
      });
    }

    // 按节点类型处理特定效果
    switch (node.type) {
      case DialogueNodeType.GrantQuest:
      case DialogueNodeType.GrantAchievement:
        // 已在上面通用处理中完成
        return;
      case DialogueNodeType.GrantItems: {
        if (Array.isArray(node.items)) {
          const grouped: any[] = [];
          const map: Record<string, { item: any; count: number }> = {};
          for (const it of node.items) {
            if (!it) continue;
            if (it.item && it.count != null) {
              const id = String(it.item.id);
              const c = Math.max(1, Number(it.count) || 1);
              const ex = map[id];
              if (ex) ex.count += c;
              else map[id] = { item: it.item, count: c };
              continue;
            }
            const id = String(it.id);
            const ex = map[id];
            if (ex) ex.count += 1;
            else map[id] = { item: it, count: 1 };
          }
          for (const k in map) grouped.push(map[k]);
          EventBus.emit(DialogueEvents.GainedItems, grouped);
        }
        return;
      }
      case DialogueNodeType.Record: {
        // 直接保存当前对话进度
        if (this._currentDialog) {
          const progress: IDialogueProgressData = {
            dialogueId: this._currentDialog.id,
            nodeId: node.id,
          };
          StorageManager.setItem(DIALOGUE_PROGRESS_KEY, progress);
          console.log("[DialogueManager] Progress saved:", progress);
        }
        return;
      }
      case DialogueNodeType.SoundEffect: {
        const key = node.content?.text || "";
        EventBus.emit(DialogueEvents.NeedPlaySoundEffect, key);
        return;
      }
      case DialogueNodeType.ShowToast: {
        const msg = node.content?.text || "";
        EventBus.emit(DialogueEvents.NeedShowToast, msg);
        return;
      }
      case DialogueNodeType.LoadScene: {
        const scene = node.content?.text || "";
        EventBus.emit(DialogueEvents.NeedLoadScene, scene);
        return;
      }
      case DialogueNodeType.LoadBattle: {
        this._waitingForBattle = true;
        // 不发射 DialogEnd，改为发射 DialogPaused，防止其他监听器误认为对话结束而重复触发
        EventBus.emit(DialogueEvents.DialoguePaused, this._currentDialog as any);
        EventBus.emit(DialogueEvents.NeedLoadBattle, { enemy: node.enemy });
        EventBus.once(DialogueEvents.BattleVictory, () => {
          this._waitingForBattle = false;
          this.advanceNext();
        });
        return;
      }
      case DialogueNodeType.CompleteQuest: {
        // 强制完成指定的任务（跳过目标检查）
        if (Array.isArray(node.quests) && node.quests.length > 0) {
          node.quests.forEach((q) => {
            // q 可能是 Quest 对象（引用解析成功），也可能是字符串 ID（引用解析失败）
            let questId: string | undefined;
            if (typeof q === 'string') {
              questId = q;
            } else if (q?.id) {
              questId = String(q.id);
            }
            if (questId) {
              const success = QuestManager.instance.complete(questId, true);
              console.log(`[DialogueManager] Complete quest: ${questId}, success:`, success);
            }
          });
        }
        return;
      }
      default:
        return;
    }
  }
  get currentDialog(): Dialogue | undefined {
    return this._currentDialog;
  }
  get currentNode(): DialogueNode | undefined {
    return this._currentNode;
  }
  get isWaitingForBattle(): boolean {
    return this._waitingForBattle;
  }

  /**
   * 获取保存的对话进度
   */
  getSavedProgress(): IDialogueProgressData | null {
    return StorageManager.getItem<IDialogueProgressData>(DIALOGUE_PROGRESS_KEY, null);
  }

  /**
   * 清除保存的对话进度
   */
  clearSavedProgress(): void {
    StorageManager.removeItem(DIALOGUE_PROGRESS_KEY);
    console.log("[DialogueManager] Progress cleared");
  }

  /**
   * 检查是否有保存的进度
   */
  hasSavedProgress(): boolean {
    return this.getSavedProgress() !== null;
  }
}

