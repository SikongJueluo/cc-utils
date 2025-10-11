import { UIComponent } from "./UIComponent";
import { Signal } from "./Signal";
import { KeyEvent } from "../event";

/**
 * Option selection component with prompt
 */
export class OptionSelector extends UIComponent {
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
