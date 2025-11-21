/**
 * Application class for managing the UI lifecycle
 */

import { UIObject } from "./UIObject";
import { calculateLayout } from "./layout";
import { render as renderTree, clearScreen } from "./renderer";
import { InputProps } from "./components";
import { Setter } from "./reactivity";
import { getStructLogger, Logger } from "@/lib/ccStructLog";
import { setLogger } from "./context";

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
    private logger: Logger;
    private cursorBlinkState = false;
    private lastBlinkTime = 0;
    private readonly BLINK_INTERVAL = 0.5; // seconds

    constructor() {
        const [width, height] = term.getSize();
        this.termWidth = width;
        this.termHeight = height;
        this.logger = getStructLogger("ccTUI");
        setLogger(this.logger);
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
            () => this.timerLoop(),
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
        renderTree(this.root, this.focusedNode, this.cursorBlinkState);
        this.logger.debug("renderFrame: Finished rendering tree.");
    }

    /**
     * Timer loop - handles cursor blinking
     */
    private timerLoop(): void {
        while (this.running) {
            const currentTime = os.clock();
            if (currentTime - this.lastBlinkTime >= this.BLINK_INTERVAL) {
                this.lastBlinkTime = currentTime;
                this.cursorBlinkState = !this.cursorBlinkState;

                // Only trigger render if we have a focused text input
                if (
                    this.focusedNode !== undefined &&
                    this.focusedNode.type === "input" &&
                    (this.focusedNode.props as InputProps).type !== "checkbox"
                ) {
                    this.needsRender = true;
                }
            }
            os.sleep(0.05);
        }
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
            } else if (eventType === "mouse_scroll") {
                this.logger.debug(
                    string.format(
                        "eventLoop: Mouse scroll detected at (%d, %d) direction %d",
                        eventData[1],
                        eventData[2],
                        eventData[0],
                    ),
                );
                this.handleMouseScroll(
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
                const type = (this.focusedNode.props as InputProps).type as
                    | string
                    | undefined;
                if (type === "checkbox") {
                    // Toggle checkbox
                    const onChangeProp = (this.focusedNode.props as InputProps)
                        .onChange;
                    const checkedProp = (this.focusedNode.props as InputProps)
                        .checked;

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
        } else if (
            this.focusedNode !== undefined &&
            this.focusedNode.type === "input"
        ) {
            // Handle text input key events
            const type = (this.focusedNode.props as InputProps).type as
                | string
                | undefined;
            if (type !== "checkbox") {
                this.handleTextInputKey(key);
            }
        }
    }

    /**
     * Handle keyboard events for text input
     */
    private handleTextInputKey(key: number): void {
        if (this.focusedNode === undefined) return;

        const valueProp = (this.focusedNode.props as InputProps).value;
        const onInputProp = (this.focusedNode.props as InputProps).onInput;

        if (
            typeof valueProp !== "function" ||
            typeof onInputProp !== "function"
        ) {
            return;
        }

        const currentValue = (valueProp as () => string)();
        const cursorPos = this.focusedNode.cursorPos ?? 0;

        if (key === keys.left) {
            // Move cursor left
            this.focusedNode.cursorPos = math.max(0, cursorPos - 1);
            this.needsRender = true;
        } else if (key === keys.right) {
            // Move cursor right
            this.focusedNode.cursorPos = math.min(
                currentValue.length,
                cursorPos + 1,
            );
            this.needsRender = true;
        } else if (key === keys.backspace) {
            // Delete character before cursor
            if (cursorPos > 0) {
                const newValue =
                    currentValue.substring(0, cursorPos - 1) +
                    currentValue.substring(cursorPos);
                (onInputProp as (v: string) => void)(newValue);
                this.focusedNode.cursorPos = cursorPos - 1;
                this.needsRender = true;
            }
        } else if (key === keys.delete) {
            // Delete character after cursor
            if (cursorPos < currentValue.length) {
                const newValue =
                    currentValue.substring(0, cursorPos) +
                    currentValue.substring(cursorPos + 1);
                (onInputProp as (v: string) => void)(newValue);
                this.needsRender = true;
            }
        }
    }

    /**
     * Handle character input events
     */
    private handleCharEvent(char: string): void {
        if (
            this.focusedNode !== undefined &&
            this.focusedNode.type === "input"
        ) {
            const type = (this.focusedNode.props as InputProps).type;
            if (type !== "checkbox") {
                // Insert character at cursor position
                const onInputProp = (this.focusedNode.props as InputProps)
                    .onInput;
                const valueProp = (this.focusedNode.props as InputProps).value;

                if (
                    typeof onInputProp === "function" &&
                    typeof valueProp === "function"
                ) {
                    const currentValue = (valueProp as () => string)();
                    const cursorPos = this.focusedNode.cursorPos ?? 0;
                    const newValue =
                        currentValue.substring(0, cursorPos) +
                        char +
                        currentValue.substring(cursorPos);
                    (onInputProp as (v: string) => void)(newValue);
                    this.focusedNode.cursorPos = cursorPos + 1;
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
                string.format(
                    "handleMouseClick: Found node of type %s.",
                    clicked.type,
                ),
            );
            // Set focus
            if (
                this.focusedNode !== undefined &&
                typeof this.focusedNode.props.onFocusChanged === "function"
            ) {
                const onFocusChanged = this.focusedNode.props
                    .onFocusChanged as Setter<boolean>;
                onFocusChanged(false);
            }
            this.focusedNode = clicked;
            if (typeof clicked.props.onFocusChanged === "function") {
                const onFocusChanged = clicked.props
                    .onFocusChanged as Setter<boolean>;
                onFocusChanged(true);
            }

            // Initialize cursor position for text inputs on focus
            if (
                clicked.type === "input" &&
                (clicked.props as InputProps).type !== "checkbox"
            ) {
                const valueProp = (clicked.props as InputProps).value;
                if (typeof valueProp === "function") {
                    const currentValue = (valueProp as () => string)();
                    clicked.cursorPos = currentValue.length;
                }
            }

            // Trigger click handler
            if (clicked.type === "button") {
                const onClick = clicked.handlers.onClick;
                if (onClick) {
                    this.logger.debug(
                        "handleMouseClick: onClick handler found, executing.",
                    );
                    (onClick as () => void)();
                    this.logger.debug(
                        "handleMouseClick: onClick handler finished.",
                    );
                    this.needsRender = true;
                }
            } else if (clicked.type === "input") {
                const type = (clicked.props as InputProps).type as
                    | string
                    | undefined;
                if (type === "checkbox") {
                    const onChangeProp = (clicked.props as InputProps).onChange;
                    const checkedProp = (clicked.props as InputProps).checked;

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

            this.needsRender = true;
        } else {
            this.logger.debug(
                "handleMouseClick: No node found at click position.",
            );
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
                    this.logger.debug(
                        "findNodeAt: Node is interactive, returning.",
                    );
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

        if (
            this.focusedNode !== undefined &&
            typeof this.focusedNode.props.onFocusChanged === "function"
        ) {
            const onFocusChanged = this.focusedNode.props
                .onFocusChanged as Setter<boolean>;
            onFocusChanged(false);
        }
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
     * Find the scrollable UI node at a specific screen position
     */
    private findScrollableNodeAt(
        node: UIObject,
        x: number,
        y: number,
    ): UIObject | undefined {
        // Check children first (depth-first)
        for (const child of node.children) {
            const found = this.findScrollableNodeAt(child, x, y);
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
                // Only return scrollable elements
                if (node.type === "scroll-container") {
                    this.logger.debug(
                        "findNodeAt: Node is scrollable, returning.",
                    );
                    return node;
                }
            }
        }

        return undefined;
    }

    /**
     * Handle mouse scroll events
     */
    private handleMouseScroll(direction: number, x: number, y: number): void {
        if (this.root === undefined) return;

        // Find which element was scrolled over
        const scrollContainer = this.findScrollableNodeAt(this.root, x, y);

        if (scrollContainer?.scrollProps) {
            // Scroll by 1 line per wheel step
            const scrollAmount = direction * 1;
            scrollContainer.scrollBy(0, scrollAmount);
            this.needsRender = true;

            this.logger.debug(
                string.format(
                    "handleMouseScroll: Scrolled container by %d, new position: (%d, %d)",
                    scrollAmount,
                    scrollContainer.scrollProps.scrollX,
                    scrollContainer.scrollProps.scrollY,
                ),
            );
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
