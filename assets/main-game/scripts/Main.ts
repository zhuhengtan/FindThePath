import { _decorator, Component, director } from "cc";
import { ConfigLoader } from "db://assets/hunter/utils/config-loader";

const { ccclass } = _decorator;

@ccclass("Main")
export class Main extends Component {
  start() {
    this.initGame();
  }

  private async initGame() {
    console.log("[Main] Initializing game...");

    // 1. 加载配置（等待完成）
    await new Promise<void>((resolve) => {
      ConfigLoader.instance.loadAllConfigs({}, () => {
        console.log("[Main] Configs loaded");
        resolve();
      }, {
        bundleName: "main-game",
        configPathPrefix: "configs",
        allConfigPath: "configs/all_config",
      });
    });

    console.log("[Main] Game initialized");
  }

  update(deltaTime: number) { }

  public onClickDemoBtn() {
    director.loadScene("demo");
  }
}
