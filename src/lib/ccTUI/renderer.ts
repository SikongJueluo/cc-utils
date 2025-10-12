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
 */
function drawNode(node: UIObject, focused: boolean): void {
  if (!node.layout) return;
  
  const { x, y, width } = node.layout;
  
  // Save cursor position
  const [origX, origY] = term.getCursorPos();
  
  try {
    switch (node.type) {
      case "label":
      case "h1":
      case "h2":
      case "h3": {
        const text = getTextContent(node);
        
        // Set colors based on heading level
        if (node.type === "h1") {
          term.setTextColor(colors.yellow);
        } else if (node.type === "h2") {
          term.setTextColor(colors.orange);
        } else if (node.type === "h3") {
          term.setTextColor(colors.lightGray);
        } else {
          term.setTextColor(colors.white);
        }
        term.setBackgroundColor(colors.black);
        
        term.setCursorPos(x, y);
        term.write(text.substring(0, width));
        break;
      }
      
      case "button": {
        const text = getTextContent(node);
        
        // Set colors based on focus
        if (focused) {
          term.setTextColor(colors.black);
          term.setBackgroundColor(colors.yellow);
        } else {
          term.setTextColor(colors.white);
          term.setBackgroundColor(colors.gray);
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
            term.setTextColor(colors.black);
            term.setBackgroundColor(colors.white);
          } else {
            term.setTextColor(colors.white);
            term.setBackgroundColor(colors.black);
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
          let displayText = value;
          
          if (value === "" && placeholder !== undefined) {
            displayText = placeholder;
            term.setTextColor(colors.gray);
          } else if (focused) {
            term.setTextColor(colors.black);
          } else {
            term.setTextColor(colors.white);
          }
          
          if (focused) {
            term.setBackgroundColor(colors.white);
          } else {
            term.setBackgroundColor(colors.black);
          }
          
          term.setCursorPos(x, y);
          // Pad or truncate to fit width
          if (displayText.length > width) {
            displayText = displayText.substring(0, width);
          } else {
            displayText = displayText.padEnd(width, " ");
          }
          term.write(displayText);
        }
        break;
      }
      
      case "div":
      case "form":
      case "for":
      case "show": {
        // Container elements don't draw themselves, just their children
        break;
      }
      
      case "fragment": {
        // Fragment with text content
        if (node.textContent !== undefined) {
          const text = typeof node.textContent === "function" 
            ? (node.textContent)() 
            : node.textContent;
          
          term.setTextColor(colors.white);
          term.setBackgroundColor(colors.black);
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
 */
export function render(node: UIObject, focusedNode?: UIObject): void {
  // Draw this node
  const isFocused = node === focusedNode;
  drawNode(node, isFocused);
  
  // Recursively draw children
  for (const child of node.children) {
    render(child, focusedNode);
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
