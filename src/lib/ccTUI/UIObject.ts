import { CCLog } from "../ccLog";

export abstract class UIObject {
  readonly objectName: string;
  private parent?: UIObject;
  private children: Record<string, UIObject> = {};

  public log?: CCLog;

  constructor(name: string, parent?: UIObject, log?: CCLog) {
    this.objectName = name;
    this.parent = parent;
    this.log = log;
  }

  public setParent(parent: UIObject) {
    this.parent = parent;
    this.log ??= parent.log;
  }

  public addChild(child: UIObject) {
    this.children[child.objectName] = child;
  }

  public removeChild(child: UIObject) {
    Object.entries(this.children).forEach(([key, value]) => {
      if (value === child) {
        delete this.children[key];
      }
    });
  }
}
