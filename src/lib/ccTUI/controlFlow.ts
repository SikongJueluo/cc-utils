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
 * Props for Switch component
 */
export type SwitchProps = {
  /** Optional fallback to show when no Match condition is met */
  fallback?: UIObject;
} & Record<string, unknown>;

/**
 * Props for Match component
 */
export type MatchProps = {
  /** Condition accessor - when truthy, this Match will be selected */
  when: Accessor<boolean>;
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
  renderFn: (item: T, index: Accessor<number>) => UIObject,
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
    renderedItems.forEach((item) => item.unmount());
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

/**
 * Switch component - renders the first Match whose condition is truthy
 * Similar to a switch statement or if/else if/else chain
 *
 * @param props - Props containing optional fallback
 * @param matches - Array of Match components to evaluate
 * @returns UIObject representing the switch statement
 *
 * @example
 * ```typescript
 * const [status, setStatus] = createSignal("loading");
 *
 * Switch(
 *   { fallback: div({}, "Unknown status") },
 *   Match({ when: () => status() === "loading" }, div({}, "Loading...")),
 *   Match({ when: () => status() === "success" }, div({}, "Success!")),
 *   Match({ when: () => status() === "error" }, div({}, "Error occurred"))
 * )
 * ```
 */
export function Switch(props: SwitchProps, ...matches: UIObject[]): UIObject {
  const container = new UIObject("switch", props, []);

  let currentChild: UIObject | undefined = undefined;

  /**
   * Evaluate all Match conditions and show the first truthy one
   */
  const updateChild = () => {
    // Unmount current child
    if (currentChild !== undefined) {
      currentChild.unmount();
      container.removeChild(currentChild);
    }

    // Find the first Match with a truthy condition
    for (const match of matches) {
      if (match.type === "match") {
        const matchProps = match.props as MatchProps;
        const condition = matchProps.when();

        if (
          condition !== undefined &&
          condition !== null &&
          condition !== false
        ) {
          // This Match's condition is truthy, use it
          if (match.children.length > 0) {
            currentChild = match.children[0];
            container.appendChild(currentChild);
            currentChild.mount();
          }
          return;
        }
      }
    }

    // No Match condition was truthy, use fallback if available
    if (props.fallback !== undefined) {
      currentChild = props.fallback;
      container.appendChild(currentChild);
      currentChild.mount();
    } else {
      currentChild = undefined;
    }
  };

  // Create effect to watch for condition changes
  createEffect(() => {
    updateChild();
  });

  return container;
}

/**
 * Match component - represents a single case in a Switch
 * Should only be used as a child of Switch
 *
 * @param props - Props containing the condition
 * @param child - Content to render when condition is truthy
 * @returns UIObject representing this match case
 *
 * @example
 * ```typescript
 * const [color, setColor] = createSignal("red");
 *
 * Match({ when: () => color() === "red" },
 *   div({ class: "text-red" }, "Stop")
 * )
 * ```
 */
export function Match(props: MatchProps, child: UIObject): UIObject {
  const container = new UIObject("match", props, [child]);
  child.parent = container;
  return container;
}
