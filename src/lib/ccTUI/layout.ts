/**
 * Flexbox layout engine
 * Calculates positions and sizes for UI elements based on flexbox rules
 */

import { UIObject } from "./UIObject";

/**
 * Get the terminal dimensions
 * @returns Terminal width and height
 */
function getTerminalSize(): { width: number; height: number } {
  const [w, h] = term.getSize();
  return { width: w, height: h };
}

/**
 * Measure the natural size of a UI element
 * This determines how much space an element wants to take up
 *
 * @param node - The UI node to measure
 * @param parentWidth - Available width from parent (for percentage calculations)
 * @param parentHeight - Available height from parent (for percentage calculations)
 * @returns Width and height of the element
 */
function measureNode(
  node: UIObject,
  parentWidth?: number,
  parentHeight?: number,
): { width: number; height: number } {
  // Get text content if it exists
  const getTextContent = (): string => {
    if (node.textContent !== undefined) {
      if (typeof node.textContent === "function") {
        return node.textContent();
      }
      return node.textContent;
    }

    // For nodes with text children, get their content
    if (
      node.children.length > 0 &&
      node.children[0].textContent !== undefined
    ) {
      const child = node.children[0];
      if (typeof child.textContent === "function") {
        return child.textContent();
      }
      return child.textContent!;
    }

    return "";
  };

  // Check for explicit size styling first
  let measuredWidth: number | undefined;
  let measuredHeight: number | undefined;

  // Handle width styling
  if (node.styleProps.width !== undefined) {
    if (node.styleProps.width === "screen") {
      const termSize = getTerminalSize();
      measuredWidth = termSize.width;
    } else if (node.styleProps.width === "full" && parentWidth !== undefined) {
      measuredWidth = parentWidth;
    } else if (typeof node.styleProps.width === "number") {
      measuredWidth = node.styleProps.width;
    }
  }

  // Handle height styling
  if (node.styleProps.height !== undefined) {
    if (node.styleProps.height === "screen") {
      const termSize = getTerminalSize();
      measuredHeight = termSize.height;
    } else if (
      node.styleProps.height === "full" &&
      parentHeight !== undefined
    ) {
      measuredHeight = parentHeight;
    } else if (typeof node.styleProps.height === "number") {
      measuredHeight = node.styleProps.height;
    }
  }

  switch (node.type) {
    case "label":
    case "h1":
    case "h2":
    case "h3": {
      const text = getTextContent();
      const naturalWidth = text.length;
      const naturalHeight = 1;
      return {
        width: measuredWidth ?? naturalWidth,
        height: measuredHeight ?? naturalHeight,
      };
    }

    case "button": {
      const text = getTextContent();
      // Buttons have brackets around them: [text]
      const naturalWidth = text.length + 2;
      const naturalHeight = 1;
      return {
        width: measuredWidth ?? naturalWidth,
        height: measuredHeight ?? naturalHeight,
      };
    }

    case "input": {
      const type = node.props.type as string | undefined;
      if (type === "checkbox") {
        const naturalWidth = 3; // [X] or [ ]
        const naturalHeight = 1;
        return {
          width: measuredWidth ?? naturalWidth,
          height: measuredHeight ?? naturalHeight,
        };
      }
      // Text input - use a default width or from props
      const defaultWidth = (node.props.width as number | undefined) ?? 20;
      const naturalHeight = 1;
      return {
        width: measuredWidth ?? defaultWidth,
        height: measuredHeight ?? naturalHeight,
      };
    }

    case "div":
    case "form":
    case "for":
    case "show":
    case "switch":
    case "match":
    case "fragment":
    case "scroll-container": {
      // Container elements size based on their children
      let totalWidth = 0;
      let totalHeight = 0;

      if (node.children.length === 0) {
        const naturalWidth = 0;
        const naturalHeight = 0;
        return {
          width: measuredWidth ?? naturalWidth,
          height: measuredHeight ?? naturalHeight,
        };
      }

      const direction = node.layoutProps.flexDirection ?? "row";
      const isFlex = node.type === "div" || node.type === "form";
      const gap = isFlex ? 1 : 0;

      // For scroll containers, calculate content size and update scroll bounds
      if (node.type === "scroll-container" && node.scrollProps) {
        // Calculate actual content size without viewport constraints
        const childParentWidth = undefined; // No width constraint for content measurement
        const childParentHeight = undefined; // No height constraint for content measurement

        if (direction === "row") {
          for (const child of node.children) {
            const childSize = measureNode(
              child,
              childParentWidth,
              childParentHeight,
            );
            totalWidth += childSize.width;
            totalHeight = math.max(totalHeight, childSize.height);
          }
          if (node.children.length > 1) {
            totalWidth += gap * (node.children.length - 1);
          }
        } else {
          for (const child of node.children) {
            const childSize = measureNode(
              child,
              childParentWidth,
              childParentHeight,
            );
            totalWidth = math.max(totalWidth, childSize.width);
            totalHeight += childSize.height;
          }
          if (node.children.length > 1) {
            totalHeight += gap * (node.children.length - 1);
          }
        }

        // Update scroll bounds with actual content size
        node.updateScrollBounds(totalWidth, totalHeight);

        // Return viewport size as the container size
        return {
          width: measuredWidth ?? node.scrollProps.viewportWidth,
          height: measuredHeight ?? node.scrollProps.viewportHeight,
        };
      }

      // Calculate available space for children (non-scroll containers)
      const childParentWidth = measuredWidth ?? parentWidth;
      const childParentHeight = measuredHeight ?? parentHeight;

      if (direction === "row") {
        // In row direction, width is sum of children, height is max
        for (const child of node.children) {
          const childSize = measureNode(
            child,
            childParentWidth,
            childParentHeight,
          );
          totalWidth += childSize.width;
          totalHeight = math.max(totalHeight, childSize.height);
        }
        if (node.children.length > 1) {
          totalWidth += gap * (node.children.length - 1);
        }
      } else {
        // In column direction, height is sum of children, width is max
        for (const child of node.children) {
          const childSize = measureNode(
            child,
            childParentWidth,
            childParentHeight,
          );
          totalWidth = math.max(totalWidth, childSize.width);
          totalHeight += childSize.height;
        }
        if (node.children.length > 1) {
          totalHeight += gap * (node.children.length - 1);
        }
      }

      return {
        width: measuredWidth ?? totalWidth,
        height: measuredHeight ?? totalHeight,
      };
    }

    default:
      return {
        width: measuredWidth ?? 0,
        height: measuredHeight ?? 0,
      };
  }
}

