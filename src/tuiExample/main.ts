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
  ScrollContainer,
} from "../lib/ccTUI";

/**
 * Simple counter example
 */
const Counter = () => {
  const [count, setCount] = createSignal(0);

  return div(
    { class: "flex flex-col bg-blue" },
    h3("Counter Example"),
    label({ class: "text-yellow" }, () => `Count: ${count()}`),
    div(
      { class: "flex flex-row" },
      button({ onClick: () => setCount(count() - 1), class: "text-red" }, "-"),
      button(
        { onClick: () => setCount(count() + 1), class: "text-green" },
        "+",
      ),
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
      button({ onClick: addTodo, class: "bg-green text-white" }, "Add"),
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
        label(
          {
            class: todo.completed ? "ml-1 text-gray" : "ml-1 text-white",
          },
          () => todo.title,
        ),
        button(
          {
            class: "ml-1 bg-red text-white",
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
 * Example data type
 */
interface ListItem {
  id: number;
  title: string;
  description: string;
}

/**
 * Simple scroll example with a list of items
 */
function SimpleScrollExample() {
  // Create a large list of items to demonstrate scrolling
  const [items, setItems] = createStore<ListItem[]>([]);
  const [itemCount, setItemCount] = createSignal(0);

  // Generate initial items
  const generateItems = (count: number) => {
    const newItems: ListItem[] = [];
    for (let i = 1; i <= count; i++) {
      newItems.push({
        id: i,
        title: `Item ${i}`,
        description: `Description for item ${i}`,
      });
    }
    setItems(() => newItems);
    setItemCount(count);
  };

  // Initialize with some items
  generateItems(20);

  return div(
    { class: "flex flex-col h-screen bg-black text-white" },

    // Header
    div(
      { class: "flex flex-row justify-center bg-blue text-white" },
      label({}, "Scroll Container Demo"),
    ),

    // Control buttons
    div(
      { class: "flex flex-row justify-center bg-gray" },
      button(
        { onClick: () => generateItems(itemCount() + 10) },
        "Add 10 Items",
      ),
      button(
        { onClick: () => generateItems(Math.max(0, itemCount() - 10)) },
        "Remove 10 Items",
      ),
      button({ onClick: () => generateItems(50) }, "Generate 50 Items"),
    ),

    // Main scrollable content
    div(
      { class: "flex flex-col" },
      label({}, "Scrollable List:"),
      ScrollContainer(
        {
          width: 40,
          height: 15,
          showScrollbar: true,
        },
        div(
          { class: "flex flex-col" },
          For({ each: items }, (item: ListItem, index) =>
            div(
              { class: "flex flex-col" },
              label({}, () => `${index() + 1}. ${item.title}`),
              label({}, item.description),
              label({}, ""), // Empty line for spacing
            ),
          ),
        ),
      ),
    ),

    // Instructions
    div(
      { class: "flex flex-col bg-brown text-white" },
      label({}, "Instructions:"),
      label({}, "• Use mouse wheel to scroll within the container"),
      label({}, "• Notice the scrollbar on the right side"),
      label({}, "• Try adding/removing items to see scroll behavior"),
    ),
  );
}

/**
 * Example with static long content
 */
function StaticScrollExample() {
  const longText = [
    "Line 1: This is a demonstration of vertical scrolling.",
    "Line 2: The content extends beyond the visible area.",
    "Line 3: Use your mouse wheel to scroll up and down.",
    "Line 4: Notice how the scrollbar appears on the right.",
    "Line 5: The scrollbar thumb shows your current position.",
    "Line 6: This content is much longer than the container.",
    "Line 7: Keep scrolling to see more lines.",
    "Line 8: The scroll container handles overflow automatically.",
    "Line 9: You can also scroll horizontally if content is wide.",
    "Line 10: This demonstrates the scroll functionality.",
    "Line 11: More content here to fill the scrollable area.",
    "Line 12: The framework handles all the complex scroll logic.",
    "Line 13: Just wrap your content in a ScrollContainer.",
    "Line 14: Set width and height to define the viewport.",
    "Line 15: The end! Try scrolling back to the top.",
  ];

  return div(
    { class: "flex flex-col justify-center items-center h-screen bg-black" },
    label({}, "Static Scroll Example"),

    ScrollContainer(
      {
        width: 50,
        height: 10,
        showScrollbar: true,
      },
      div(
        { class: "flex flex-col" },
        ...longText.map((line) => label({}, line)),
      ),
    ),

    label({}, "Use mouse wheel to scroll"),
  );
}

/**
 * Example with multiple independent scroll containers
 */
function MultiScrollExample() {
  return div(
    { class: "flex flex-col h-screen bg-black" },
    label({}, "Multiple Scroll Containers"),

    div(
      { class: "flex flex-row justify-between" },

      // Left container - numbers
      div(
        { class: "flex flex-col" },
        label({}, "Numbers"),
        ScrollContainer(
          { width: 15, height: 10 },
          div(
            { class: "flex flex-col" },
            For(
              {
                each: () =>
                  Array.from({ length: 30 }, (_, i) => i + 1) as number[],
              },
              (num: number) => label({}, () => `Number: ${num}`),
            ),
          ),
        ),
      ),

      // Right container - letters
      div(
        { class: "flex flex-col" },
        label({}, "Letters"),
        ScrollContainer(
          { width: 15, height: 10 },
          div(
            { class: "flex flex-col" },
            For(
              {
                each: () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") as string[],
              },
              (letter: string, index) =>
                label({}, () => `${index() + 1}. Letter ${letter}`),
            ),
          ),
        ),
      ),
    ),

    label({}, "Each container scrolls independently"),
  );
}

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
      button({ onClick: () => setTabIndex(2) }, "SimpleScroll"),
      button({ onClick: () => setTabIndex(3) }, "StaticScroll"),
      button({ onClick: () => setTabIndex(4) }, "MultiScroll"),
    ),
    Show(
      {
        when: () => tabIndex() === 0,
        fallback: Show(
          {
            when: () => tabIndex() === 1,
            fallback: Show(
              {
                when: () => tabIndex() === 2,
                fallback: Show(
                  {
                    when: () => tabIndex() === 3,
                    fallback: MultiScrollExample(),
                  },
                  StaticScrollExample(),
                ),
              },
              SimpleScrollExample(),
            ),
          },
          TodosApp(),
        ),
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
