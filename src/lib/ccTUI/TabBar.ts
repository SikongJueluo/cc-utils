import { UIComponent } from "./UIComponent";
import { Signal } from "./Signal";
import { KeyEvent } from "../event";

/**
 * Tab component that allows switching between different pages
 * Similar to QT's TabWidget, currently implementing horizontal tabs only
 */
export class TabBar extends UIComponent {
  // Tab data structure - simple array of tab names
  private tabs: string[];
  private currentIndex: number;
  // Tracks visible range of tabs to handle overflow scenarios
  private firstVisibleIndex: number;
  private lastVisibleIndex: number;

  // Signal emitted when the current tab changes
  public onTabChanged = new Signal<{ index: number; name: string }>();

  /**
   * Creates a new TabWidget component
   * @param objectName Unique name for the component
   * @param x X position on the terminal
   * @param y Y position on the terminal
   * @param width Width of the tab widget
   * @param tabNames Initial list of tab names
   * @param initialIndex Index of the initially selected tab (default: 0)
   */
  constructor(
    objectName: string,
    x: number,
    y: number,
    width: number,
    tabNames: string[],
    initialIndex = 0,
  ) {
    super(objectName, x, y, width, 1);

    // Initialize tabs as simple string array
    this.tabs = [...tabNames];
    this.currentIndex = Math.max(
      0,
      Math.min(initialIndex, tabNames.length - 1),
    );
    this.firstVisibleIndex = 0;
    this.lastVisibleIndex = -1;

    // Calculate which tabs can be displayed based on available width
    this.updateVisibleRange();
  }

  /**
   * Updates the range of visible tabs based on available width
   * This method ensures the current tab is always visible and calculates
   * which other tabs can fit in the available space
   */
  private updateVisibleRange(): void {
    // If no tabs exist, nothing to update
    if (this.tabs.length === 0) {
      this.firstVisibleIndex = 0;
      this.lastVisibleIndex = -1;
      return;
    }

    // Calculate visible tabs range based on current position
    this.calculateVisibleTabs();
  }

  /**
   * Calculates visible tabs based on current position and available width
   * Follows the new core rendering logic
   */
  private calculateVisibleTabs(): void {
    if (this.tabs.length === 0) {
      this.firstVisibleIndex = 0;
      this.lastVisibleIndex = -1;
      return;
    }

    // Start with all tabs and build the complete string
    let fullString = "| ";
    for (let i = 0; i < this.tabs.length; i++) {
      if (i > 0) {
        fullString += " | ";
      }
      fullString += this.tabs[i];
    }
    fullString += " |";

    // If the full string fits, show all tabs
    if (fullString.length <= this.width) {
      this.firstVisibleIndex = 0;
      this.lastVisibleIndex = this.tabs.length - 1;
      return;
    }

    // Find the range that can fit around the current tab
    this.firstVisibleIndex = this.currentIndex;
    this.lastVisibleIndex = this.currentIndex;

    // Try to expand left and right alternately
    while (
      this.firstVisibleIndex > 0 ||
      this.lastVisibleIndex < this.tabs.length - 1
    ) {
      let expanded = false;

      // Try expanding left first
      if (this.firstVisibleIndex > 0) {
        const newTestString =
          "| " +
          this.tabs[this.firstVisibleIndex - 1] +
          " | " +
          this.tabs
            .slice(this.firstVisibleIndex, this.lastVisibleIndex + 1)
            .join(" | ") +
          " |";

        if (newTestString.length <= this.width) {
          this.firstVisibleIndex--;
          expanded = true;
        }
      }

      // Try expanding right
      if (this.lastVisibleIndex < this.tabs.length - 1) {
        const newTestString =
          "| " +
          this.tabs
            .slice(this.firstVisibleIndex, this.lastVisibleIndex + 1)
            .join(" | ") +
          " | " +
          this.tabs[this.lastVisibleIndex + 1] +
          " |";

        if (newTestString.length <= this.width) {
          this.lastVisibleIndex++;
          expanded = true;
        }
      }

      // If no expansion was possible, break
      if (!expanded) break;
    }
  }

