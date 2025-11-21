/**
 * Scroll container component for handling scrollable content
 */

import { UIObject } from "./UIObject";
import { createSignal, createEffect } from "./reactivity";

/**
 * Props for ScrollContainer component
 */
export type ScrollContainerProps = {
    /** Maximum width of the scroll container viewport */
    width?: number;
    /** Maximum height of the scroll container viewport */
    height?: number;
    /** Whether to show scrollbars (default: true) */
    showScrollbar?: boolean;
    /** CSS-like class names for styling */
    class?: string;
    /** Callback when scroll position changes */
    onScroll?: (scrollX: number, scrollY: number) => void;
} & Record<string, unknown>;

/**
 * ScrollContainer component - provides scrollable viewport for content
 * When content exceeds the container size, scrollbars appear and mouse wheel scrolling is enabled
 *
 * @param props - Props containing dimensions and scroll options
 * @param content - Content to be scrolled
 * @returns UIObject representing the scroll container
 *
 * @example
 * ```typescript
 * const [items, setItems] = createStore<string[]>([]);
 *
 * ScrollContainer(
 *   { width: 20, height: 10, showScrollbar: true },
 *   div({ class: "flex flex-col" },
 *     For({ each: () => items },
 *       (item, i) => div({}, item)
 *     )
 *   )
 * )
 * ```
 */
export function ScrollContainer(
    props: ScrollContainerProps,
    content: UIObject,
): UIObject {
    const container = new UIObject("scroll-container", props, [content]);
    content.parent = container;

    // Set up scroll properties from props
    if (container.scrollProps) {
        container.scrollProps.viewportWidth = props.width ?? 10;
        container.scrollProps.viewportHeight = props.height ?? 10;
        container.scrollProps.showScrollbar = props.showScrollbar !== false;
    }

    // Create reactive signals for scroll position
    const [scrollX, setScrollX] = createSignal(0);
    const [scrollY, setScrollY] = createSignal(0);

    // Update scroll position when signals change
    createEffect(() => {
        const x = scrollX();
        const y = scrollY();
        container.scrollTo(x, y);

        // Call onScroll callback if provided
        if (props.onScroll && typeof props.onScroll === "function") {
            props.onScroll(x, y);
        }
    });

    // Override scroll methods to update signals
    const originalScrollBy = container.scrollBy.bind(container);
    const originalScrollTo = container.scrollTo.bind(container);

    container.scrollBy = (deltaX: number, deltaY: number): void => {
        originalScrollBy(deltaX, deltaY);
        if (container.scrollProps) {
            setScrollX(container.scrollProps.scrollX);
            setScrollY(container.scrollProps.scrollY);
        }
    };

    container.scrollTo = (x: number, y: number): void => {
        originalScrollTo(x, y);
        if (container.scrollProps) {
            setScrollX(container.scrollProps.scrollX);
            setScrollY(container.scrollProps.scrollY);
        }
    };

    // Expose scroll control methods on the container
    const containerWithMethods = container as UIObject & {
        getScrollX: () => number;
        getScrollY: () => number;
        setScrollX: (value: number) => void;
        setScrollY: (value: number) => void;
    };

    containerWithMethods.getScrollX = () => scrollX();
    containerWithMethods.getScrollY = () => scrollY();
    containerWithMethods.setScrollX = (value: number) => setScrollX(value);
    containerWithMethods.setScrollY = (value: number) => setScrollY(value);

    return container;
}

/**
 * Check if a UI node is a scroll container
 * @param node - The UI node to check
 * @returns True if the node is a scroll container
 */
export function isScrollContainer(node: UIObject): boolean {
    return node.type === "scroll-container";
}

/**
 * Find the nearest scroll container ancestor of a node
 * @param node - The node to start searching from
 * @returns The nearest scroll container, or undefined if none found
 */
export function findScrollContainer(node: UIObject): UIObject | undefined {
    let current = node.parent;
    while (current) {
        if (isScrollContainer(current)) {
            return current;
        }
        current = current.parent;
    }
    return undefined;
}

/**
 * Check if a point is within the visible area of a scroll container
 * @param container - The scroll container
 * @param x - X coordinate relative to container
 * @param y - Y coordinate relative to container
 * @returns True if the point is visible
 */
export function isPointVisible(
    container: UIObject,
    x: number,
    y: number,
): boolean {
    if (!isScrollContainer(container) || !container.scrollProps) {
        return true;
    }

    const { scrollX, scrollY, viewportWidth, viewportHeight } =
        container.scrollProps;

    return (
        x >= scrollX &&
        x < scrollX + viewportWidth &&
        y >= scrollY &&
        y < scrollY + viewportHeight
    );
}

/**
 * Convert screen coordinates to scroll container content coordinates
 * @param container - The scroll container
 * @param screenX - Screen X coordinate
 * @param screenY - Screen Y coordinate
 * @returns Content coordinates, or undefined if not within container
 */
export function screenToContent(
    container: UIObject,
    screenX: number,
    screenY: number,
): { x: number; y: number } | undefined {
    if (
        !isScrollContainer(container) ||
        !container.layout ||
        !container.scrollProps
    ) {
        return undefined;
    }

    const { x: containerX, y: containerY } = container.layout;
    const { scrollX, scrollY } = container.scrollProps;

    // Check if point is within container bounds
    const relativeX = screenX - containerX;
    const relativeY = screenY - containerY;

    if (
        relativeX < 0 ||
        relativeY < 0 ||
        relativeX >= container.scrollProps.viewportWidth ||
        relativeY >= container.scrollProps.viewportHeight
    ) {
        return undefined;
    }

    return {
        x: relativeX + scrollX,
        y: relativeY + scrollY,
    };
}
