export enum DialogueEvents {
  /** 播放音效 */
  NeedPlaySoundEffect = "ds-need-play-sound-effect",
  /** 更新记录 */
  NeedUpdateRecord = "ds-need-update-record",
  /** 加载场景 */
  NeedLoadScene = "ds-need-load-scene",
  /** 进入战斗 */
  NeedLoadBattle = "ds-need-load-battle",
  /** 显示Toast */
  NeedShowToast = "ds-need-show-toast",

  DialogueStart = "ds-dialogue-start",
  DialogueEnd = "ds-dialogue-end",
  /** 对话暂停（等待战斗结果） */
  DialoguePaused = "ds-dialogue-paused",
  DialogueNodeEnter = "ds-dialogue-node-enter",
  DialogueNodeExit = "ds-dialogue-node-exit",
  DialogueChoiceRequired = "ds-dialogue-choice-required",
  DialogueChoiceSelected = "ds-dialogue-choice-selected",
  ActorSpoken = "ds-actor-spoken",
  DialogueScreenChange = "ds-dialogue-screen-change",
  DialogueGoScene = "ds-dialogue-go-scene",
  BattleVictory = "ds-battle-victory",
  GainedItems = "ds-gained-items",
  DialogueNextRequested = "ds-dialogue-next-requested",
  DialogueSkipRequested = "ds-dialogue-skip-requested",
  DialogueJumpToNodeRequested = "ds-dialogue-jump-to-node-requested",
}

/** 任务系统事件 */
export enum QuestEvents {
  // 任务生命周期事件
  /** 任务解锁 */
  QuestUnlocked = "ds-quest-unlocked",
  /** 任务接受 */
  QuestAccepted = "ds-quest-accepted",
  /** 任务进度更新 */
  QuestProgressUpdated = "ds-quest-progress-updated",
  /** 任务可提交 */
  QuestSubmittable = "ds-quest-submittable",
  /** 任务完成 */
  QuestCompleted = "ds-quest-completed",
  /** 任务失败 */
  QuestFailed = "ds-quest-failed",
  /** 任务重置 */
  QuestReset = "ds-quest-reset",

  // 奖励事件
  /** 奖励发放 */
  RewardGranted = "ds-reward-granted",
  /** 任务奖励发放 */
  QuestRewardsGranted = "ds-quest-rewards-granted",
  /** 战令经验获得 */
  BattlePassExpGained = "ds-battle-pass-exp-gained",

  // 周期性任务重置事件
  /** 每日任务重置 */
  DailyQuestsReset = "ds-daily-quests-reset",
  /** 每周任务重置 */
  WeeklyQuestsReset = "ds-weekly-quests-reset",
  /** 每月任务重置 */
  MonthlyQuestsReset = "ds-monthly-quests-reset",

  // 贡献值事件
  /** 贡献值更新 */
  ActivityPointsUpdated = "ds-activity-points-updated",
  /** 贡献值阶段奖励可领取 */
  ActivityRewardAvailable = "ds-activity-reward-available",
  /** 贡献值阶段奖励已领取 */
  ActivityRewardClaimed = "ds-activity-reward-claimed",
  /** 贡献值重置 */
  ActivityReset = "ds-activity-reset",