  /**
   * Renders the tab widget to the terminal
   * Follows the new core rendering logic:
   * 1. Build complete string with all visible tabs
   * 2. Calculate what can be displayed
   * 3. Replace indicators based on hidden tabs
   * 4. Determine highlight range and render
   */
  render(): void {
    if (!this.visible) return;

    const [originalX, originalY] = term.getCursorPos();

    // Move cursor to the position of the tab widget
    term.setCursorPos(this.x, this.y);

    if (this.tabs.length === 0) {
      // Fill with spaces if no tabs
      term.setTextColor(colors.white);
      term.setBackgroundColor(colors.black);
      term.write(" ".repeat(this.width));
      term.setCursorPos(originalX, originalY);
      return;
    }

    // Step 1: Build complete string for visible tabs with "| " at start and " |" at end
    let displayString = "| ";
    for (let i = this.firstVisibleIndex; i <= this.lastVisibleIndex; i++) {
      if (i > this.firstVisibleIndex) {
        displayString += " | ";
      }
      displayString += this.tabs[i];
    }
    displayString += " |";

    // Step 2: Check if the string fits, if not, truncate with "..."
    if (displayString.length > this.width) {
      // Need to truncate - find where to cut and add "..."
      const maxLength = this.width - 3; // Reserve space for "..."
      if (maxLength > 0) {
        // Find the last complete tab that can fit
        let cutPosition = maxLength;
        // Try to cut at a tab boundary if possible
        let lastPipePos = -1;
        for (let i = cutPosition; i >= 0; i--) {
          if (displayString.substring(i, i + 3) === " | ") {
            lastPipePos = i;
            break;
          }
        }
        if (lastPipePos > 2) {
          // Make sure we don't cut before the first tab
          cutPosition = lastPipePos;
        }
        displayString = displayString.substring(0, cutPosition) + "...";
      } else {
        displayString = "...";
      }
    }

    // Step 3: Replace boundary indicators based on hidden tabs
    if (this.firstVisibleIndex > 0) {
      // Left side has hidden tabs - replace "| " with "< "
      displayString = "< " + displayString.substring(2);
    }

    if (this.lastVisibleIndex < this.tabs.length - 1) {
      // Right side has hidden tabs - replace " |" with " >"
      if (displayString.endsWith(" |")) {
        displayString =
          displayString.substring(0, displayString.length - 2) + " >";
      } else if (displayString.endsWith("...")) {
        // If we have "...", just ensure we show ">"
        displayString =
          displayString.substring(0, displayString.length - 3) + " >";
      }
    }

    // Pad to maintain consistent width
    while (displayString.length < this.width) {
      displayString += " ";
    }

    // Ensure we don't exceed the width
    if (displayString.length > this.width) {
      displayString = displayString.substring(0, this.width);
    }

    // Step 4: Find current tab position for highlighting
    let currentTabStart = -1;
    let currentTabEnd = -1;

    if (
      this.currentIndex >= this.firstVisibleIndex &&
      this.currentIndex <= this.lastVisibleIndex
    ) {
      // Calculate position of current tab in display string
      let searchPos = 2; // Start after "| " or "< "

      // Find current tab position by iterating through visible tabs
      for (let i = this.firstVisibleIndex; i <= this.lastVisibleIndex; i++) {
        if (i > this.firstVisibleIndex) {
          searchPos += 3; // " | " separator
        }

        if (i === this.currentIndex) {
          currentTabStart = searchPos;

          // Find the end of the current tab
          const tabName = this.tabs[i];
          const remainingString = displayString.substring(searchPos);

          // Check if the tab is fully displayed or truncated
          if (remainingString.startsWith(tabName)) {
            // Tab is fully displayed
            currentTabEnd = searchPos + tabName.length;
          } else {
            // Tab might be truncated, find where it ends
            const nextSeparatorPos = remainingString.indexOf(" |");
            const nextIndicatorPos = remainingString.indexOf(" >");
            const ellipsisPos = remainingString.indexOf("...");

            let endPos = remainingString.length;
            if (nextSeparatorPos >= 0)
              endPos = Math.min(endPos, nextSeparatorPos);
            if (nextIndicatorPos >= 0)
              endPos = Math.min(endPos, nextIndicatorPos);
            if (ellipsisPos >= 0) endPos = Math.min(endPos, ellipsisPos);

            currentTabEnd = searchPos + endPos;
          }
          break;
        }

        searchPos += this.tabs[i].length;
      }
    }

    // Step 5: Render with highlighting
    term.setTextColor(colors.white);
    term.setBackgroundColor(colors.black);

    if (currentTabStart >= 0 && currentTabEnd > currentTabStart) {
      // Render text before current tab
      if (currentTabStart > 0) {
        term.write(displayString.substring(0, currentTabStart));
      }

      // Render current tab with highlighting
      term.setTextColor(colors.yellow);
      term.setBackgroundColor(colors.gray);
      term.write(displayString.substring(currentTabStart, currentTabEnd));

      // Reset colors and render remaining text
      term.setTextColor(colors.white);
      term.setBackgroundColor(colors.black);
      term.write(displayString.substring(currentTabEnd));
    } else {
      // No highlighting needed, render entire string
      term.write(displayString);
    }

    // Restore original cursor position
    term.setCursorPos(originalX, originalY);
  }

