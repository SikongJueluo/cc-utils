/**
 * Renderer for drawing UI to the ComputerCraft terminal
 */

import { UIObject } from "./UIObject";
import { Accessor } from "./reactivity";

/**
 * Get text content from a node (resolving signals if needed)
 */
function getTextContent(node: UIObject): string {
  if (node.textContent !== undefined) {
    if (typeof node.textContent === "function") {
      return (node.textContent)();
    }
    return node.textContent;
  }
  
  // For nodes with text children, get their content
  if (node.children.length > 0 && node.children[0].textContent !== undefined) {
    const child = node.children[0];
    if (typeof child.textContent === "function") {
      return (child.textContent)();
    }
    return child.textContent!;
  }
  
  return "";
}

/**
 * Draw a single UI node to the terminal
 * 
 * @param node - The node to draw
 * @param focused - Whether this node has focus
 * @param cursorBlinkState - Whether the cursor should be visible (for blinking)
 */
function drawNode(node: UIObject, focused: boolean, cursorBlinkState: boolean): void {
  if (!node.layout) return;
  
  const { x, y, width } = node.layout;
  
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
        const type = node.props.type as string | undefined;
        
        if (type === "checkbox") {
          // Draw checkbox
          let isChecked = false;
          const checkedProp = node.props.checked;
          if (typeof checkedProp === "function") {
            isChecked = (checkedProp as Accessor<boolean>)();
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
          let value = "";
          const valueProp = node.props.value;
          if (typeof valueProp === "function") {
            value = (valueProp as Accessor<string>)();
          }

          const placeholder = node.props.placeholder as string | undefined;
          const cursorPos = node.cursorPos ?? 0;
          let displayText = value;
          let currentTextColor = textColor;
          let showPlaceholder = false;

          const focusedBgColor = bgColor ?? colors.white;
          const unfocusedBgColor = bgColor ?? colors.black;

          if (value === "" && placeholder !== undefined && !focused) {
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
          let textToRender = displayText;

          // Truncate text if it's too long for the padded area
          if (textToRender.length > renderWidth) {
            textToRender = textToRender.substring(0, renderWidth);
          }

          if (focused && !showPlaceholder && cursorBlinkState) {
            // Draw text with a block cursor by inverting colors at the cursor position
            for (let i = 0; i < textToRender.length; i++) {
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
            term.write(textToRender);
          }
        }
        break;
      }
      
      case "div":
      case "form":
      case "for":
      case "show": {
        // Container elements may have background colors
        if (bgColor !== undefined && node.layout !== undefined) {
          const { x: divX, y: divY, width: divWidth, height: divHeight } = node.layout;
          term.setBackgroundColor(bgColor);
          // Fill the background area
          for (let row = 0; row < divHeight; row++) {
            term.setCursorPos(divX, divY + row);
            term.write(string.rep(" ", divWidth));
          }
        }
        break;
      }
      
      case "fragment": {
        // Fragment with text content
        if (node.textContent !== undefined) {
          const text = typeof node.textContent === "function" 
            ? (node.textContent)() 
            : node.textContent;
          
          term.setTextColor(textColor ?? colors.white);
          term.setBackgroundColor(bgColor ?? colors.black);
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
export function render(node: UIObject, focusedNode?: UIObject, cursorBlinkState = false): void {
  // Draw this node
  const isFocused = node === focusedNode;
  drawNode(node, isFocused, cursorBlinkState);
  
  // Recursively draw children
  for (const child of node.children) {
    render(child, focusedNode, cursorBlinkState);
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
