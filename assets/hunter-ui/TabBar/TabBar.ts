import {
  _decorator,
  Component,
  UITransform,
  SpriteFrame,
  instantiate,
  Vec3,
  Prefab,
} from "cc";
import { TabItem } from "./TabItem";
import EventBus from "db://assets/hunter/utils/event-bus";
const { ccclass, property } = _decorator;

export enum TarBarEvents {
  TabItemChanged = "tab-item-changed",
}

@ccclass("TabBar")
export class TabBar extends Component {
  @property(Prefab)
  public itemPrefab: Prefab = null;

  @property({type: [TabItem]})
  public items: TabItem[] = [];

  @property
  public barKey: string = "";

  @property
  public requireSelection: boolean = false;

  @property
  public trackSelection: boolean = true;

  @property
  public defaultSelectedKey: string = "";

  private _selectedKey: string = "";

  protected onLoad(): void {
    this._selectedKey = this.defaultSelectedKey;
    this.build();
  }

  public build(): void {
    this.items.forEach((item) => {
      if (item.key === this._selectedKey) {
        item.setSelected(true);
      }
      item.node.on(
        "tab-item-click",
        (ti: TabItem) => this.onItemClicked(ti),
        this
      );
    });
  }

  private onItemClicked(ti: TabItem): void {
    if (!this.trackSelection) {
      EventBus.emit(TarBarEvents.TabItemChanged, {
        barKey: this.barKey,
        key: ti.key,
        name: ti.name,
        selected: true,
      });
      return;
    }
    if (this._selectedKey === ti.key) {
      if (this.requireSelection) {
        return;
      }
      ti.setSelected(false);
      this._selectedKey = "";
      EventBus.emit(TarBarEvents.TabItemChanged, {  
        barKey: this.barKey,
        key: ti.key,
        name: ti.name,
        selected: false,
      });
      return;
    }
    if (this._selectedKey !== "")
      this.items.find((i) => i.key === this._selectedKey)?.setSelected(false);
    ti.setSelected(true);
    this._selectedKey = ti.key;
    EventBus.emit(TarBarEvents.TabItemChanged, {
      barKey: this.barKey,
      key: ti.key,
      name: ti.name,
      selected: true,
    });
  }
}
