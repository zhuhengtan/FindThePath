import { WECHAT } from "cc/env";

export enum VibrateType {
  ShortLight, // 轻震动
  ShortMedium, // 中震动
  ShortHeavy, // 重震动
  Long, // 长震动
}

export const vibrate = (type: VibrateType) => {
  try {
    switch (type) {
      case VibrateType.ShortLight:
        if (WECHAT) {
          wx.vibrateShort({ type: "light" });
        } else {
          navigator.vibrate(100);
        }
        break;
      case VibrateType.ShortMedium:
        if (WECHAT) {
          wx.vibrateShort({ type: "medium" });
        } else {
          navigator.vibrate(150);
        }
        break;
      case VibrateType.ShortHeavy:
        if (WECHAT) {
          wx.vibrateShort({ type: "heavy" });
        } else {
          navigator.vibrate(200);
        }
        break;
      case VibrateType.Long:
        if (WECHAT) {
          wx.vibrateLong();
        } else {
          navigator.vibrate(400);
        }
      default:
        break;
    }
  } catch (error) {
    console.error("此设备不支持震动功能, ", error);
  }
};
