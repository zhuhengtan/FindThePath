import JsEventBus from "js-event-bus";

class EventBus {
  private static _instance: JsEventBus;
  private constructor() {}
  public static get instance(): JsEventBus {
    if (!this._instance) {
      this._instance = new JsEventBus();
    }
    return this._instance;
  }
  public static emit(eventName: string, ...args: any[]): void {
    this.instance.emit(eventName, undefined, ...args);
  }
  public static on(eventName: string, handler: (...args: any[]) => void): void {
    this.instance.on(eventName, handler);
  }
  public static once(
    eventName: string,
    handler: (...args: any[]) => void
  ): void {
    this.instance.once(eventName, handler);
  }
  public static exactly(
    number: number,
    eventName: string,
    handler: (...args: any[]) => void
  ): void {
    this.instance.exactly(number, eventName, handler);
  }
  public static die(eventName: string): void {
    this.instance.die(eventName);
  }
  public static off(eventName: string): void {
    this.instance.off(eventName);
  }
  public static detach(
    eventName: string,
    handler?: (...args: any[]) => void
  ): boolean {
    return this.instance.detach(eventName, handler);
  }
  public static detachAll(): void {
    this.instance.detachAll();
  }
}

export default EventBus;