  // 触发事件（用于更新任务进度）
  /** 怪物击杀 */
  MonsterKilled = "ds-monster-killed",
  /** 物品收集 */
  ItemCollected = "ds-item-collected",
  /** 副本完成 */
  InstanceCompleted = "ds-instance-completed",
  /** 等级提升 */
  LevelUp = "ds-level-up",
  /** 玩家升级 */
  PlayerLevelUp = "ds-player-level-up",
  /** 技能学习 */
  SkillLearned = "ds-skill-learned",
  /** 技能使用 */
  SkillUsed = "ds-skill-used",
  /** 对话完成 */
  DialogueCompleted = "ds-dialogue-completed",
  /** 战斗结果 */
  BattleResult = "ds-battle-result",
  /** 战斗胜利 */
  BattleWon = "ds-battle-won",
  /** 关卡完成 */
  LevelCompleted = "ds-level-completed",
  /** 装备穿戴 */
  EquipmentEquipped = "ds-equipment-equipped",
  /** 货币消耗 */
  CurrencySpent = "ds-currency-spent",
  /** 玩家登录 */
  PlayerLogin = "ds-player-login",
  /** PVP切磋完成 */
  PvpBattleCompleted = "ds-pvp-battle-completed",
  /** 分享游戏 */
  GameShared = "ds-game-shared",
  /** 副本探索完成 */
  InstanceExplored = "ds-instance-explored",
  /** 技能升级（参数：skillId, newLevel） */
  SkillUpgraded = "ds-skill-upgraded",
  /** 技能达到3级（参数：skillId） */
  SkillReachLevel3 = "ds-skill-reach-level-3",
  /** 技能达到5级（参数：skillId） */
  SkillReachLevel5 = "ds-skill-reach-level-5",
  /** 爬塔层数达标（参数：floorNumber） */
  TowerFloorReached = "ds-tower-floor-reached",
  /** 爬塔完成（每次爬塔战斗成功后触发） */
  TowerClimbed = "ds-tower-climbed",
  /** 教程完成（参数：targetId） */
  TutorialCompleted = "ds-tutorial-completed",
}

/** 任务类型 */
export enum QuestType {
  /** 主线任务 - 推动游戏主要剧情 */
  Main = "main",
  /** 支线任务 - 可选的额外任务 */
  Side = "side",
  /** 每日任务 - 每日0点重置 */
  Daily = "daily",
  /** 每周任务 - 每周一0点重置 */
  Weekly = "weekly",
  /** 每月任务 - 每月1号0点重置 */
  Monthly = "monthly",
  /** 隐藏任务 - 需要特定条件触发 */
  Hidden = "hidden",
  /** 战令任务 - 用于战令系统积分 */
  BattlePass = "battlePass",
}

/** 任务状态 */
export enum QuestState {
  /** 未解锁 - 不满足前置条件 */
  Locked = "locked",
  /** 未接受 - 可以接受但未接受 */
  NotAccepted = "notAccepted",
  /** 已接受 - 正在进行中 */
  Accepted = "accepted",
  /** 可提交 - 目标已完成，等待提交 */
  Submittable = "submittable",
  /** 已完成 - 已提交并领取奖励 */
  Completed = "completed",
  /** 已失败 - 任务失败（如限时任务超时） */
  Failed = "failed",
  /** 已过期 - 周期性任务过期 */
  Expired = "expired",
}

