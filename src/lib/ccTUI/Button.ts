import { UIComponent } from "./UIComponent";
import { Signal } from "./Signal";
import { KeyEvent } from "../event";

/**
 * Button component
 */
export class Button extends UIComponent {
  private text: string;
  private textColor: number;
  private bgColor: number;
  private pressed = false;

  // Signal for when button is clicked
  public onClick = new Signal<void>();

  constructor(
    objectName: string,
    x: number,
    y: number,
    text: string,
    textColor: number = colors.white,
    bgColor: number = colors.black,
  ) {
    // Width is based on text length plus 2 for the brackets ( [text] )
    super(objectName, x, y, text.length + 2, 1);
    this.text = text;
    this.textColor = textColor;
    this.bgColor = bgColor;
  }

  render(): void {
    if (!this.visible) return;

    const [originalX, originalY] = term.getCursorPos();

    // Set colors based on state (normal, focused, or pressed)
    let textColor = this.textColor;
    let backgroundColor = this.bgColor;

    if (this.pressed) {
      textColor = this.bgColor; // Swap text and background colors when pressed
      backgroundColor = this.textColor;
    } else if (this.focused) {
      textColor = colors.yellow; // Yellow text when focused
    }

    term.setTextColor(textColor);
    term.setBackgroundColor(backgroundColor);

    // Move cursor to position and draw button
    term.setCursorPos(this.x, this.y);
    term.write(`[${this.text}]`);

    // Restore original cursor position
    term.setCursorPos(originalX, originalY);
  }

  handleKeyInput(event: KeyEvent): void {
    if (!this.focused) return;

    this.onKeyPress.emit(event);

    const key = event.key;

    // Handle button activation with space or enter
    if (key === keys.space || key === keys.enter) {
      this.pressButton();
    }
  }

  handleMouseClick(_event: { x: number; y: number }): void {
    // Button was clicked, trigger press
    this.pressButton();
  }

  private pressButton(): void {
    // Set pressed state and render
    this.pressed = true;
    this.render();

    // Trigger click signal
    this.onClick.emit();

    // Reset pressed state after a short delay to show visual feedback
    this.startTimer(() => {
      this.pressed = false;
      this.render();
    }, 100);
  }

  setText(newText: string): void {
    this.text = newText;
    this.width = newText.length + 2; // Update width based on new text
  }

  getText(): string {
    return this.text;
  }
}
