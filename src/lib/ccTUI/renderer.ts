/**
 * Renderer for drawing UI to the ComputerCraft terminal
 */

import { UIObject } from "./UIObject";
import { InputProps } from "./components";
import { isScrollContainer } from "./scrollContainer";

/**
 * Get text content from a node (resolving signals if needed)
 */
function getTextContent(node: UIObject): string {
  if (node.textContent !== undefined) {
    if (typeof node.textContent === "function") {
      return node.textContent();
    }
    return node.textContent;
  }

  // For nodes with text children, get their content
  if (node.children.length > 0 && node.children[0].textContent !== undefined) {
    const child = node.children[0];
    if (typeof child.textContent === "function") {
      return child.textContent();
    }
    return child.textContent!;
  }

  return "";
}

/**
 * Check if a position is within the visible area of all scroll container ancestors
 */
function isPositionVisible(
  node: UIObject,
  screenX: number,
  screenY: number,
): boolean {
  let current = node.parent;
  while (current) {
    if (isScrollContainer(current) && current.layout && current.scrollProps) {
      const { x: containerX, y: containerY } = current.layout;
      const { viewportWidth, viewportHeight } = current.scrollProps;

      // Check if position is within the scroll container's viewport
      if (
        screenX < containerX ||
        screenX >= containerX + viewportWidth ||
        screenY < containerY ||
        screenY >= containerY + viewportHeight
      ) {
        return false;
      }
    }
    current = current.parent;
  }
  return true;
}

/**
 * Draw a scrollbar for a scroll container
 */
function drawScrollbar(container: UIObject): void {
  if (
    !container.layout ||
    !container.scrollProps ||
    container.scrollProps.showScrollbar === false
  ) {
    return;
  }

  const { x, y, width, height } = container.layout;
  const { scrollY, maxScrollY, viewportHeight, contentHeight } =
    container.scrollProps;

  // Only draw vertical scrollbar if content is scrollable
  if (maxScrollY <= 0) return;

  const scrollbarX = x + width - 1; // Position scrollbar at the right edge
  const scrollbarHeight = height;

  // Calculate scrollbar thumb position and size
  const thumbHeight = Math.max(
    1,
    Math.floor((viewportHeight / contentHeight) * scrollbarHeight),
  );
  const thumbPosition = Math.floor(
    (scrollY / maxScrollY) * (scrollbarHeight - thumbHeight),
  );

  // Save current colors
  const [origX, origY] = term.getCursorPos();

  try {
    // Draw scrollbar track
    term.setTextColor(colors.gray);
    term.setBackgroundColor(colors.lightGray);

    for (let i = 0; i < scrollbarHeight; i++) {
      term.setCursorPos(scrollbarX, y + i);
      if (i >= thumbPosition && i < thumbPosition + thumbHeight) {
        // Draw scrollbar thumb
        term.setBackgroundColor(colors.gray);
        term.write(" ");
      } else {
        // Draw scrollbar track
        term.setBackgroundColor(colors.lightGray);
        term.write(" ");
      }
    }
  } finally {
    term.setCursorPos(origX, origY);
  }
}

/**
 * Draw a single UI node to the terminal
 *
 * @param node - The node to draw
 * @param focused - Whether this node has focus
 * @param cursorBlinkState - Whether the cursor should be visible (for blinking)
 */