/** 任务目标类型 */
export enum QuestObjectiveType {
  /** 击杀怪物 */
  KillMonster = "killMonster",
  /** 击杀特定怪物 */
  KillSpecificMonster = "killSpecificMonster",
  /** 收集物品 */
  CollectItem = "collectItem",
  /** 完成副本 */
  CompleteInstance = "completeInstance",
  /** 完成特定副本 */
  CompleteSpecificInstance = "completeSpecificInstance",
  /** 完成关卡 */
  CompleteLevel = "completeLevel",
  /** 达到等级 */
  ReachLevel = "reachLevel",
  /** 学习技能 */
  LearnSkill = "learnSkill",
  /** 学习特定技能 */
  LearnSpecificSkill = "learnSpecificSkill",
  /** 使用技能 */
  UseSkill = "useSkill",
  /** 完成对话 */
  CompleteDialogueue = "completeDialogue",
  /** 完成特定对话 */
  CompleteSpecificDialogueue = "completeSpecificDialogue",
  /** 与NPC对话 */
  TalkToNpc = "talkToNpc",
  /** 使用物品 */
  UseItem = "useItem",
  /** 装备物品 */
  EquipItem = "equipItem",
  /** 消耗货币 */
  SpendCurrency = "spendCurrency",
  /** 获得货币 */
  EarnCurrency = "earnCurrency",
  /** 完成任务 */
  CompleteQuest = "completeQuest",
  /** 完成特定任务 */
  CompleteSpecificQuest = "completeSpecificQuest",
  /** 登录游戏 */
  Login = "login",
  /** 连续登录 */
  ConsecutiveLogin = "consecutiveLogin",
  /** 战斗胜利 */
  WinBattle = "winBattle",
  /** 战斗失败 */
  LoseBattle = "loseBattle",
  /** 触发事件 */
  TriggerEvent = "triggerEvent",
  /** PVP切磋 */
  PvpBattle = "pvpBattle",
  /** 分享游戏 */
  ShareGame = "shareGame",
  /** 探索副本 */
  ExploreInstance = "exploreInstance",
  /** 技能升级（每次升级触发，参数为技能ID） */
  UpgradeSkill = "upgradeSkill",
  /** 技能达到3级（参数为技能ID） */
  SkillReachLevel3 = "skillReachLevel3",
  /** 技能达到5级（参数为技能ID） */
  SkillReachLevel5 = "skillReachLevel5",
  /** 爬塔达到指定层数 */
  ReachTowerFloor = "reachTowerFloor",
  /** 完成爬塔（每次爬塔战斗成功计数） */
  ClimbTower = "climbTower",
  /** 完成教程 */
  CompleteTutorial = "completeTutorial",
}

/** 奖励类型 */
export enum QuestRewardType {
  /** 物品奖励 */
  Item = "item",
  /** 经验奖励 */
  Exp = "exp",
  /** 战令积分 */
  BattlePassExp = "battlePassExp",
  /** 成就解锁 */
  Achievement = "achievement",
  /** 技能解锁 */
  Skill = "skill",
  /** 副本解锁 */
  Instance = "instance",
  /** 任务解锁 */
  Quest = "quest",
}

// ==================== 成就系统类型定义 ====================

/** 成就系统事件 */
export enum AchievementEvents {
  // 成就生命周期事件
  /** 成就进度更新 */
  AchievementProgressUpdated = "ds-achievement-progress-updated",
  /** 成就解锁 */
  AchievementUnlocked = "ds-achievement-unlocked",
  /** 成就阶段完成 */
  AchievementStageCompleted = "ds-achievement-stage-completed",
  /** 成就奖励领取 */
  AchievementRewardClaimed = "ds-achievement-reward-claimed",

  // 称号事件
  /** 称号解锁 */
  TitleUnlocked = "ds-title-unlocked",
  /** 称号装备 */
  TitleEquipped = "ds-title-equipped",
  /** 称号卸下 */
  TitleUnequipped = "ds-title-unequipped",

  // 成就点数事件
  /** 成就点数更新 */
  AchievementPointsUpdated = "ds-achievement-points-updated",
}

/** 成就类型 */
export enum AchievementType {
  /** 一次性成就 - 完成一次即解锁 */
  OneTime = "oneTime",
  /** 累积型成就 - 累积达到目标值解锁 */
  Cumulative = "cumulative",
  /** 阶段型成就 - 多个阶段，每个阶段有独立奖励 */
  Staged = "staged",
  /** 隐藏成就 - 未解锁前不显示详情 */
  Hidden = "hidden",
}

/** 成就分类（按游戏系统） */
export enum AchievementCategory {
  /** 战斗相关 */
  Combat = "combat",
  /** 收集相关 */
  Collection = "collection",
  /** 剧情相关 */
  Story = "story",
  /** 探索相关 */
  Exploration = "exploration",
  /** 社交相关 */
  Social = "social",
  /** 成长相关 */
  Growth = "growth",
  /** 特殊/隐藏 */
  Special = "special",
}

/** 成就稀有度 */
export enum AchievementRarity {
  /** 普通 */
  Common = "common",
  /** 稀有 */
  Rare = "rare",
  /** 史诗 */
  Epic = "epic",
  /** 传说 */
  Legendary = "legendary",
}

