/**
 * ComputerCraft TUI (Terminal User Interface) Framework
 * Based on Qt signal/slot principles for event handling
 * Provides input/output, option selection and keyboard event handling
 */

// Import required types from the ComputerCraft environment
import { CharEvent, KeyEvent, pullEventAs } from "./event";
import { CCLog, DAY } from "./ccLog";

/**
 * Signal and Slot system similar to Qt
 * Allows components to communicate with each other
 */
class Signal<T = void> {
  private slots: ((data?: T) => void)[] = [];

  connect(slot: (data?: T) => void): void {
    this.slots.push(slot);
  }

  disconnect(slot: (data?: T) => void): void {
    const index = this.slots.indexOf(slot);
    if (index !== -1) {
      this.slots.splice(index, 1);
    }
  }

  emit(data?: T): void {
    for (const slot of this.slots) {
      try {
        slot(data);
      } catch (e) {
        printError(e);
      }
    }
  }
}

abstract class UIObject {
  private objectName: string;
  private parent?: UIObject;
  private children: Record<string, UIObject> = {};
  private log?: CCLog;

  constructor(name: string) {
    this.objectName = name;
  }

  public setParent(parent: UIObject) {
    this.parent = parent;
  }

  public addChild(child: UIObject) {
    this.children[child.objectName] = child;
  }

  public removeChild(child: UIObject) {}
}

/**
 * Base class for all UI components
 */
abstract class UIComponent extends UIObject {
  protected x: number;
  protected y: number;
  protected width: number;
  protected height: number;
  protected visible = true;
  protected focused = false;

  // Signals for UI events
  public onFocus = new Signal<void>();
  public onBlur = new Signal<void>();
  public onKeyPress = new Signal<KeyEvent>();
  public onMouseClick = new Signal<{ x: number; y: number }>();