/**
 * Apply flexbox layout algorithm to a container and its children
 *
 * @param node - The container node
 * @param availableWidth - Available width for layout
 * @param availableHeight - Available height for layout
 * @param startX - Starting X position
 * @param startY - Starting Y position
 */
export function calculateLayout(
  node: UIObject,
  availableWidth: number,
  availableHeight: number,
  startX = 1,
  startY = 1,
): void {
  // Set this node's layout
  node.layout = {
    x: startX,
    y: startY,
    width: availableWidth,
    height: availableHeight,
  };

  if (node.children.length === 0) {
    return;
  }

  const direction = node.layoutProps.flexDirection ?? "row";
  const justify = node.layoutProps.justifyContent ?? "start";
  const align = node.layoutProps.alignItems ?? "start";

  const isFlex = node.type === "div" || node.type === "form";
  const gap = isFlex ? 1 : 0;

  // Handle scroll container layout
  if (node.type === "scroll-container" && node.scrollProps) {
    // For scroll containers, position children based on scroll offset
    const scrollOffsetX = -node.scrollProps.scrollX;
    const scrollOffsetY = -node.scrollProps.scrollY;

    for (const child of node.children) {
      // Calculate child's natural size and position it with scroll offset
      const childSize = measureNode(
        child,
        node.scrollProps.contentWidth,
        node.scrollProps.contentHeight,
      );
      const childX = startX + scrollOffsetX;
      const childY = startY + scrollOffsetY;

      // Recursively calculate layout for child with its natural size
      calculateLayout(child, childSize.width, childSize.height, childX, childY);
    }
    return;
  }

  // Measure all children
  const childMeasurements = node.children.map((child: UIObject) =>
    measureNode(child, availableWidth, availableHeight),
  );

  // Calculate total size needed
  let totalMainAxisSize = 0;
  let maxCrossAxisSize = 0;

  if (direction === "row") {
    for (const measure of childMeasurements) {
      totalMainAxisSize += measure.width;
      maxCrossAxisSize = math.max(maxCrossAxisSize, measure.height);
    }
  } else {
    for (const measure of childMeasurements) {
      totalMainAxisSize += measure.height;
      maxCrossAxisSize = math.max(maxCrossAxisSize, measure.width);
    }
  }

  // Add gaps to total size
  if (node.children.length > 1) {
    totalMainAxisSize += gap * (node.children.length - 1);
  }

  // Calculate starting position based on justify-content
  let mainAxisPos = 0;
  let spacing = 0;

  if (direction === "row") {
    const remainingSpace = availableWidth - totalMainAxisSize;

    if (justify === "center") {
      mainAxisPos = remainingSpace / 2;
    } else if (justify === "end") {
      mainAxisPos = remainingSpace;
    } else if (justify === "between" && node.children.length > 1) {
      spacing = remainingSpace / (node.children.length - 1);
    }
  } else {
    const remainingSpace = availableHeight - totalMainAxisSize;

    if (justify === "center") {
      mainAxisPos = remainingSpace / 2;
    } else if (justify === "end") {
      mainAxisPos = remainingSpace;
    } else if (justify === "between" && node.children.length > 1) {
      spacing = remainingSpace / (node.children.length - 1);
    }
  }

  // Position each child
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const measure = childMeasurements[i];

    let childX = startX;
    let childY = startY;

    if (direction === "row") {
      // Main axis is horizontal
      childX = startX + math.floor(mainAxisPos);

      // Cross axis (vertical) alignment
      if (align === "center") {
        childY = startY + math.floor((availableHeight - measure.height) / 2);
      } else if (align === "end") {
        childY = startY + (availableHeight - measure.height);
      } else {
        childY = startY; // start
      }

      mainAxisPos += measure.width + spacing;
      if (i < node.children.length - 1) {
        mainAxisPos += gap;
      }
    } else {
      // Main axis is vertical
      childY = startY + math.floor(mainAxisPos);

      // Cross axis (horizontal) alignment
      if (align === "center") {
        childX = startX + math.floor((availableWidth - measure.width) / 2);
      } else if (align === "end") {
        childX = startX + (availableWidth - measure.width);
      } else {
        childX = startX; // start
      }

      mainAxisPos += measure.height + spacing;
      if (i < node.children.length - 1) {
        mainAxisPos += gap;
      }
    }

    // Recursively calculate layout for child
    calculateLayout(child, measure.width, measure.height, childX, childY);
  }
}