/** 成就状态 */
export enum AchievementState {
  /** 锁定 - 未满足前置条件 */
  Locked = "locked",
  /** 进行中 - 正在追踪进度 */
  InProgress = "inProgress",
  /** 已解锁 - 条件达成，可领取奖励 */
  Unlocked = "unlocked",
  /** 已领取 - 奖励已领取 */
  Claimed = "claimed",
}

/** 成就奖励类型（扩展 QuestRewardType） */
export enum AchievementRewardType {
  /** 物品奖励 */
  Item = "item",
  /** 经验奖励 */
  Exp = "exp",
  /** 战令积分 */
  BattlePassExp = "battlePassExp",
  /** 称号奖励 */
  Title = "title",
  /** 头像框 */
  AvatarFrame = "avatarFrame",
  /** 成就点数 */
  AchievementPoints = "achievementPoints",
}

export enum AnimationType {
  /**
   * 淡入淡出动画
   */
  FadeInOut = "fadeInOut",
  /**
   * 打字机动画(文字表现是一个字一个字的出现，图片表现是使用filled属性展开)
   */
  TypeWriter = "typeWriter",
}

export enum ButtonClickType {
  /**
   * 默认
   */
  Default = "default",
  /**
   * 点击后显示图片
   */
  Image = "image",
  /**
   * 点击后显示Toast
   */
  Toast = "toast",
  /**
   * 点击后跳转下一个节点
   */
  Node = "node",
  /**
   * 点击后跳转场景
   */
  Scene = "scene",
}

export enum DialogueNodeType {
  /**
   * 系统纯黑背景
   */
  SystemBlack = "systemBlack",
  /**
   * 系统半透明背景
   */
  SystemTransparent = "systemTransparent",
  /**
   * 普通对话
   */
  Talk = "talk",
  /**
   * 隐藏全部对话UI
   */
  HideAll = "hideAll",
  /**
   * 授予任务
   */
  GrantQuest = "grantQuest",
  /**
   * 授予成就
   */
  GrantAchievement = "grantAchievement",
  /**
   * 授予物品
   */
  GrantItems = "grantItems",
  /**
   * 播放音效
   */
  SoundEffect = "soundEffect",
  /**
   * 修改记录
   */
  Record = "record",
  /**
   * 加载场景
   */
  LoadScene = "loadScene",
  /**
   * 显示Toast
   */
  ShowToast = "showToast",
  /**
   * 进入战斗
   */
  LoadBattle = "loadBattle",
  /**
   * 完成任务 - 触发指定任务的完成
   * 使用 quests 字段指定要完成的任务ID列表
   */
  CompleteQuest = "completeQuest",
  /**
   * 结束对话
   */
  End = "end",
}

export interface DialogueChoice {
  /**
   * 选择的键值
   */
  image?: [string, number, number];
  /**
   * 选择的文字内容
   */
  text?: string;
  /**
   * 点击之后的操作
   */
  type: ButtonClickType;
  /**
   * 点击后显示图片的路径、宽、高
   */
  data?: {
    /**
     * 点击后显示图片的路径、宽、高
     */
    image?: [string, number, number]
    /**
     * 点击后显示Toast的内容
     */
    toast?: string
    /**
     * 点击后跳转下一个节点的ID
     */
    node?: number
    /**
     * 点击后跳转场景的ID
     */
    scene?: string
  };
};

export interface DialogueNodeContent {
  /**
   * 图片路径、宽、高
   */
  image?: [string, number, number]
  /**
   * 图片动画类型
   */
  imageAnimation?: AnimationType
  /**
   * 文字内容
   */
  text?: string
  /**
   * 文字动画类型
   */
  textAnimation?: AnimationType
}

export enum DialogueNodeNextType {
  /**
   * 顺序执行下一个节点
   */
  Auto = "auto",
  /**
   * 随机执行下一个节点
   */
  Manual = "manual",
}
