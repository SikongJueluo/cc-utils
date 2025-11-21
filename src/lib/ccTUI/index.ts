/**
 * ComputerCraft TUI (Terminal User Interface) Framework
 * A declarative, reactive UI framework inspired by SolidJS
 * Provides components, reactivity, and flexbox layout for ComputerCraft
 */

// Reactivity system
export {
    createSignal,
    createEffect,
    createMemo,
    batch,
    type Accessor,
    type Setter,
    type Signal,
} from "./reactivity";

// Store for complex state
export {
    createStore,
    removeIndex,
    insertAt,
    type SetStoreFunction,
} from "./store";

// Components
export {
    div,
    label,
    h1,
    h2,
    h3,
    button,
    input,
    form,
    type DivProps,
    type LabelProps,
    type ButtonProps,
    type InputProps,
    type FormProps,
} from "./components";

// Control flow
export {
    For,
    Show,
    Switch,
    Match,
    type ForProps,
    type ShowProps,
    type SwitchProps,
    type MatchProps,
} from "./controlFlow";

// Scroll container
export {
    ScrollContainer,
    isScrollContainer,
    findScrollContainer,
    isPointVisible,
    screenToContent,
    type ScrollContainerProps,
} from "./scrollContainer";

// Application
export { Application, render } from "./application";

// Core types
export {
    UIObject,
    type LayoutProps,
    type StyleProps,
    type ScrollProps,
    type ComputedLayout,
    type BaseProps,
} from "./UIObject";