  /**
   * Handles key input events for the tab widget
   * Supports left/right arrow keys to switch between tabs
   * @param event The key event to handle
   */
  handleKeyInput(event: KeyEvent): void {
    if (!this.focused) return;

    this.onKeyPress.emit(event);

    const key = event.key;

    // Handle left arrow to move to previous visible tab
    if (key === keys.left && this.canMoveToPreviousTab()) {
      this.moveToPreviousTab();
    }
    // Handle right arrow to move to next visible tab
    else if (key === keys.right && this.canMoveToNextTab()) {
      this.moveToNextTab();
    }
  }

  /**
   * Checks if there is a previous tab available to move to
   * @returns True if there's a previous tab, false otherwise
   */
  private canMoveToPreviousTab(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Moves to the previous tab
   */
  private moveToPreviousTab(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateVisibleRange();
      this.onTabChanged.emit({
        index: this.currentIndex,
        name: this.tabs[this.currentIndex],
      });
    }
  }

  /**
   * Checks if there is a next tab available to move to
   * @returns True if there's a next tab, false otherwise
   */
  private canMoveToNextTab(): boolean {
    return this.currentIndex < this.tabs.length - 1;
  }

  /**
   * Moves to the next tab
   */
  private moveToNextTab(): void {
    if (this.currentIndex < this.tabs.length - 1) {
      this.currentIndex++;
      this.updateVisibleRange();
      this.onTabChanged.emit({
        index: this.currentIndex,
        name: this.tabs[this.currentIndex],
      });
    }
  }

  /**
   * Gets the index of the currently selected tab
   * @returns The index of the current tab
   */
  getCurrentTabIndex(): number {
    return this.currentIndex;
  }

  /**
   * Gets the name of the currently selected tab
   * @returns The name of the current tab
   */
  getCurrentTabName(): string {
    if (this.currentIndex >= 0 && this.currentIndex < this.tabs.length) {
      return this.tabs[this.currentIndex];
    }
    return "";
  }

  /**
   * Sets the currently selected tab by index
   * @param index The index of the tab to select
   */
  setCurrentTabIndex(index: number): void {
    if (index >= 0 && index < this.tabs.length) {
      this.currentIndex = index;
      this.updateVisibleRange();
      this.onTabChanged.emit({
        index: this.currentIndex,
        name: this.tabs[this.currentIndex],
      });
    }
  }

  /**
   * Updates the list of tabs with new tab names
   * @param tabNames The new list of tab names
   */
  setTabNames(tabNames: string[]): void {
    this.tabs = [...tabNames];

    // Ensure current index is within bounds
    if (this.currentIndex >= this.tabs.length) {
      this.currentIndex = Math.max(0, this.tabs.length - 1);
    }

    this.updateVisibleRange();
  }
}
