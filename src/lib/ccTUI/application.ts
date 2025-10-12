/**
 * Application class for managing the UI lifecycle
 */

import { UIObject } from "./UIObject";
import { calculateLayout } from "./layout";
import { render as renderTree, clearScreen } from "./renderer";
import { CCLog } from "../ccLog";

/**
 * Main application class
 * Manages the root UI component and handles rendering
 */
export class Application {
  private root?: UIObject;
  private running = false;
  private needsRender = true;
  private focusedNode?: UIObject;
  private termWidth: number;
  private termHeight: number;
  private logger: CCLog;

  constructor() {
    const [width, height] = term.getSize();
    this.termWidth = width;
    this.termHeight = height;
    this.logger = new CCLog("tui_debug.log", false);
    this.logger.debug("Application constructed.");
  }

  /**
   * Set the root component for the application
   *
   * @param rootComponent - The root UI component
   */
  setRoot(rootComponent: UIObject): void {
    // Unmount old root if it exists
    if (this.root !== undefined) {
      this.root.unmount();
    }

    this.root = rootComponent;
    this.root.mount();
    this.needsRender = true;
  }

  /**
   * Request a re-render on the next frame
   */
  requestRender(): void {
    this.needsRender = true;
  }

  /**
   * Run the application event loop
   */
  run(): void {
    if (this.root === undefined) {
      error(
        "Cannot run application without a root component. Call setRoot() first.",
      );
    }

    this.running = true;
    term.setCursorBlink(false);
    clearScreen();

    // Initial render
    this.logger.debug("Initial renderFrame call.");
    this.renderFrame();

    // Main event loop
    parallel.waitForAll(
      () => this.renderLoop(),
      () => this.eventLoop(),
    );
  }

  /**
   * Stop the application
   */
  stop(): void {
    this.logger.debug("Application stopping.");
    this.running = false;

    if (this.root !== undefined) {
      this.root.unmount();
    }

    this.logger.close();
    clearScreen();
  }

  /**
   * Render loop - continuously renders when needed
   */
  private renderLoop(): void {
    while (this.running) {
      if (this.needsRender) {
        this.logger.debug(
          "renderLoop: needsRender is true, calling renderFrame.",
        );
        this.needsRender = false;
        this.renderFrame();
      }
      os.sleep(0.05);
    }
  }

  /**
   * Render a single frame
   */
  private renderFrame(): void {
    if (this.root === undefined) return;
    this.logger.debug("renderFrame: Calculating layout.");
    // Calculate layout
    calculateLayout(this.root, this.termWidth, this.termHeight, 1, 1);

    // Clear screen
    clearScreen();

    // Render the tree
    this.logger.debug("renderFrame: Rendering tree.");
    renderTree(this.root, this.focusedNode);
    this.logger.debug("renderFrame: Finished rendering tree.");
  }

  /**
   * Event loop - handles user input
   */
  private eventLoop(): void {
    while (this.running) {
      const [eventType, ...eventData] = os.pullEvent();

      if (eventType === "key") {
        this.handleKeyEvent(eventData[0] as number);
      } else if (eventType === "char") {
        this.handleCharEvent(eventData[0] as string);
      } else if (eventType === "mouse_click") {
        this.logger.debug(
          string.format(
            "eventLoop: Mouse click detected at (%d, %d)",
            eventData[1],
            eventData[2],
          ),
        );
        this.handleMouseClick(
          eventData[0] as number,
          eventData[1] as number,
          eventData[2] as number,
        );
      }
    }
  }

  /**
   * Handle keyboard key events
   */
  private handleKeyEvent(key: number): void {
    if (key === keys.tab) {
      // Focus next element
      this.focusNext();
      this.needsRender = true;
    } else if (key === keys.enter && this.focusedNode !== undefined) {
      // Trigger action on focused element
      if (this.focusedNode.type === "button") {
        const onClick = this.focusedNode.handlers.onClick;
        if (onClick) {
          (onClick as () => void)();
          this.needsRender = true;
        }
      } else if (this.focusedNode.type === "input") {
        const type = this.focusedNode.props.type as string | undefined;
        if (type === "checkbox") {
          // Toggle checkbox
          const onChangeProp = this.focusedNode.props.onChange;
          const checkedProp = this.focusedNode.props.checked;

          if (
            typeof onChangeProp === "function" &&
            typeof checkedProp === "function"
          ) {
            const currentValue = (checkedProp as () => boolean)();
            (onChangeProp as (v: boolean) => void)(!currentValue);
            this.needsRender = true;
          }
        }
      }
    }
  }

