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
  /** Width - can be a number (fixed), "full" (100% of parent), or "screen" (terminal width) */
  width?: number | "full" | "screen";
  /** Height - can be a number (fixed), "full" (100% of parent), or "screen" (terminal height) */
  height?: number | "full" | "screen";
}

/**
 * Scroll properties for scroll containers
 */
export interface ScrollProps {
  /** Current horizontal scroll position */
  scrollX: number;
  /** Current vertical scroll position */
  scrollY: number;
  /** Maximum horizontal scroll (content width - viewport width) */
  maxScrollX: number;
  /** Maximum vertical scroll (content height - viewport height) */
  maxScrollY: number;
  /** Content dimensions */
  contentWidth: number;
  contentHeight: number;
  /** Whether to show scrollbars */
  showScrollbar?: boolean;
  /** Viewport dimensions (visible area) */
  viewportWidth: number;
  viewportHeight: number;
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
  | "switch"
  | "match"
  | "fragment"
  | "scroll-container";

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

  /** For scroll containers - scroll state */
  scrollProps?: ScrollProps;

  constructor(
    type: UIObjectType,
    props: Record<string, unknown> = {},
    children: UIObject[] = [],
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

    // Initialize scroll properties for scroll containers
    if (type === "scroll-container") {
      this.scrollProps = {
        scrollX: 0,
        scrollY: 0,
        maxScrollX: 0,
        maxScrollY: 0,
        contentWidth: 0,
        contentHeight: 0,
        showScrollbar: props.showScrollbar !== false,
        viewportWidth: (props.width as number) ?? 10,
        viewportHeight: (props.height as number) ?? 10,
      };
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
      white: colors.white,
      orange: colors.orange,
      magenta: colors.magenta,
      lightBlue: colors.lightBlue,
      yellow: colors.yellow,
      lime: colors.lime,
      pink: colors.pink,
      gray: colors.gray,
      lightGray: colors.lightGray,
      cyan: colors.cyan,
      purple: colors.purple,
      blue: colors.blue,
      brown: colors.brown,
      green: colors.green,
      red: colors.red,
      black: colors.black,
    };

    return colorMap[colorName];
  }

  /**
   * Parse CSS-like class string into layout and style properties
   */
  private parseClassNames(): void {
    const className = this.props.class as string | undefined;
    if (className === undefined) return;

    const classes = className.split(" ").filter((c) => c.length > 0);

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

      // Width sizing (w-<size>)
      else if (cls.startsWith("w-")) {
        const sizeValue = cls.substring(2); // Remove "w-" prefix
        if (sizeValue === "full") {
          this.styleProps.width = "full";
        } else if (sizeValue === "screen") {
          this.styleProps.width = "screen";
        } else {
          const numValue = tonumber(sizeValue);
          if (numValue !== undefined) {
            this.styleProps.width = numValue;
          }
        }
      }

      // Height sizing (h-<size>)
      else if (cls.startsWith("h-")) {
        const sizeValue = cls.substring(2); // Remove "h-" prefix
        if (sizeValue === "full") {
          this.styleProps.height = "full";
        } else if (sizeValue === "screen") {
          this.styleProps.height = "screen";
        } else {
          const numValue = tonumber(sizeValue);
          if (numValue !== undefined) {
            this.styleProps.height = numValue;
          }
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
      if (
        typeof key === "string" &&
        key.startsWith("on") &&
        typeof value === "function"
      ) {
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

  /**
   * Scroll the container by the given amount
   * @param deltaX - Horizontal scroll delta
   * @param deltaY - Vertical scroll delta
   */
  scrollBy(deltaX: number, deltaY: number): void {
    if (this.type !== "scroll-container" || !this.scrollProps) return;

    const newScrollX = Math.max(
      0,
      Math.min(this.scrollProps.maxScrollX, this.scrollProps.scrollX + deltaX),
    );
    const newScrollY = Math.max(
      0,
      Math.min(this.scrollProps.maxScrollY, this.scrollProps.scrollY + deltaY),
    );

    this.scrollProps.scrollX = newScrollX;
    this.scrollProps.scrollY = newScrollY;
  }

  /**
   * Scroll to a specific position
   * @param x - Horizontal scroll position
   * @param y - Vertical scroll position
   */
  scrollTo(x: number, y: number): void {
    if (this.type !== "scroll-container" || !this.scrollProps) return;

    this.scrollProps.scrollX = Math.max(
      0,
      Math.min(this.scrollProps.maxScrollX, x),
    );
    this.scrollProps.scrollY = Math.max(
      0,
      Math.min(this.scrollProps.maxScrollY, y),
    );
  }

  /**
   * Update scroll bounds based on content size
   * @param contentWidth - Total content width
   * @param contentHeight - Total content height
   */
  updateScrollBounds(contentWidth: number, contentHeight: number): void {
    if (this.type !== "scroll-container" || !this.scrollProps) return;

    this.scrollProps.contentWidth = contentWidth;
    this.scrollProps.contentHeight = contentHeight;
    this.scrollProps.maxScrollX = Math.max(
      0,
      contentWidth - this.scrollProps.viewportWidth,
    );
    this.scrollProps.maxScrollY = Math.max(
      0,
      contentHeight - this.scrollProps.viewportHeight,
    );

    // Clamp current scroll position to new bounds
    this.scrollProps.scrollX = Math.max(
      0,
      Math.min(this.scrollProps.maxScrollX, this.scrollProps.scrollX),
    );
    this.scrollProps.scrollY = Math.max(
      0,
      Math.min(this.scrollProps.maxScrollY, this.scrollProps.scrollY),
    );
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