  constructor(x: number, y: number, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  // Render the component to the terminal
  abstract render(): void;

  // Handle input events
  // Key
  abstract handleKeyInput(event: KeyEvent): void;
  // Char
  abstract handleCharInput(event: CharEvent): void;

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

/**
 * Text output component
 */
class TextLabel extends UIComponent {
  private text: string;
  private textColor: number;
  private bgColor: number;

  constructor(
    x: number,
    y: number,
    text: string,
    textColor: number = colors.white,
    bgColor: number = colors.black,
  ) {
    super(x, y, text.length, 1);
    this.text = text;
    this.textColor = textColor;
    this.bgColor = bgColor;
  }

  render(): void {
    if (!this.visible) return;

    const [originalX, originalY] = term.getCursorPos();

    // Set colors
    term.setTextColor(this.textColor);
    term.setBackgroundColor(this.bgColor);

    // Move cursor to position and draw text
    term.setCursorPos(this.x, this.y);
    term.write(this.text);

    // Restore original cursor position
    term.setCursorPos(originalX, originalY);
  }

  handleKeyInput(_event: KeyEvent): void {
    // Do nothing
  }

  handleCharInput(_event: CharEvent): void {
    // Do nothing
  }

  setText(newText: string): void {
    this.text = newText;
    this.width = newText.length; // Update width based on new text
  }

  getText(): string {
    return this.text;
  }
}

/**
 * Input field component
 */
class InputField extends UIComponent {
  private value: string;
  private placeholder: string;
  private maxLength: number;
  private password: boolean;
  private cursorPos = 0;
  private isCursorBlink = false;

  // Signal for when text changes
  public onTextChanged = new Signal<string>();

  constructor(
    x: number,
    y: number,
    width: number,
    value: "",
    placeholder = "",
    maxLength = 50,
    password = false,
  ) {
    super(x, y, width, 1);
    this.value = value;
    this.placeholder = placeholder;
    this.maxLength = maxLength;
    this.password = password;
    this.cursorPos = value.length;
  }

  render(): void {
    if (!this.visible) return;

    const [originalX, originalY] = term.getCursorPos();

    // Set colors (different for focused vs unfocused)
    if (this.focused) {
      term.setTextColor(colors.black);
      term.setBackgroundColor(colors.white);
    } else {
      term.setTextColor(colors.white);
      term.setBackgroundColor(colors.black);
    }

    // Move cursor to position
    term.setCursorPos(this.x, this.y);

    // Prepare text to display (mask if password)
    let displayText = this.value;
    if (this.password) {
      displayText = "*".repeat(this.value.length);
    } else if (this.value === "" && this.placeholder !== "") {
      displayText = this.placeholder;
    }

    // Truncate or pad text to fit the field
    if (displayText.length > this.width) {
      displayText = displayText.substring(0, this.width);
    } else {
      displayText = displayText.padEnd(this.width);
    }

    // Draw the field
    term.write(displayText);

    // Move cursor to the correct position if focused
    // if (this.focused) {
    //   const cursorX = Math.min(
    //     this.x + this.cursorPos,
    //     this.x + this.width - 1,
    //   );
    //   term.setCursorPos(cursorX, this.y);
    //   term.setCursorBlink(true);
    // } else {
    //   term.setCursorBlink(false);
    // }

    // Restore original cursor position
    term.setCursorPos(originalX, originalY);
  }

  handleKeyInput(event: KeyEvent): void {
    if (!this.focused) return;

    this.onKeyPress.emit(event);

    const key = event.key;
    log.debug(`[${InputField.name}]: Get key ${keys.getName(key)}`);

    // Handle backspace
    if (key === keys.backspace) {
      if (this.cursorPos > 0) {
        this.value =
          this.value.substring(0, this.cursorPos - 1) +
          this.value.substring(this.cursorPos);
        this.cursorPos--;
        this.onTextChanged.emit(this.value);
      }
    }
    // Handle delete
    else if (key === keys.delete) {
      if (this.cursorPos < this.value.length) {
        this.value =
          this.value.substring(0, this.cursorPos) +
          this.value.substring(this.cursorPos + 1);
        this.onTextChanged.emit(this.value);
      }
    }
    // Handle left arrow
    else if (key === keys.left) {
      if (this.cursorPos > 0) {
        this.cursorPos--;
      }
    }
    // Handle right arrow
    else if (key === keys.right) {
      if (this.cursorPos < this.value.length) {
        this.cursorPos++;
      }
    }
    // Handle enter (could be used to submit form)
    else if (key === keys.enter) {
      // Could emit a submit signal here
    }
    // Handle regular characters
    else {
      // For printable characters, we need to check if they are actual characters
      // Since the event system is complex, we'll implement a more direct approach
    }
  }

  handleCharInput(event: CharEvent): void {
    if (!this.focused) return;

    const character = event.character;
    log.debug(`[${InputField.name}]: Get character ${character}`);

    this.value += character;
    this.cursorPos++;
    this.onTextChanged.emit(this.value);
  }

  // Method to get user input directly (more suitable for ComputerCraft)
  readInput(prompt = "", defaultValue = ""): string {
    // Since we can't await for events in a standard way in this context,
    // we'll use CC's read function which handles input internally
    const oldX = this.x;
    const oldY = this.y;

    // Move cursor to the input field position
    term.setCursorPos(oldX, oldY);

    // Print the prompt
    if (prompt != undefined) {
      print(prompt);
    }

    // Use ComputerCraft's read function for actual input
    const result = read(undefined, undefined, undefined, defaultValue);
    return result;
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string): void {
    this.value = value.substring(0, this.maxLength);
    this.cursorPos = value.length;
    this.onTextChanged.emit(this.value);
  }
}

/**
 * Option selection component with prompt
 */
class OptionSelector extends UIComponent {
  private options: string[];
  private currentIndex: number;
  private prompt: string;
  private displayOption: string;

  // Signal for when selection changes
  public onSelectionChanged = new Signal<{ index: number; value: string }>();

  constructor(
    x: number,
    y: number,
    options: string[],
    prompt = "Select:",
    initialIndex = 0,
  ) {
    super(x, y, 0, 1); // Width will be calculated dynamically
    this.options = options;
    this.currentIndex = initialIndex;
    this.prompt = prompt;

    // Calculate width based on prompt and longest option
    const promptWidth = prompt.length + 1; // +1 for space
    let maxOptionWidth = 0;
    for (const option of options) {
      if (option.length > maxOptionWidth) {
        maxOptionWidth = option.length;
      }
    }
    this.width = promptWidth + maxOptionWidth + 3; // +3 for brackets and space [ ]

    this.displayOption = `[${this.options[this.currentIndex]}]`;
  }

  render(): void {
    if (!this.visible) return;

    const [originalX, originalY] = term.getCursorPos();

    // Set colors
    term.setTextColor(this.focused ? colors.yellow : colors.white);
    term.setBackgroundColor(colors.black);

    // Move cursor to position
    term.setCursorPos(this.x, this.y);

    // Draw prompt and selected option
    const fullText = `${this.prompt} ${this.displayOption}`;
    term.write(fullText.padEnd(this.width));

    // Restore original cursor position
    term.setCursorPos(originalX, originalY);
  }

  handleKeyInput(event: KeyEvent): void {
    if (!this.focused) return;

    this.onKeyPress.emit(event);

    const key = event.key;

    // Handle left arrow to go to previous option
    if (key === keys.left) {
      this.previousOption();
    }
    // Handle right arrow to go to next option
    else if (key === keys.right) {
      this.nextOption();
    }
    // Handle up arrow to go to previous option
    else if (key === keys.up) {
      this.previousOption();
    }
    // Handle down arrow to go to next option
    else if (key === keys.down) {
      this.nextOption();
    }
  }

  handleCharInput(_event: CharEvent): void {
    //Do nothing
  }

  private previousOption(): void {
    this.currentIndex =
      (this.currentIndex - 1 + this.options.length) % this.options.length;
    this.updateDisplay();
    this.onSelectionChanged.emit({
      index: this.currentIndex,
      value: this.options[this.currentIndex],
    });
  }

  private nextOption(): void {
    this.currentIndex = (this.currentIndex + 1) % this.options.length;
    this.updateDisplay();
    this.onSelectionChanged.emit({
      index: this.currentIndex,
      value: this.options[this.currentIndex],
    });
  }

  private updateDisplay(): void {
    this.displayOption = `[${this.options[this.currentIndex]}]`;
  }

  getSelectedIndex(): number {
    return this.currentIndex;
  }

  getSelectedValue(): string {
    return this.options[this.currentIndex];
  }

  setSelectedIndex(index: number): void {
    if (index >= 0 && index < this.options.length) {
      this.currentIndex = index;
      this.updateDisplay();
      this.onSelectionChanged.emit({
        index: this.currentIndex,
        value: this.options[this.currentIndex],
      });
    }
  }

  setOptions(newOptions: string[]): void {
    this.options = newOptions;
    if (this.currentIndex >= newOptions.length) {
      this.currentIndex = 0;
    }
    this.updateDisplay();
  }
}

/**
 * Base Window class to manage UI components
 */
class UIWindow {
  private components: UIComponent[] = [];
  private focusedComponentIndex = -1;

  addComponent(component: UIComponent, manager: GlobalManager): void {
    this.components.push(component);
  }

  removeComponent(component: UIComponent): void {
    const index = this.components.indexOf(component);
    if (index !== -1) {
      this.components.splice(index, 1);
    }
  }

  render(): void {
    // Clear the terminal
    term.clear();
    term.setCursorPos(1, 1);

    // Render all visible components
    for (const component of this.components) {
      if (component.isVisible()) {
        component.render();
      }
    }
  }

  handleKeyInput(event: KeyEvent): void {
    // Handle input for the currently focused component
    if (
      this.focusedComponentIndex >= 0 &&
      this.focusedComponentIndex < this.components.length
    ) {
      const focusedComponent = this.components[this.focusedComponentIndex];
      if (focusedComponent.isFocused()) {
        focusedComponent.handleKeyInput(event);
      }
    }
  }

  handleCharInput(event: CharEvent): void {
    // Handle input for the currently focused component
    if (
      this.focusedComponentIndex >= 0 &&
      this.focusedComponentIndex < this.components.length
    ) {
      const focusedComponent = this.components[this.focusedComponentIndex];
      if (focusedComponent.isFocused()) {
        focusedComponent.handleCharInput(event);
      }
    }
  }

  setFocus(index: number): void {
    // Unfocus current component
    if (
      this.focusedComponentIndex >= 0 &&
      this.focusedComponentIndex < this.components.length
    ) {
      this.components[this.focusedComponentIndex].unfocus();
    }

    // Change focus
    this.focusedComponentIndex = index;

    // Focus new component
    if (
      this.focusedComponentIndex >= 0 &&
      this.focusedComponentIndex < this.components.length
    ) {
      this.components[this.focusedComponentIndex].focus();
    }
  }

  setFocusFor(component: UIComponent): void {
    const index = this.components.indexOf(component);
    if (index !== -1) {
      this.setFocus(index);
    }
  }

  getComponent(index: number): UIComponent | undefined {
    return this.components[index];
  }

  getComponents(): UIComponent[] {
    return this.components;
  }

  clear(): void {
    term.clear();
    term.setCursorPos(1, 1);
  }
}

/**
 * Main TUI Application class
 */
class TUIApplication {
  private log = new CCLog(`TUI.log`, false, DAY);
  private manager: GlobalManager;

  private window: UIWindow;
  private running = false;
  private keyEvent?: KeyEvent;
  private charEvent?: CharEvent;

  constructor() {
    this.window = new UIWindow();
    this.manager = {
      log: this.log,
    };
  }

  addComponent(component: UIComponent): void {
    this.window.addComponent(component, this.manager);
  }

  run(): void {
    this.running = true;

    // Initial render
    term.setCursorBlink(false);
    this.window.render();

    parallel.waitForAll(
      () => {
        this.mainLoop();
      },
      () => {
        this.keyLoop();
      },
      () => {
        this.charLoop();
      },
    );
  }

  stop(): void {
    this.running = false;
    this.manager.log.close();
  }

  mainLoop(): void {
    // Main event loop
    while (this.running) {
      // Render the UI
      this.window.render();

      // Small delay to prevent excessive CPU usage
      os.sleep(0.05);
    }
  }

  keyLoop(): void {
    while (this.running) {
      // Handle input events
      this.keyEvent = pullEventAs(KeyEvent, "key");
      this.manager.log.debug(
        `[${TUIApplication.name}]: Get Key Event: ${textutils.serialise(this.keyEvent ?? {})}`,
      );
      if (this.keyEvent == undefined) continue;
      this.window.handleKeyInput(this.keyEvent);
    }
  }

  charLoop(): void {
    while (this.running) {
      // Handle input events
      this.charEvent = pullEventAs(CharEvent, "char");
      this.manager.log.debug(
        `[${TUIApplication.name}]: Get Char Event: ${textutils.serialise(this.charEvent ?? {})}`,
      );
      if (this.charEvent == undefined) continue;
      this.window.handleCharInput(this.charEvent);
    }
  }

  getWindow(): UIWindow {
    return this.window;
  }
}

// Export the main classes for use in other modules
export {
  Signal,
  UIComponent,
  TextLabel,
  InputField,
  OptionSelector,
  UIWindow,
  TUIApplication,
};
