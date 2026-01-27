import { _decorator, Component, Label, Node, UITransform, Size, Sprite, math, CCFloat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Toast')
export class Toast extends Component {
    @property(Label)
    contentLabel: Label | null = null;

    @property(Sprite)
    backgroundSprite: Sprite | null = null;

    @property({ type: [CCFloat], tooltip: "四边的padding，上右下左" })
    paddingRect: number[] = [10, 10, 10, 10];

    private minWidth: number = 100; // 背景的最小宽度
    private minHeight: number = 40; // 背景的最小高度

    protected onEnable(): void {
        
    }

    /**
     * 设置 Toast 的内容，并动态调整背景大小
     * @param message 显示的文字
     */
    public setMessage(message: string) {
        if (!this.contentLabel || !this.backgroundSprite) {
            return;
        }

        // 设置 Label 的文字内容
        this.contentLabel.string = message;

        // 强制刷新 Label 的渲染数据
        this.contentLabel.updateRenderData(true);

        // 延迟一帧动态调整背景大小
        this.scheduleOnce(() => {
            const labelTransform = this.contentLabel.getComponent(UITransform);
            const bgTransform = this.backgroundSprite.getComponent(UITransform);

            if (!labelTransform || !bgTransform) {
                return;
            }

            // 获取 Label 的宽高
            const labelWidth = labelTransform.contentSize.width;
            const labelHeight = labelTransform.contentSize.height;

            // 计算背景宽高（考虑 padding 和最小值）
            const bgWidth = Math.max(labelWidth + this.paddingRect[1] + this.paddingRect[3], this.minWidth);
            const bgHeight = Math.max(labelHeight + this.paddingRect[0] + this.paddingRect[2], this.minHeight);
            // 设置背景大小
            bgTransform.setContentSize(new Size(bgWidth, bgHeight));
        }, 0); // 延迟一帧，确保 Label 的宽高已更新
    }
}
