import {
  _decorator,
  Node,
  Sprite,
  Color,
  UITransform,
  Widget,
  UIOpacity,
  BlockInputEvents,
  tween,
  Vec3,
  view,
  SpriteFrame,
  Texture2D,
  ImageAsset,
} from "cc";
import { getPersistUICanvas } from "../ui-utils";

const { ccclass } = _decorator;

export interface PopupShowOptions {
  /** 点击遮罩是否关闭，默认 true */
  maskClosable?: boolean;
  /** 关闭时是否销毁节点，默认 true */
  destroyOnClose?: boolean;
  /** 遮罩透明度 0-255，默认 180 */
  maskOpacity?: number;
  /** 遮罩点击回调（maskClosable 为 true 时触发） */
  onMaskClick?: () => void;
  /** 关闭后回调 */
  onClose?: () => void;
}

interface PopupEntry {
  node: Node;
  maskNode: Node | null;
  options: PopupShowOptions;
}

/**
 * Popup 管理器（纯逻辑单例）
 * 
 * 使用方式：
 * ```typescript
 * import { PopupManager } from 'db://assets/hunter-ui/Popup/PopupManager';
 * 
 * // 无动画遮罩
 * PopupManager.show(node);
 * 
 * // 有动画遮罩
 * PopupManager.show(node, true);
 * 
 * // 自定义配置
 * PopupManager.show(node, true, { maskClosable: false });
 * ```
 */
@ccclass("PopupManager")
export class PopupManager {
  private static _popupStack: PopupEntry[] = [];
  private static _whiteSpriteFrame: SpriteFrame | null = null;

  /**
   * 显示弹窗
   * @param node 弹窗节点
   * @param withAnimation 是否有遮罩和动画，默认 false
   * @param options 可选配置
   */
  public static show(
    node: Node,
    withAnimation: boolean = false,
    options: PopupShowOptions = {}
  ): void {
    const canvas = getPersistUICanvas();
    const defaultOptions: PopupShowOptions = {
      maskClosable: true,
      destroyOnClose: true,
      maskOpacity: 180,
      ...options,
    };

    let maskNode: Node | null = null;

    if (withAnimation) {
      // 创建遮罩
      maskNode = this.createMask(defaultOptions);
      canvas.node.addChild(maskNode);

      // 添加弹窗节点
      canvas.node.addChild(node);

      // 播放显示动画
      this.playShowAnimation(node, maskNode, defaultOptions.maskOpacity!);
    } else {
      // 无动画直接添加
      canvas.node.addChild(node);
    }

    // 记录弹窗
    this._popupStack.push({
      node,
      maskNode,
      options: defaultOptions,
    });
  }

  /**
   * 关闭弹窗
   */
  public static close(node: Node): void {
    const index = this._popupStack.findIndex((e) => e.node === node);
    if (index === -1) return;

    const entry = this._popupStack[index];
    this._popupStack.splice(index, 1);

    if (entry.maskNode) {
      // 播放关闭动画
      this.playCloseAnimation(entry.node, entry.maskNode, entry.options);
    } else {
      // 无动画直接处理
      this.handleClose(entry);
    }
  }

  /**
   * 关闭所有弹窗
   */
  public static closeAll(): void {
    const entries = [...this._popupStack];
    this._popupStack = [];
    entries.forEach((entry) => {
      if (entry.maskNode) {
        this.playCloseAnimation(entry.node, entry.maskNode, entry.options);
      } else {
        this.handleClose(entry);
      }
    });
  }

  private static createMask(options: PopupShowOptions): Node {
    const maskNode = new Node("PopupMask");

    // Sprite 组件
    const sprite = maskNode.addComponent(Sprite);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = new Color(0, 0, 0, 255);
    sprite.spriteFrame = this.getWhiteSpriteFrame();

    // 全屏适配
    const uiTransform = maskNode.addComponent(UITransform);
    const visibleSize = view.getVisibleSize();
    uiTransform.setContentSize(visibleSize.width * 2, visibleSize.height * 2);

    // Widget 全屏
    const widget = maskNode.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.top = 0;
    widget.bottom = 0;
    widget.left = 0;
    widget.right = 0;

    // 阻止穿透点击
    maskNode.addComponent(BlockInputEvents);

    // 点击遮罩关闭
    if (options.maskClosable) {
      maskNode.on(Node.EventType.TOUCH_END, () => {
        options.onMaskClick?.();
        // 找到对应的弹窗并关闭
        const entry = this._popupStack.find((e) => e.maskNode === maskNode);
        if (entry) {
          this.close(entry.node);
        }
      });
    }

    return maskNode;
  }

  private static getWhiteSpriteFrame(): SpriteFrame {
    if (this._whiteSpriteFrame) {
      return this._whiteSpriteFrame;
    }

    // 创建 1x1 白色图片
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1, 1);

    const imageAsset = new ImageAsset(canvas);
    const texture = new Texture2D();
    texture.image = imageAsset;

    this._whiteSpriteFrame = new SpriteFrame();
    this._whiteSpriteFrame.texture = texture;

    return this._whiteSpriteFrame;
  }

  private static playShowAnimation(
    node: Node,
    maskNode: Node,
    maskOpacity: number
  ): void {
    // 遮罩淡入
    const maskUIOpacity =
      maskNode.getComponent(UIOpacity) || maskNode.addComponent(UIOpacity);
    maskUIOpacity.opacity = 0;
    tween(maskUIOpacity).to(0.2, { opacity: maskOpacity }).start();

    // 内容缩放弹出
    node.scale = new Vec3(0.8, 0.8, 1);
    const nodeOpacity =
      node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
    nodeOpacity.opacity = 0;

    tween(node)
      .to(0.15, { scale: new Vec3(1.05, 1.05, 1) })
      .to(0.1, { scale: new Vec3(1, 1, 1) })
      .start();
    tween(nodeOpacity).to(0.2, { opacity: 255 }).start();
  }

  private static playCloseAnimation(
    node: Node,
    maskNode: Node,
    options: PopupShowOptions
  ): void {
    // 遮罩淡出
    const maskUIOpacity = maskNode.getComponent(UIOpacity);
    if (maskUIOpacity) {
      tween(maskUIOpacity).to(0.2, { opacity: 0 }).start();
    }

    // 内容缩小淡出
    const nodeOpacity = node.getComponent(UIOpacity);
    if (nodeOpacity) {
      tween(nodeOpacity).to(0.2, { opacity: 0 }).start();
    }

    tween(node)
      .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
      .call(() => {
        this.handleClose({ node, maskNode, options });
      })
      .start();
  }

  private static handleClose(entry: PopupEntry): void {
    // 销毁遮罩
    if (entry.maskNode && entry.maskNode.isValid) {
      entry.maskNode.destroy();
    }

    // 处理弹窗节点
    if (entry.options.destroyOnClose) {
      if (entry.node && entry.node.isValid) {
        entry.node.destroy();
      }
    } else {
      // 不销毁，只移除父节点
      if (entry.node && entry.node.isValid) {
        entry.node.removeFromParent();
      }
    }

    // 回调
    entry.options.onClose?.();
  }
}

// ========== 便捷导出方法 ==========

export function showPopup(
  node: Node,
  withAnimation: boolean = false,
  options: PopupShowOptions = {}
): void {
  PopupManager.show(node, withAnimation, options);
}

export function closePopup(node: Node): void {
  PopupManager.close(node);
}

export function closeAllPopups(): void {
  PopupManager.closeAll();
}