function drawNode(
  node: UIObject,
  focused: boolean,
  cursorBlinkState: boolean,
): void {
  if (!node.layout) return;

  const { x, y, width, height } = node.layout;

  // Check if this node is visible within scroll container viewports
  if (!isPositionVisible(node, x, y)) {
    return;
  }

  // Save cursor position
  const [origX, origY] = term.getCursorPos();

  try {
    // Default colors that can be overridden by styleProps
    let textColor = node.styleProps.textColor;
    const bgColor = node.styleProps.backgroundColor;

    switch (node.type) {
      case "label":
      case "h1":
      case "h2":
      case "h3": {
        const text = getTextContent(node);

        // Set colors based on heading level (if not overridden by styleProps)
        if (textColor === undefined) {
          if (node.type === "h1") {
            textColor = colors.yellow;
          } else if (node.type === "h2") {
            textColor = colors.orange;
          } else if (node.type === "h3") {
            textColor = colors.lightGray;
          } else {
            textColor = colors.white;
          }
        }

        term.setTextColor(textColor);
        term.setBackgroundColor(bgColor ?? colors.black);

        term.setCursorPos(x, y);
        term.write(text.substring(0, width));
        break;
      }

      case "button": {
        const text = getTextContent(node);

        // Set colors based on focus (if not overridden by styleProps)
        if (focused) {
          term.setTextColor(textColor ?? colors.black);
          term.setBackgroundColor(bgColor ?? colors.yellow);
        } else {
          term.setTextColor(textColor ?? colors.white);
          term.setBackgroundColor(bgColor ?? colors.gray);
        }

        term.setCursorPos(x, y);
        term.write(`[${text}]`);
        break;
      }

      case "input": {
        const type = (node.props as InputProps).type as string | undefined;

        if (type === "checkbox") {
          // Draw checkbox
          let isChecked = false;
          const checkedProp = (node.props as InputProps).checked;
          if (typeof checkedProp === "function") {
            isChecked = checkedProp();
          }

          if (focused) {
            term.setTextColor(textColor ?? colors.black);
            term.setBackgroundColor(bgColor ?? colors.white);
          } else {
            term.setTextColor(textColor ?? colors.white);
            term.setBackgroundColor(bgColor ?? colors.black);
          }

          term.setCursorPos(x, y);
          term.write(isChecked ? "[X]" : "[ ]");
        } else {
          // Draw text input
          let displayText = "";
          const valueProp = (node.props as InputProps).value;
          if (typeof valueProp === "function") {
            displayText = valueProp();
          }
          const placeholder = (node.props as InputProps).placeholder;
          const cursorPos = node.cursorPos ?? 0;
          let currentTextColor = textColor;
          let showPlaceholder = false;

          const focusedBgColor = bgColor ?? colors.white;
          const unfocusedBgColor = bgColor ?? colors.black;

          if (displayText === "" && placeholder !== undefined && !focused) {
            displayText = placeholder;
            showPlaceholder = true;
            currentTextColor = currentTextColor ?? colors.gray;
          } else if (focused) {
            currentTextColor = currentTextColor ?? colors.black;
          } else {
            currentTextColor = currentTextColor ?? colors.white;
          }

          // Set background and clear the input area, creating a 1-character padding on the left
          term.setBackgroundColor(focused ? focusedBgColor : unfocusedBgColor);
          term.setCursorPos(x, y);
          term.write(" ".repeat(width));

          term.setTextColor(currentTextColor);
          term.setCursorPos(x + 1, y); // Position cursor for text after padding

          const renderWidth = width - 1;
          const textToRender = displayText + " ";

          // Move text if it's too long for the padded area
          const startDisPos =
            cursorPos >= renderWidth ? cursorPos - renderWidth + 1 : 0;
          const stopDisPos = startDisPos + renderWidth;

          if (focused && !showPlaceholder && cursorBlinkState) {
            // Draw text with a block cursor by inverting colors at the cursor position
            for (
              let i = startDisPos;
              i < textToRender.length && i < stopDisPos;
              i++
            ) {
              const char = textToRender.substring(i, i + 1);
              if (i === cursorPos) {
                // Invert colors for cursor
                term.setBackgroundColor(currentTextColor);
                term.setTextColor(focusedBgColor);
                term.write(char);
                // Restore colors
                term.setBackgroundColor(focusedBgColor);
                term.setTextColor(currentTextColor);
              } else {
                term.write(char);
              }
            }
            // Draw cursor at the end of the text if applicable
            if (cursorPos === textToRender.length && cursorPos < renderWidth) {
              term.setBackgroundColor(currentTextColor);
              term.setTextColor(focusedBgColor);
              term.write(" ");
              // Restore colors
              term.setBackgroundColor(focusedBgColor);
              term.setTextColor(currentTextColor);
            }
          } else {
            // Not focused or no cursor, just write the text
            term.write(textToRender.substring(startDisPos, stopDisPos));
          }
        }
        break;
      }

      case "div":
      case "form":
      case "for":
      case "show":
      case "switch":
      case "match": {
        // Container elements may have background colors
        if (bgColor !== undefined && node.layout !== undefined) {
          const {
            x: divX,
            y: divY,
            width: divWidth,
            height: divHeight,
          } = node.layout;
          term.setBackgroundColor(bgColor);
          // Fill the background area
          for (let row = 0; row < divHeight; row++) {
            term.setCursorPos(divX, divY + row);
            term.write(string.rep(" ", divWidth));
          }
        }
        break;
      }

      case "scroll-container": {
        // Draw the scroll container background
        if (bgColor !== undefined) {
          term.setBackgroundColor(bgColor);
          for (let row = 0; row < height; row++) {
            term.setCursorPos(x, y + row);
            term.write(string.rep(" ", width));
          }
        }

        // Draw scrollbar after rendering children
        // (This will be called after children are rendered)
        break;
      }

      case "fragment": {
        // Fragment with text content
        if (node.textContent !== undefined) {
          const text =
            typeof node.textContent === "function"
              ? node.textContent()
              : node.textContent;

          if (bgColor !== undefined) {
            term.setBackgroundColor(bgColor);
          }
          term.setCursorPos(x, y);
          term.write(text.substring(0, width));
        }
        break;
      }
    }
  } finally {
    // Restore cursor
    term.setCursorPos(origX, origY);
  }
}

/**
 * Recursively render a UI tree
 *
 * @param node - The root node to render
 * @param focusedNode - The currently focused node (if any)
 * @param cursorBlinkState - Whether the cursor should be visible (for blinking)
 */
export function render(
  node: UIObject,
  focusedNode?: UIObject,
  cursorBlinkState = false,
): void {
  // Draw this node
  const isFocused = node === focusedNode;
  drawNode(node, isFocused, cursorBlinkState);

  // For scroll containers, set up clipping region before rendering children
  if (isScrollContainer(node) && node.layout && node.scrollProps) {
    // Recursively draw children (they will be clipped by visibility checks)
    for (const child of node.children) {
      render(child, focusedNode, cursorBlinkState);
    }

    // Draw scrollbar after children
    drawScrollbar(node);
  } else {
    // Recursively draw children normally
    for (const child of node.children) {
      render(child, focusedNode, cursorBlinkState);
    }
  }
}

/**
 * Clear the entire terminal screen
 */
export function clearScreen(): void {
  term.setBackgroundColor(colors.black);
  term.clear();
  term.setCursorPos(1, 1);
}
