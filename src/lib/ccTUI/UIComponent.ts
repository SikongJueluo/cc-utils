import { Signal } from "./Signal";
import { KeyEvent, CharEvent, TimerEvent } from "../event";
import { UIObject } from "./UIObject";
/**
 * Base class for all UI components
 */
export abstract class UIComponent extends UIObject {
  protected x: number;
  protected y: number;
  protected width: number;
  protected height: number;
  protected visible = true;
  protected focused = false;
  protected timerTasks: Record<number, (event: TimerEvent) => void> = {};

  // Signals for UI events
  public onFocus = new Signal<void>();
  public onBlur = new Signal<void>();
  public onKeyPress = new Signal<KeyEvent>();
  public onMouseClick = new Signal<{ x: number; y: number }>();

  constructor(objectName: string, x: number, y: number, width = 0, height = 0) {
    super(objectName);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  // Render the component to the terminal
  abstract render(): void;

  // Handle events
  // Key
  handleKeyInput(_event: KeyEvent): void {
    // Do nothing
  }

  // Char
  handleCharInput(_event: CharEvent): void {
    // Do nothing
  }

  handleTimerTrigger(event: TimerEvent): void {
    this.timerTasks[event.id]?.(event);
    delete this.timerTasks[event.id];
  }

  // Get/set focus for the component
  focus(): void {
    this.focused = true;
    this.onFocus.emit();
  }

  unfocus(): void {
    this.focused = false;
    this.onBlur.emit();
  }

  // Show/hide the component
  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  // Check if a point is inside the component
  contains(pointX: number, pointY: number): boolean {
    return (
      pointX >= this.x &&
      pointX < this.x + this.width &&
      pointY >= this.y &&
      pointY < this.y + this.height
    );
  }

  // Start a timer for delay task
  startTimer(task: (event: TimerEvent) => void, miliseconds: number): void {
    const id = os.startTimer(miliseconds);
    this.timerTasks[id] = task;
  }

  // Getter methods
  getX(): number {
    return this.x;
  }
  getY(): number {
    return this.y;
  }
  getWidth(): number {
    return this.width;
  }
  getHeight(): number {
    return this.height;
  }
  isVisible(): boolean {
    return this.visible;
  }
  isFocused(): boolean {
    return this.focused;
  }
}