  /**
   * Handle character input events
   */
  private handleCharEvent(char: string): void {
    if (this.focusedNode !== undefined && this.focusedNode.type === "input") {
      const type = this.focusedNode.props.type as string | undefined;
      if (type !== "checkbox") {
        // Add character to text input
        const onInputProp = this.focusedNode.props.onInput;
        const valueProp = this.focusedNode.props.value;

        if (
          typeof onInputProp === "function" &&
          typeof valueProp === "function"
        ) {
          const currentValue = (valueProp as () => string)();
          (onInputProp as (v: string) => void)(currentValue + char);
          this.needsRender = true;
        }
      }
    }
  }

  /**
   * Handle mouse click events
   */
  private handleMouseClick(button: number, x: number, y: number): void {
    if (button !== 1 || this.root === undefined) return;

    this.logger.debug("handleMouseClick: Finding node.");
    // Find which element was clicked
    const clicked = this.findNodeAt(this.root, x, y);

    if (clicked !== undefined) {
      this.logger.debug(
        string.format("handleMouseClick: Found node of type %s.", clicked.type),
      );
      // Set focus
      this.focusedNode = clicked;

      // Trigger click handler
      if (clicked.type === "button") {
        const onClick = clicked.handlers.onClick;
        if (onClick) {
          this.logger.debug(
            "handleMouseClick: onClick handler found, executing.",
          );
          (onClick as () => void)();
          this.logger.debug("handleMouseClick: onClick handler finished.");
          this.needsRender = true;
        }
      } else if (clicked.type === "input") {
        const type = clicked.props.type as string | undefined;
        if (type === "checkbox") {
          const onChangeProp = clicked.props.onChange;
          const checkedProp = clicked.props.checked;

          if (
            typeof onChangeProp === "function" &&
            typeof checkedProp === "function"
          ) {
            const currentValue = (checkedProp as () => boolean)();
            (onChangeProp as (v: boolean) => void)(!currentValue);
            this.needsRender = true;
          }
        }
      }
    } else {
      this.logger.debug("handleMouseClick: No node found at click position.");
    }
  }

  /**
   * Find the UI node at a specific screen position
   */
  private findNodeAt(
    node: UIObject,
    x: number,
    y: number,
  ): UIObject | undefined {
    // Check children first (depth-first)
    for (const child of node.children) {
      const found = this.findNodeAt(child, x, y);
      if (found !== undefined) {
        return found;
      }
    }

    // Check this node
    if (node.layout !== undefined) {
      const { x: nx, y: ny, width, height } = node.layout;
      const hit = x >= nx && x < nx + width && y >= ny && y < ny + height;
      if (hit) {
        this.logger.debug(
          string.format(
            "findNodeAt: Hit test TRUE for %s at (%d, %d)",
            node.type,
            nx,
            ny,
          ),
        );
        // Only return interactive elements
        if (node.type === "button" || node.type === "input") {
          this.logger.debug("findNodeAt: Node is interactive, returning.");
          return node;
        }
      }
    }

    return undefined;
  }

  /**
   * Focus the next interactive element
   */
  private focusNext(): void {
    if (this.root === undefined) return;

    const interactive = this.collectInteractive(this.root);

    if (interactive.length === 0) {
      this.focusedNode = undefined;
      return;
    }

    if (this.focusedNode === undefined) {
      this.focusedNode = interactive[0];
    } else {
      const currentIndex = interactive.indexOf(this.focusedNode);
      const nextIndex = (currentIndex + 1) % interactive.length;
      this.focusedNode = interactive[nextIndex];
    }
  }

  /**
   * Collect all interactive elements in the tree
   */
  private collectInteractive(node: UIObject): UIObject[] {
    const result: UIObject[] = [];

    if (node.type === "button" || node.type === "input") {
      result.push(node);
    }

    for (const child of node.children) {
      result.push(...this.collectInteractive(child));
    }

    return result;
  }
}

/**
 * Convenience function to create and run an application
 *
 * @param rootFn - Function that returns the root component
 *
 * @example
 * ```typescript
 * render(() => {
 *   const [count, setCount] = createSignal(0);
 *   return div({ class: "flex flex-col" },
 *     label({}, () => `Count: ${count()}`),
 *     button({ onClick: () => setCount(count() + 1) }, "Increment")
 *   );
 * });
 * ```
 */
export function render(rootFn: () => UIObject): void {
  const app = new Application();

  // Create the root component
  const root = rootFn();
  app.setRoot(root);

  try {
    app.run();
  } finally {
    app.stop();
  }
}
