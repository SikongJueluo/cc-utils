/**
 * ComputerCraft TUI (Terminal User Interface) Framework
 * Based on Qt signal/slot principles for event handling
 * Provides input/output, option selection and keyboard event handling
 */

// Import required types from the ComputerCraft environment
import { CharEvent, KeyEvent, pullEventAs, TimerEvent } from "./event";
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

  handleTimerTrigger(_event: TimerEvent): void {
    // Do nothing
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
    objectName: string,
    x: number,
    y: number,
    text: string,
    textColor: number = colors.white,
    bgColor: number = colors.black,
  ) {
    super(objectName, x, y, text.length, 1);
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
    objectName: string,
    x: number,
    y: number,
    width: number,
    value: "",
    placeholder = "",
    maxLength = 50,
    password = false,
  ) {
    super(objectName, x, y, width, 1);
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
    this.log?.debug(`[${InputField.name}]: Get key ${keys.getName(key)}`);

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
    this.log?.debug(`[${InputField.name}]: Get character ${character}`);

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
    objectName: string,
    x: number,
    y: number,
    options: string[],
    prompt = "Select:",
    initialIndex = 0,
  ) {
    super(objectName, x, y, 0, 1); // Width will be calculated dynamically
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
 * Tab component that allows switching between different pages
 * Similar to QT's TabWidget, currently implementing horizontal tabs only
 */
class TabWidget extends UIComponent {
  // Tab data structure - simple array of tab names
  private tabs: string[];
  private currentIndex: number;
  // Tracks visible range of tabs to handle overflow scenarios
  private firstVisibleIndex: number;
  private lastVisibleIndex: number;

  // Signal emitted when the current tab changes
  public onTabChanged = new Signal<{ index: number; name: string }>();

  /**
   * Creates a new TabWidget component
   * @param objectName Unique name for the component
   * @param x X position on the terminal
   * @param y Y position on the terminal
   * @param width Width of the tab widget
   * @param tabNames Initial list of tab names
   * @param initialIndex Index of the initially selected tab (default: 0)
   */
  constructor(
    objectName: string,
    x: number,
    y: number,
    width: number,
    tabNames: string[],
    initialIndex = 0,
  ) {
    super(objectName, x, y, width, 1);

    // Initialize tabs as simple string array
    this.tabs = [...tabNames];
    this.currentIndex = Math.max(
      0,
      Math.min(initialIndex, tabNames.length - 1),
    );
    this.firstVisibleIndex = 0;
    this.lastVisibleIndex = -1;

    // Calculate which tabs can be displayed based on available width
    this.updateVisibleRange();
  }

  /**
   * Updates the range of visible tabs based on available width
   * This method ensures the current tab is always visible and calculates
   * which other tabs can fit in the available space
   */
  private updateVisibleRange(): void {
    // If no tabs exist, nothing to update
    if (this.tabs.length === 0) {
      this.firstVisibleIndex = 0;
      this.lastVisibleIndex = -1;
      return;
    }

    // Calculate visible tabs range based on current position
    this.calculateVisibleTabs();
  }

  /**
   * Calculates visible tabs based on current position and available width
   * Follows the new core rendering logic
   */
  private calculateVisibleTabs(): void {
    if (this.tabs.length === 0) {
      this.firstVisibleIndex = 0;
      this.lastVisibleIndex = -1;
      return;
    }

    // Start with all tabs and build the complete string
    let fullString = "| ";
    for (let i = 0; i < this.tabs.length; i++) {
      if (i > 0) {
        fullString += " | ";
      }
      fullString += this.tabs[i];
    }
    fullString += " |";

    // If the full string fits, show all tabs
    if (fullString.length <= this.width) {
      this.firstVisibleIndex = 0;
      this.lastVisibleIndex = this.tabs.length - 1;
      return;
    }

    // Find the range that can fit around the current tab
    this.firstVisibleIndex = this.currentIndex;
    this.lastVisibleIndex = this.currentIndex;

    // Try to expand left and right alternately
    while (
      this.firstVisibleIndex > 0 ||
      this.lastVisibleIndex < this.tabs.length - 1
    ) {
      let expanded = false;

      // Try expanding left first
      if (this.firstVisibleIndex > 0) {
        const newTestString =
          "| " +
          this.tabs[this.firstVisibleIndex - 1] +
          " | " +
          this.tabs
            .slice(this.firstVisibleIndex, this.lastVisibleIndex + 1)
            .join(" | ") +
          " |";

        if (newTestString.length <= this.width) {
          this.firstVisibleIndex--;
          expanded = true;
        }
      }

      // Try expanding right
      if (this.lastVisibleIndex < this.tabs.length - 1) {
        const newTestString =
          "| " +
          this.tabs
            .slice(this.firstVisibleIndex, this.lastVisibleIndex + 1)
            .join(" | ") +
          " | " +
          this.tabs[this.lastVisibleIndex + 1] +
          " |";

        if (newTestString.length <= this.width) {
          this.lastVisibleIndex++;
          expanded = true;
        }
      }

      // If no expansion was possible, break
      if (!expanded) break;
    }
  }

  /**
   * Renders the tab widget to the terminal
   * Follows the new core rendering logic:
   * 1. Build complete string with all visible tabs
   * 2. Calculate what can be displayed
   * 3. Replace indicators based on hidden tabs
   * 4. Determine highlight range and render
   */
  render(): void {
    if (!this.visible) return;

    const [originalX, originalY] = term.getCursorPos();

    // Move cursor to the position of the tab widget
    term.setCursorPos(this.x, this.y);

    if (this.tabs.length === 0) {
      // Fill with spaces if no tabs
      term.setTextColor(colors.white);
      term.setBackgroundColor(colors.black);
      term.write(" ".repeat(this.width));
      term.setCursorPos(originalX, originalY);
      return;
    }

    // Step 1: Build complete string for visible tabs with "| " at start and " |" at end
    let displayString = "| ";
    for (let i = this.firstVisibleIndex; i <= this.lastVisibleIndex; i++) {
      if (i > this.firstVisibleIndex) {
        displayString += " | ";
      }
      displayString += this.tabs[i];
    }
    displayString += " |";

    // Step 2: Check if the string fits, if not, truncate with "..."
    if (displayString.length > this.width) {
      // Need to truncate - find where to cut and add "..."
      const maxLength = this.width - 3; // Reserve space for "..."
      if (maxLength > 0) {
        // Find the last complete tab that can fit
        let cutPosition = maxLength;
        // Try to cut at a tab boundary if possible
        let lastPipePos = -1;
        for (let i = cutPosition; i >= 0; i--) {
          if (displayString.substring(i, i + 3) === " | ") {
            lastPipePos = i;
            break;
          }
        }
        if (lastPipePos > 2) {
          // Make sure we don't cut before the first tab
          cutPosition = lastPipePos;
        }
        displayString = displayString.substring(0, cutPosition) + "...";
      } else {
        displayString = "...";
      }
    }

    // Step 3: Replace boundary indicators based on hidden tabs
    if (this.firstVisibleIndex > 0) {
      // Left side has hidden tabs - replace "| " with "< "
      displayString = "< " + displayString.substring(2);
    }

    if (this.lastVisibleIndex < this.tabs.length - 1) {
      // Right side has hidden tabs - replace " |" with " >"
      if (displayString.endsWith(" |")) {
        displayString =
          displayString.substring(0, displayString.length - 2) + " >";
      } else if (displayString.endsWith("...")) {
        // If we have "...", just ensure we show ">"
        displayString =
          displayString.substring(0, displayString.length - 3) + " >";
      }
    }

    // Pad to maintain consistent width
    while (displayString.length < this.width) {
      displayString += " ";
    }

    // Ensure we don't exceed the width
    if (displayString.length > this.width) {
      displayString = displayString.substring(0, this.width);
    }

    // Step 4: Find current tab position for highlighting
    let currentTabStart = -1;
    let currentTabEnd = -1;

    if (
      this.currentIndex >= this.firstVisibleIndex &&
      this.currentIndex <= this.lastVisibleIndex
    ) {
      // Calculate position of current tab in display string
      let searchPos = 2; // Start after "| " or "< "

      // Find current tab position by iterating through visible tabs
      for (let i = this.firstVisibleIndex; i <= this.lastVisibleIndex; i++) {
        if (i > this.firstVisibleIndex) {
          searchPos += 3; // " | " separator
        }

        if (i === this.currentIndex) {
          currentTabStart = searchPos;

          // Find the end of the current tab
          const tabName = this.tabs[i];
          const remainingString = displayString.substring(searchPos);

          // Check if the tab is fully displayed or truncated
          if (remainingString.startsWith(tabName)) {
            // Tab is fully displayed
            currentTabEnd = searchPos + tabName.length;
          } else {
            // Tab might be truncated, find where it ends
            const nextSeparatorPos = remainingString.indexOf(" |");
            const nextIndicatorPos = remainingString.indexOf(" >");
            const ellipsisPos = remainingString.indexOf("...");

            let endPos = remainingString.length;
            if (nextSeparatorPos >= 0)
              endPos = Math.min(endPos, nextSeparatorPos);
            if (nextIndicatorPos >= 0)
              endPos = Math.min(endPos, nextIndicatorPos);
            if (ellipsisPos >= 0) endPos = Math.min(endPos, ellipsisPos);

            currentTabEnd = searchPos + endPos;
          }
          break;
        }

        searchPos += this.tabs[i].length;
      }
    }

    // Step 5: Render with highlighting
    term.setTextColor(colors.white);
    term.setBackgroundColor(colors.black);

    if (currentTabStart >= 0 && currentTabEnd > currentTabStart) {
      // Render text before current tab
      if (currentTabStart > 0) {
        term.write(displayString.substring(0, currentTabStart));
      }

      // Render current tab with highlighting
      term.setTextColor(colors.yellow);
      term.setBackgroundColor(colors.gray);
      term.write(displayString.substring(currentTabStart, currentTabEnd));

      // Reset colors and render remaining text
      term.setTextColor(colors.white);
      term.setBackgroundColor(colors.black);
      term.write(displayString.substring(currentTabEnd));
    } else {
      // No highlighting needed, render entire string
      term.write(displayString);
    }

    // Restore original cursor position
    term.setCursorPos(originalX, originalY);
  }

  /**
   * Handles key input events for the tab widget
   * Supports left/right arrow keys to switch between tabs
   * @param event The key event to handle
   */
  handleKeyInput(event: KeyEvent): void {
    if (!this.focused) return;

    this.onKeyPress.emit(event);

    const key = event.key;

    // Handle left arrow to move to previous visible tab
    if (key === keys.left && this.canMoveToPreviousTab()) {
      this.moveToPreviousTab();
    }
    // Handle right arrow to move to next visible tab
    else if (key === keys.right && this.canMoveToNextTab()) {
      this.moveToNextTab();
    }
  }

  /**
   * Checks if there is a previous tab available to move to
   * @returns True if there's a previous tab, false otherwise
   */
  private canMoveToPreviousTab(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Moves to the previous tab
   */
  private moveToPreviousTab(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateVisibleRange();
      this.onTabChanged.emit({
        index: this.currentIndex,
        name: this.tabs[this.currentIndex],
      });
    }
  }

  /**
   * Checks if there is a next tab available to move to
   * @returns True if there's a next tab, false otherwise
   */
  private canMoveToNextTab(): boolean {
    return this.currentIndex < this.tabs.length - 1;
  }

  /**
   * Moves to the next tab
   */
  private moveToNextTab(): void {
    if (this.currentIndex < this.tabs.length - 1) {
      this.currentIndex++;
      this.updateVisibleRange();
      this.onTabChanged.emit({
        index: this.currentIndex,
        name: this.tabs[this.currentIndex],
      });
    }
  }

  /**
   * Gets the index of the currently selected tab
   * @returns The index of the current tab
   */
  getCurrentTabIndex(): number {
    return this.currentIndex;
  }

  /**
   * Gets the name of the currently selected tab
   * @returns The name of the current tab
   */
  getCurrentTabName(): string {
    if (this.currentIndex >= 0 && this.currentIndex < this.tabs.length) {
      return this.tabs[this.currentIndex];
    }
    return "";
  }

  /**
   * Sets the currently selected tab by index
   * @param index The index of the tab to select
   */
  setCurrentTabIndex(index: number): void {
    if (index >= 0 && index < this.tabs.length) {
      this.currentIndex = index;
      this.updateVisibleRange();
      this.onTabChanged.emit({
        index: this.currentIndex,
        name: this.tabs[this.currentIndex],
      });
    }
  }

  /**
   * Updates the list of tabs with new tab names
   * @param tabNames The new list of tab names
   */
  setTabNames(tabNames: string[]): void {
    this.tabs = [...tabNames];

    // Ensure current index is within bounds
    if (this.currentIndex >= this.tabs.length) {
      this.currentIndex = Math.max(0, this.tabs.length - 1);
    }

    this.updateVisibleRange();
  }
}

/**
 * Base Window class to manage UI components
 */
class UIWindow {
  private components: UIComponent[] = [];
  private focusedComponentIndex = -1;

  addComponent(component: UIComponent): void {
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

  handleTimerTrigger(event: TimerEvent) {
    for (const component of this.components) {
      component.handleTimerTrigger(event);
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

  private window: UIWindow;
  private running = false;

  constructor() {
    this.window = new UIWindow();
  }

  addComponent(component: UIComponent): void {
    this.window.addComponent(component);
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
    this.log.close();
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
      const keyEvent = pullEventAs(KeyEvent, "key");
      this.log.debug(
        `[${TUIApplication.name}]: Get Key Event: ${textutils.serialise(keyEvent ?? {})}`,
      );
      if (keyEvent == undefined) continue;
      this.window.handleKeyInput(keyEvent);
    }
  }

  charLoop(): void {
    while (this.running) {
      // Handle input events
      const charEvent = pullEventAs(CharEvent, "char");
      this.log.debug(
        `[${TUIApplication.name}]: Get Char Event: ${textutils.serialise(charEvent ?? {})}`,
      );
      if (charEvent == undefined) continue;
      this.window.handleCharInput(charEvent);
    }
  }

  timerLoop(): void {
    while (this.running) {
      // Handle events
      const timerEvent = pullEventAs(TimerEvent, "timer");
      this.log.debug(
        `[${TUIApplication.name}]: Get Timer Event: ${textutils.serialise(timerEvent ?? {})}`,
      );
      if (timerEvent == undefined) continue;
      this.window.handleTimerTrigger(timerEvent);
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
  TabWidget,
  UIWindow,
  TUIApplication,
};
