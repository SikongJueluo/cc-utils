/**
 * Example using the new ccTUI framework with reactive components
 * Demonstrates the SolidJS-inspired API
 */

import {
  createSignal,
  div,
  h3,
  label,
  button,
  render,
} from "../lib/ccTUI";

/**
 * Simple counter example
 */
const CounterApp = () => {
  const [count, setCount] = createSignal(0);
  
  return div({ class: "flex flex-col" },
    h3("Counter Example"),
    label({}, () => `Count: ${count()}`),
    div({ class: "flex flex-row" },
      button({ onClick: () => setCount(count() - 1) }, "-"),
      button({ onClick: () => setCount(count() + 1) }, "+")
    )
  );
};

/**
 * Main entry point
 */
try {
  print("Starting ccTUI Reactive Demo. Press Ctrl+T to quit.");
  
  // Render the application
  render(CounterApp);
  
} catch (e) {
  if (e === "Terminated") {
    print("Application terminated by user.");
  } else {
    print("Error running application:");
    printError(e);
  }
}
