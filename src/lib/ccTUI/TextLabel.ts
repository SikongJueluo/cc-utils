import { UIComponent } from "./UIComponent";
/**
 * Text output component
 */
export class TextLabel extends UIComponent {
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
