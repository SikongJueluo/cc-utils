import { UIComponent } from "./UIComponent";
import { Signal } from "./Signal";
import { KeyEvent, CharEvent } from "../event";

/**
 * Input field component
 */
export class InputField extends UIComponent {
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
