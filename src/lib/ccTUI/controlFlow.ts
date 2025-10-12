/**
 * Control flow components for conditional and list rendering
 */

import { UIObject } from "./UIObject";
import { Accessor, createEffect } from "./reactivity";

/**
 * Props for For component
 */
export type ForProps<T> = {
  /** Signal or accessor containing the array to iterate over */
  each: Accessor<T[]>;
} & Record<string, unknown>;

/**
 * Props for Show component
 */
export type ShowProps = {
  /** Condition accessor - when true, shows the child */
  when: Accessor<boolean>;
  /** Optional fallback to show when condition is false */
  fallback?: UIObject;
} & Record<string, unknown>;

/**
 * For component - renders a list of items
 * Efficiently updates when the array changes
 * 
 * @template T - The type of items in the array
 * @param props - Props containing the array accessor
 * @param renderFn - Function to render each item
 * @returns UIObject representing the list
 * 
 * @example
 * ```typescript
 * const [todos, setTodos] = createStore<Todo[]>([]);
 * 
 * For({ each: () => todos },
 *   (todo, i) => div({ class: "flex flex-row" },
 *     label({}, () => todo.title),
 *     button({ onClick: () => setTodos(arr => removeIndex(arr, i())) }, "X")
 *   )
 * )
 * ```
 */
export function For<T>(
  props: ForProps<T>,
  renderFn: (item: T, index: Accessor<number>) => UIObject
): UIObject {
  const container = new UIObject("for", props, []);
  
  // Track rendered items
  let renderedItems: UIObject[] = [];
  
  /**
   * Update the list when the array changes
   */
  const updateList = () => {
    const items = props.each();
    
    // Clear old items
    renderedItems.forEach(item => item.unmount());
    container.children = [];
    renderedItems = [];
    
    // Render new items
    items.forEach((item, index) => {
      const indexAccessor = () => index;
      const rendered = renderFn(item, indexAccessor);
      rendered.parent = container;
      container.children.push(rendered);
      renderedItems.push(rendered);
      rendered.mount();
    });
  };
  
  // Create effect to watch for changes
  createEffect(() => {
    updateList();
  });
  
  return container;
}

/**
 * Show component - conditionally renders content
 * 
 * @param props - Props containing condition and optional fallback
 * @param child - Content to show when condition is true
 * @returns UIObject representing the conditional content
 * 
 * @example
 * ```typescript
 * const [loggedIn, setLoggedIn] = createSignal(false);
 * 
 * Show(
 *   {
 *     when: loggedIn,
 *     fallback: button({ onClick: () => setLoggedIn(true) }, "Log In")
 *   },
 *   button({ onClick: () => setLoggedIn(false) }, "Log Out")
 * )
 * ```
 */
export function Show(props: ShowProps, child: UIObject): UIObject {
  const container = new UIObject("show", props, []);
  
  let currentChild: UIObject | undefined = undefined;
  
  /**
   * Update which child is shown based on condition
   */
  const updateChild = () => {
    const condition = props.when();
    
    // Unmount current child
    if (currentChild !== undefined) {
      currentChild.unmount();
      container.removeChild(currentChild);
    }
    
    // Mount appropriate child
    if (condition) {
      currentChild = child;
    } else if (props.fallback !== undefined) {
      currentChild = props.fallback;
    } else {
      currentChild = undefined;
      return;
    }
    
    if (currentChild !== undefined) {
      container.appendChild(currentChild);
      currentChild.mount();
    }
  };
  
  // Create effect to watch for condition changes
  createEffect(() => {
    updateChild();
  });
  
  return container;
}
