/**
 * New UIObject system for functional component-based UI
 * Represents a node in the UI tree
 */

import { Accessor } from "./reactivity";

/**
 * Layout properties for flexbox layout
 */
export interface LayoutProps {
  /** Flexbox direction */
  flexDirection?: "row" | "column";
  /** Justify content (main axis alignment) */
  justifyContent?: "start" | "center" | "end" | "between";
  /** Align items (cross axis alignment) */
  alignItems?: "start" | "center" | "end";
}

/**
 * Style properties for colors and appearance
 */
export interface StyleProps {
  /** Text color */
  textColor?: number;
  /** Background color */
  backgroundColor?: number;
}

/**
 * Computed layout result after flexbox calculation
 */
export interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Base props that all components can accept
 */
export interface BaseProps {
  /** CSS-like class names for layout (e.g., "flex flex-col") */
  class?: string;
}

/**
 * UIObject node type
 */
export type UIObjectType = 
  | "div" 
  | "label" 
  | "button" 
  | "input" 
  | "form"
  | "h1"
  | "h2"
  | "h3"
  | "for"
  | "show"
  | "fragment";

/**
 * UIObject represents a node in the UI tree
 * It can be a component, text, or a control flow element
 */
export class UIObject {
  /** Type of the UI object */
  type: UIObjectType;
  
  /** Props passed to the component */
  props: Record<string, unknown>;
  
  /** Children UI objects */
  children: UIObject[];
  
  /** Parent UI object */
  parent?: UIObject;
  
  /** Computed layout after flexbox calculation */
  layout?: ComputedLayout;
  
  /** Layout properties parsed from class string */
  layoutProps: LayoutProps;
  
  /** Style properties parsed from class string */
  styleProps: StyleProps;
  
  /** Whether this component is currently mounted */
  mounted: boolean;
  
  /** Cleanup functions to call when unmounting */
  cleanupFns: (() => void)[];
  
  /** For text nodes - the text content (can be reactive) */
  textContent?: string | Accessor<string>;
  
  /** Event handlers */
  handlers: Record<string, ((...args: unknown[]) => void) | undefined>;
  
  /** For input text components - cursor position */
  cursorPos?: number;

  constructor(
    type: UIObjectType,
    props: Record<string, unknown> = {},
    children: UIObject[] = []
  ) {
    this.type = type;
    this.props = props;
    this.children = children;
    this.layoutProps = {};
    this.styleProps = {};
    this.mounted = false;
    this.cleanupFns = [];
    this.handlers = {};
    
    // Parse layout and styles from class prop
    this.parseClassNames();
    
    // Extract event handlers
    this.extractHandlers();
    
    // Initialize cursor position for text inputs
    if (type === "input" && props.type !== "checkbox") {
      this.cursorPos = 0;
    }
  }

  /**
   * Map color name to ComputerCraft colors API value
   * 
   * @param colorName - The color name from class (e.g., "white", "red")
   * @returns The color value from colors API, or undefined if invalid
   */
  private parseColor(colorName: string): number | undefined {
    const colorMap: Record<string, number> = {
      "white": colors.white,
      "orange": colors.orange,
      "magenta": colors.magenta,
      "lightBlue": colors.lightBlue,
      "yellow": colors.yellow,
      "lime": colors.lime,
      "pink": colors.pink,
      "gray": colors.gray,
      "lightGray": colors.lightGray,
      "cyan": colors.cyan,
      "purple": colors.purple,
      "blue": colors.blue,
      "brown": colors.brown,
      "green": colors.green,
      "red": colors.red,
      "black": colors.black,
    };
    
    return colorMap[colorName];
  }

  /**
   * Parse CSS-like class string into layout and style properties
   */
  private parseClassNames(): void {
    const className = this.props.class as string | undefined;
    if (className === undefined) return;

    const classes = className.split(" ").filter(c => c.length > 0);
    
    for (const cls of classes) {
      // Flex direction
      if (cls === "flex-row") {
        this.layoutProps.flexDirection = "row";
      } else if (cls === "flex-col") {
        this.layoutProps.flexDirection = "column";
      }
      
      // Justify content
      else if (cls === "justify-start") {
        this.layoutProps.justifyContent = "start";
      } else if (cls === "justify-center") {
        this.layoutProps.justifyContent = "center";
      } else if (cls === "justify-end") {
        this.layoutProps.justifyContent = "end";
      } else if (cls === "justify-between") {
        this.layoutProps.justifyContent = "between";
      }
      
      // Align items
      else if (cls === "items-start") {
        this.layoutProps.alignItems = "start";
      } else if (cls === "items-center") {
        this.layoutProps.alignItems = "center";
      } else if (cls === "items-end") {
        this.layoutProps.alignItems = "end";
      }
      
      // Text color (text-<color>)
      else if (cls.startsWith("text-")) {
        const colorName = cls.substring(5); // Remove "text-" prefix
        const color = this.parseColor(colorName);
        if (color !== undefined) {
          this.styleProps.textColor = color;
        }
      }
      
      // Background color (bg-<color>)
      else if (cls.startsWith("bg-")) {
        const colorName = cls.substring(3); // Remove "bg-" prefix
        const color = this.parseColor(colorName);
        if (color !== undefined) {
          this.styleProps.backgroundColor = color;
        }
      }
    }
    
    // Set defaults
    if (this.type === "div") {
      this.layoutProps.flexDirection ??= "row";
    }
    this.layoutProps.justifyContent ??= "start";
    this.layoutProps.alignItems ??= "start";
  }

  /**
   * Extract event handlers from props
   */
  private extractHandlers(): void {
    for (const [key, value] of pairs(this.props)) {
      if (typeof key === "string" && key.startsWith("on") && typeof value === "function") {
        this.handlers[key] = value as (...args: unknown[]) => void;
      }
    }
  }

  /**
   * Add a child to this UI object
   */
  appendChild(child: UIObject): void {
    child.parent = this;
    this.children.push(child);
  }

  /**
   * Remove a child from this UI object
   */
  removeChild(child: UIObject): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = undefined;
    }
  }

  /**
   * Mount this component and all children
   */
  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    
    // Mount all children
    for (const child of this.children) {
      child.mount();
    }
  }

  /**
   * Unmount this component and run cleanup
   */
  unmount(): void {
    if (!this.mounted) return;
    this.mounted = false;
    
    // Unmount all children first
    for (const child of this.children) {
      child.unmount();
    }
    
    // Run cleanup functions
    for (const cleanup of this.cleanupFns) {
      try {
        cleanup();
      } catch (e) {
        printError(e);
      }
    }
    this.cleanupFns = [];
  }

  /**
   * Register a cleanup function to be called on unmount
   */
  onCleanup(fn: () => void): void {
    this.cleanupFns.push(fn);
  }
}

/**
 * Create a text node
 */
export function createTextNode(text: string | Accessor<string>): UIObject {
  const node = new UIObject("fragment", {}, []);
  node.textContent = text;
  return node;
}
