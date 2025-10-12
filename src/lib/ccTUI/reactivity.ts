/**
 * Reactive system inspired by SolidJS
 * Provides fine-grained reactivity with Signals and Effects
 */

/**
 * Type for a Signal getter function
 */
export type Accessor<T> = () => T;

/**
 * Type for a Signal setter function
 */
export type Setter<T> = (value: T) => void;

/**
 * Type for a Signal tuple [getter, setter]
 */
export type Signal<T> = [Accessor<T>, Setter<T>];

/**
 * Listener function type that gets notified when a signal changes
 */
type Listener = () => void;

/**
 * Context stack for tracking which effect is currently running
 */
let currentListener: Listener | undefined = undefined;

/**
 * Batch update context - when true, effects won't run until batch completes
 */
let batchDepth = 0;
const pendingEffects = new Set<Listener>();

/**
 * Creates a reactive signal with a getter and setter
 * 
 * @template T - The type of the signal value
 * @param initialValue - The initial value of the signal
 * @returns A tuple containing [getter, setter]
 * 
 * @example
 * ```typescript
 * const [count, setCount] = createSignal(0);
 * print(count()); // 0
 * setCount(5);
 * print(count()); // 5
 * ```
 */
export function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const listeners = new Set<Listener>();

  /**
   * Getter function - reads the current value and subscribes the current listener
   */
  const getter: Accessor<T> = () => {
    // Subscribe the current running effect/computation
    if (currentListener !== undefined) {
      listeners.add(currentListener);
    }
    return value;
  };

  /**
   * Setter function - updates the value and notifies all listeners
   */
  const setter: Setter<T> = (newValue: T) => {
    // Only update if value actually changed
    if (value !== newValue) {
      value = newValue;
      
      // Notify all subscribed listeners
      if (batchDepth > 0) {
        // In batch mode, collect effects to run later
        listeners.forEach(listener => pendingEffects.add(listener));
      } else {
        // Run effects immediately
        listeners.forEach(listener => {
          try {
            listener();
          } catch (e) {
            printError(e);
          }
        });
      }
    }
  };

  return [getter, setter];
}

/**
 * Creates an effect that automatically tracks its dependencies and reruns when they change
 * 
 * @param fn - The effect function to run
 * 
 * @example
 * ```typescript
 * const [count, setCount] = createSignal(0);
 * createEffect(() => {
 *   print(`Count is: ${count()}`);
 * });
 * setCount(1); // Effect automatically reruns and prints "Count is: 1"
 * ```
 */
export function createEffect(fn: () => void): void {
  const effect = () => {
    // Set this effect as the current listener
    const prevListener = currentListener;
    currentListener = effect;
    
    try {
      // Run the effect function - it will subscribe to any signals it reads
      fn();
    } finally {
      // Restore previous listener
      currentListener = prevListener;
    }
  };

  // Run the effect immediately for the first time
  effect();
}

/**
 * Batches multiple signal updates to prevent excessive re-renders
 * All signal updates within the batch function will only trigger effects once
 * 
 * @param fn - Function containing multiple signal updates
 * 
 * @example
 * ```typescript
 * batch(() => {
 *   setFirstName("John");
 *   setLastName("Doe");
 * }); // Effects only run once after both updates
 * ```
 */
export function batch(fn: () => void): void {
  batchDepth++;
  
  try {
    fn();
  } finally {
    batchDepth--;
    
    // If we're done with all batches, run pending effects
    if (batchDepth === 0) {
      const effects = Array.from(pendingEffects);
      pendingEffects.clear();
      
      effects.forEach(effect => {
        try {
          effect();
        } catch (e) {
          printError(e);
        }
      });
    }
  }
}

/**
 * Creates a derived signal (memo) that computes a value based on other signals
 * The computation is cached and only recomputed when dependencies change
 * 
 * @template T - The type of the computed value
 * @param fn - Function that computes the value
 * @returns An accessor function for the computed value
 * 
 * @example
 * ```typescript
 * const [firstName, setFirstName] = createSignal("John");
 * const [lastName, setLastName] = createSignal("Doe");
 * const fullName = createMemo(() => `${firstName()} ${lastName()}`);
 * print(fullName()); // "John Doe"
 * ```
 */
export function createMemo<T>(fn: () => T): Accessor<T> {
  const [value, setValue] = createSignal<T>(undefined as unknown as T);
  
  createEffect(() => {
    setValue(fn());
  });
  
  return value;
}
