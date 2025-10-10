import { UIComponent } from "./UIComponent";
import { KeyEvent, CharEvent, TimerEvent } from "../event";

/**
 * Base Window class to manage UI components
 */
export class UIWindow {
  private components: UIComponent[] = [];
  private focusedComponentIndex = -1;

  addComponent(component: UIComponent): void {
    this.components.push(component);
  }

  removeComponent(component: UIComponent): void {
    const index = this.components.indexOf(component);
    if (index !== -1) {
      this.components.splice(index, 1);
    }
  }

  render(): void {
    // Clear the terminal
    term.clear();
    term.setCursorPos(1, 1);

    // Render all visible components
    for (const component of this.components) {
      if (component.isVisible()) {
        component.render();
      }
    }
  }

  handleKeyInput(event: KeyEvent): void {
    // Handle input for the currently focused component
    if (
      this.focusedComponentIndex >= 0 &&
      this.focusedComponentIndex < this.components.length
    ) {
      const focusedComponent = this.components[this.focusedComponentIndex];
      if (focusedComponent.isFocused()) {
        focusedComponent.handleKeyInput(event);
      }
    }
  }

  handleCharInput(event: CharEvent): void {
    // Handle input for the currently focused component
    if (
      this.focusedComponentIndex >= 0 &&
      this.focusedComponentIndex < this.components.length
    ) {
      const focusedComponent = this.components[this.focusedComponentIndex];
      if (focusedComponent.isFocused()) {
        focusedComponent.handleCharInput(event);
      }
    }
  }

  handleTimerTrigger(event: TimerEvent) {
    for (const component of this.components) {
      component.handleTimerTrigger(event);
    }
  }

  setFocus(index: number): void {
    // Unfocus current component
    if (
      this.focusedComponentIndex >= 0 &&
      this.focusedComponentIndex < this.components.length
    ) {
      this.components[this.focusedComponentIndex].unfocus();
    }

    // Change focus
    this.focusedComponentIndex = index;

    // Focus new component
    if (
      this.focusedComponentIndex >= 0 &&
      this.focusedComponentIndex < this.components.length
    ) {
      this.components[this.focusedComponentIndex].focus();
    }
  }

  setFocusFor(component: UIComponent): void {
    const index = this.components.indexOf(component);
    if (index !== -1) {
      this.setFocus(index);
    }
  }

  getComponent(index: number): UIComponent | undefined {
    return this.components[index];
  }

  getComponents(): UIComponent[] {
    return this.components;
  }

  clear(): void {
    term.clear();
    term.setCursorPos(1, 1);
  }
}
