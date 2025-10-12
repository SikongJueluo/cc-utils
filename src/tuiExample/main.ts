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
  Show,
  input,
  For,
  createStore,
  removeIndex,
} from "../lib/ccTUI";

/**
 * Simple counter example
 */
const Counter = () => {
  const [count, setCount] = createSignal(0);

  return div(
    { class: "flex flex-col" },
    h3("Counter Example"),
    label({}, () => `Count: ${count()}`),
    div(
      { class: "flex flex-row" },
      button({ onClick: () => setCount(count() - 1) }, "-"),
      button({ onClick: () => setCount(count() + 1) }, "+"),
    ),
  );
};

/**
 * Todo list example
 */
let nextTodoId = 0;
const TodosApp = () => {
  const [todos, setTodos] = createStore<
    { id: number; title: string; completed: boolean }[]
  >([]);
  const [newTitle, setNewTitle] = createSignal("");

  const addTodo = () => {
    const title = newTitle().trim();
    if (title != undefined) {
      setTodos((prev) => [
        ...prev,
        { id: nextTodoId++, title, completed: false },
      ]);
      setNewTitle("");
    }
  };

  return div(
    { class: "flex flex-col" },
    h3("Todos Example"),
    div(
      { class: "flex flex-row" },
      input({
        type: "text",
        value: newTitle,
        onInput: setNewTitle,
        placeholder: "Enter new todo",
      }),
      button({ onClick: addTodo }, "Add"),
    ),
    For({ each: todos, class: "flex flex-col" }, (todo, index) =>
      div(
        { class: "flex flex-row items-center justify-between" },
        input({
          type: "checkbox",
          checked: () => todo.completed,
          onChange: (checked) => {
            setTodos(index(), "completed", checked);
          },
        }),
        label({ class: "ml-1" }, () => todo.title),
        button(
          {
            class: "ml-1",
            onClick: () => {
              setTodos((t) => removeIndex(t, index()));
            },
          },
          "X",
        ),
      ),
    ),
  );
};

/**
 * Main application component with tabs
 */
const App = () => {
  const [tabIndex, setTabIndex] = createSignal(0);

  return div(
    { class: "flex flex-col" },
    div(
      { class: "flex flex-row" },
      button({ onClick: () => setTabIndex(0) }, "CountDemo"),
      button({ onClick: () => setTabIndex(1) }, "TodosDemo"),
    ),
    Show(
      {
        when: () => tabIndex() === 0,
        fallback: Show({ when: () => tabIndex() === 1 }, TodosApp()),
      },
      Counter(),
    ),
  );
};

/**
 * Main entry point
 */
try {
  print("Starting ccTUI Reactive Demo. Press Ctrl+T to quit.");

  // Render the application
  render(App);
} catch (e) {
  if (e === "Terminated") {
    print("Application terminated by user.");
  } else {
    print("Error running application:");
    printError(e);
  }
}
