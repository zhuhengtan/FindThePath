import { _decorator, Component, Node } from "cc";
import { showToast } from "db://assets/hunter-ui/Toast/ToastManager";
const { ccclass, property } = _decorator;

@ccclass("Demo")
export class Demo extends Component {
  start() {}

  update(deltaTime: number) {}

  public onClickToastBtn() {
    showToast('这是一条 Toast 消息');
  }
}
