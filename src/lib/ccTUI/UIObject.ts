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
  
  /** Whether this component is currently mounted */
  mounted: boolean;
  
  /** Cleanup functions to call when unmounting */
  cleanupFns: (() => void)[];
  
  /** For text nodes - the text content (can be reactive) */
  textContent?: string | Accessor<string>;
  
  /** Event handlers */
  handlers: Record<string, ((...args: unknown[]) => void) | undefined>;

  constructor(
    type: UIObjectType,
    props: Record<string, unknown> = {},
    children: UIObject[] = []
  ) {
    this.type = type;
    this.props = props;
    this.children = children;
    this.layoutProps = {};
    this.mounted = false;
    this.cleanupFns = [];
    this.handlers = {};
    
    // Parse layout from class prop
    this.parseLayout();
    
    // Extract event handlers
    this.extractHandlers();
  }

  /**
   * Parse CSS-like class string into layout properties
   */
  private parseLayout(): void {
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
