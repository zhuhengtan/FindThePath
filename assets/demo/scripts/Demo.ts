import { _decorator, Component, Node } from "cc";
import { showToast } from "db://assets/hunter-ui/Toast/ToastManager";
import { showConfirm } from "db://assets/hunter-ui/Modal/ModalConfirmManager";
import { dialogueManager } from "db://assets/dialogue-system/scripts";
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";
const { ccclass, property } = _decorator;

@ccclass("Demo")
export class Demo extends Component {
  start() { }

  update(deltaTime: number) { }

  public onClickToastBtn() {
    showToast('这是一条 Toast 消息');
  }

  public onClickModalConfirm() {
    showConfirm({
      content: '这是一条确认弹窗消息',
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: () => {
        console.log('用户点击了确定');
        showToast('用户点击了确定');
      },
      onCancel: () => {
        console.log('用户点击了取消');
        showToast('用户点击了取消');
      },
    });
  }

  public onClickDialogueBtn() {
    // 检查配置加载状态
    const allDialogues = ConfigLoader.instance.getConfigsByTableName("dialogue");
    console.log("[Demo] All dialogues from ConfigLoader:", allDialogues);
    console.log("[Demo] ConfigLoader instance:", ConfigLoader.instance);

    // 播放测试剧情（ID 为 1，可根据实际配置修改）
    dialogueManager.start(1);
  }
}
