/**
 * Store for managing complex reactive state (objects and arrays)
 * Inspired by SolidJS's createStore
 */

import { createSignal, Accessor } from "./reactivity";

/**
 * Store setter function type
 */
export interface SetStoreFunction<T> {
    /**
     * Set a specific property or array index
     */
    <K extends keyof T>(key: K, value: T[K]): void;
    /**
     * Set array index and property
     */
    (index: number, key: string, value: unknown): void;
    /**
     * Set using an updater function
     */
    (updater: (prev: T) => T): void;
}

/**
 * Creates a reactive store for managing objects and arrays
 * Returns an accessor for the store and a setter function
 *
 * @template T - The type of the store (must be an object)
 * @param initialValue - The initial value of the store
 * @returns A tuple of [accessor, setStore]
 *
 * @example
 * ```typescript
 * const [todos, setTodos] = createStore<Todo[]>([]);
 *
 * // Add a new todo
 * setTodos(todos().length, { title: "New todo", done: false });
 *
 * // Update a specific todo
 * setTodos(0, "done", true);
 *
 * // Replace entire store
 * setTodos([{ title: "First", done: false }]);
 * ```
 */
export function createStore<T extends object>(
    initialValue: T,
): [Accessor<T>, SetStoreFunction<T>] {
    // Use a signal to track the entire state
    const [get, set] = createSignal(initialValue);

    /**
     * Setter function with multiple overloads
     */
    const setStore: SetStoreFunction<T> = ((...args: unknown[]) => {
        if (args.length === 1) {
            // Single argument - either a value or an updater function
            const arg = args[0];
            if (typeof arg === "function") {
                // Updater function
                const updater = arg as (prev: T) => T;
                set(updater(get()));
            } else {
                // Direct value
                set(arg as T);
            }
        } else if (args.length === 2) {
            // Two arguments - key and value for object property or array index
            const key = args[0] as keyof T;
            const value = args[1] as T[keyof T];
            const current = get();

            if (Array.isArray(current)) {
                // For arrays, create a new array with the updated element
                const newArray = [...current] as T;
                (newArray as unknown[])[key as unknown as number] = value;
                set(newArray);
            } else {
                // For objects, create a new object with the updated property
                set({ ...current, [key]: value });
            }
        } else if (args.length === 3) {
            // Three arguments - array index, property key, and value
            const index = args[0] as number;
            const key = args[1] as string;
            const value = args[2];
            const current = get();

            if (Array.isArray(current)) {
                const newArray = [...current] as unknown[];
                if (
                    typeof newArray[index] === "object" &&
                    newArray[index] !== undefined
                ) {
                    newArray[index] = { ...newArray[index]!, [key]: value };
                }
                set(newArray as T);
            }
        }
    }) as SetStoreFunction<T>;

    return [get, setStore];
}

/**
 * Helper function to remove an item from an array at a specific index
 *
 * @template T - The type of array elements
 * @param array - The array to remove from
 * @param index - The index to remove
 * @returns A new array with the item removed
 *
 * @example
 * ```typescript
 * const [todos, setTodos] = createStore([1, 2, 3, 4]);
 * setTodos(arr => removeIndex(arr, 1)); // Results in [1, 3, 4]
 * ```
 */
export function removeIndex<T>(array: T[], index: number): T[] {
    return [...array.slice(0, index), ...array.slice(index + 1)];
}

/**
 * Helper function to insert an item into an array at a specific index
 *
 * @template T - The type of array elements
 * @param array - The array to insert into
 * @param index - The index to insert at
 * @param item - The item to insert
 * @returns A new array with the item inserted
 */
export function insertAt<T>(array: T[], index: number, item: T): T[] {
    return [...array.slice(0, index), item, ...array.slice(index)];
}
