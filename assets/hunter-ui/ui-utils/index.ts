import { Canvas, Node, director, UITransform, Widget, view } from "cc";
import { COMMON_PERSIST_UI_CANVAS_NAME } from "../../hunter/common";

let _persistUICanvas: Canvas | null = null;

/**
 * 获取全局持久化 UI Canvas
 * 用于动态插入的 UI prefab，配合 SortingLayer 使用
 * 如果不存在会自动创建
 */
export const getPersistUICanvas = (): Canvas => {
  if (_persistUICanvas && _persistUICanvas.isValid) {
    return _persistUICanvas;
  }

  // 先尝试从现有的 persist root nodes 中查找
  const existingNode = director.getScene()?.getChildByName(COMMON_PERSIST_UI_CANVAS_NAME);
  if (existingNode) {
    _persistUICanvas = existingNode.getComponent(Canvas);
    if (_persistUICanvas) {
      return _persistUICanvas;
    }
  }

  // 创建新的 Canvas 节点
  const canvasNode = new Node(COMMON_PERSIST_UI_CANVAS_NAME);

  // 添加 Canvas 组件
  _persistUICanvas = canvasNode.addComponent(Canvas);

  // 添加 UITransform 并设置为全屏
  const uiTransform = canvasNode.getComponent(UITransform) || canvasNode.addComponent(UITransform);
  const visibleSize = view.getVisibleSize();
  uiTransform.setContentSize(visibleSize.width, visibleSize.height);

  // 添加 Widget 组件使其自适应屏幕
  const widget = canvasNode.addComponent(Widget);
  widget.isAlignTop = true;
  widget.isAlignBottom = true;
  widget.isAlignLeft = true;
  widget.isAlignRight = true;
  widget.top = 0;
  widget.bottom = 0;
  widget.left = 0;
  widget.right = 0;

  // 设置为 persist root node
  director.addPersistRootNode(canvasNode);

  return _persistUICanvas;
}