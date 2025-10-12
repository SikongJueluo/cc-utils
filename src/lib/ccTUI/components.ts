/**
 * Functional component API
 * Provides declarative UI building blocks
 */

import { UIObject, BaseProps, createTextNode } from "./UIObject";
import { Accessor, Setter, Signal } from "./reactivity";

/**
 * Props for div component
 */
export type DivProps = BaseProps & Record<string, unknown>;

/**
 * Props for label component
 */
export type LabelProps = BaseProps & Record<string, unknown>;

/**
 * Props for button component
 */
export type ButtonProps = BaseProps & {
  /** Click handler */
  onClick?: () => void;
} & Record<string, unknown>;

/**
 * Props for input component
 */
export type InputProps = BaseProps & {
  /** Input type */
  type?: "text" | "checkbox";
  /** Value signal for text input */
  value?: Accessor<string> | Signal<string>;
  /** Input handler for text input */
  onInput?: Setter<string> | ((value: string) => void);
  /** Checked signal for checkbox */
  checked?: Accessor<boolean> | Signal<boolean>;
  /** Change handler for checkbox */
  onChange?: Setter<boolean> | ((checked: boolean) => void);
  /** Placeholder text */
  placeholder?: string;
} & Record<string, unknown>;

/**
 * Props for form component
 */
export type FormProps = BaseProps & {
  /** Submit handler */
  onSubmit?: () => void;
} & Record<string, unknown>;

/**
 * Generic container component for layout
 *
 * @param props - Component props including layout classes
 * @param children - Child components or text
 * @returns UIObject representing the div
 *
 * @example
 * ```typescript
 * div({ class: "flex flex-col justify-center" },
 *   label({}, "Hello"),
 *   button({ onClick: () => print("clicked") }, "Click me")
 * )
 * ```
 */
export function div(
  props: DivProps,
  ...children: (UIObject | string | Accessor<string>)[]
): UIObject {
  // Convert string children to text nodes
  const uiChildren = children.map((child) => {
    if (typeof child === "string" || typeof child === "function") {
      return createTextNode(child);
    }
    return child;
  });

  const node = new UIObject("div", props, uiChildren);
  uiChildren.forEach((child) => (child.parent = node));
  return node;
}

/**
 * Text label component
 *
 * @param props - Component props
 * @param text - Text content (can be a string or signal)
 * @returns UIObject representing the label
 *
 * @example
 * ```typescript
 * const [name, setName] = createSignal("World");
 * label({}, () => `Hello, ${name()}!`)
 * ```
 */
export function label(
  props: LabelProps,
  text: string | Accessor<string>,
): UIObject {
  const textNode = createTextNode(text);
  const node = new UIObject("label", props, [textNode]);
  textNode.parent = node;
  return node;
}

/**
 * Heading level 1 component
 *
 * @param text - Heading text
 * @returns UIObject representing h1
 */
export function h1(text: string | Accessor<string>): UIObject {
  return label({ class: "heading-1" }, text);
}

/**
 * Heading level 2 component
 *
 * @param text - Heading text
 * @returns UIObject representing h2
 */
export function h2(text: string | Accessor<string>): UIObject {
  return label({ class: "heading-2" }, text);
}

/**
 * Heading level 3 component
 *
 * @param text - Heading text
 * @returns UIObject representing h3
 */
export function h3(text: string | Accessor<string>): UIObject {
  return label({ class: "heading-3" }, text);
}

/**
 * Button component
 *
 * @param props - Component props including onClick handler
 * @param text - Button text
 * @returns UIObject representing the button
 *
 * @example
 * ```typescript
 * button({ onClick: () => print("Clicked!") }, "Click me")
 * ```
 */
export function button(props: ButtonProps, text: string): UIObject {
  const textNode = createTextNode(text);
  const node = new UIObject("button", props, [textNode]);
  textNode.parent = node;
  return node;
}

/**
 * Input component (text input or checkbox)
 *
 * @param props - Component props
 * @returns UIObject representing the input
 *
 * @example
 * ```typescript
 * // Text input
 * const [text, setText] = createSignal("");
 * input({ type: "text", value: text, onInput: setText, placeholder: "Enter text" })
 *
 * // Checkbox
 * const [checked, setChecked] = createSignal(false);
 * input({ type: "checkbox", checked: checked, onChange: setChecked })
 * ```
 */
export function input(props: InputProps): UIObject {
  // Normalize signal tuples to just the accessor
  const normalizedProps = { ...props };

  if (Array.isArray(normalizedProps.value)) {
    normalizedProps.value = (normalizedProps.value)[0];
  }

  if (Array.isArray(normalizedProps.checked)) {
    normalizedProps.checked = (normalizedProps.checked)[0];
  }

  return new UIObject("input", normalizedProps, []);
}

/**
 * Form component for grouping inputs
 *
 * @param props - Component props including onSubmit handler
 * @param children - Child components
 * @returns UIObject representing the form
 *
 * @example
 * ```typescript
 * form({ onSubmit: () => print("Submitted!"), class: "flex flex-row" },
 *   input({ placeholder: "Enter text" }),
 *   button({}, "Submit")
 * )
 * ```
 */
export function form(
  props: FormProps,
  ...children: (UIObject | string | Accessor<string>)[]
): UIObject {
  // Convert string children to text nodes
  const uiChildren = children.map((child) => {
    if (typeof child === "string" || typeof child === "function") {
      return createTextNode(child);
    }
    return child;
  });

  const node = new UIObject("form", props, uiChildren);
  uiChildren.forEach((child) => (child.parent = node));
  return node;
}
