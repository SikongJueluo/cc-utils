# ccTUI 框架重构指南

本文档旨在指导 ccTUI 框架的重构工作。框架将用于 Minecraft ComputerCraft (CC: Tweaked) 环境，其设计灵感来源于现代前端框架 SolidJS，并采用声明式、组件化的编程模型。

## 核心理念

- **声明式 UI**: 像 SolidJS 或 React 一样，通过编写函数式组件来描述 UI 状态，而不是手动操作界面。
- **响应式状态管理**: UI 会根据状态（State/Signal）的变化自动更新，开发者无需手动重绘。
- **组件化**: 将 UI 拆分为可复用的组件（函数），每个组件负责自身的状态和渲染。
- **Flexbox 布局**: 借鉴 Web 上的 Flexbox 模型，提供一套声明式的、强大的布局工具，以替代传统的绝对坐标布局。

---

## 目标 API 预览

为了直观地展示目标 API，这里将 SolidJS 的 "Simple Todos" 示例与我们期望的 ccTUI 实现进行对比。

**SolidJS (Web) 版本:**
```typescript
// ... imports
const App = () => {
  const [newTitle, setTitle] = createSignal("");
  const [todos, setTodos] = createLocalStore<TodoItem[]>("todo list", []);
  // ... logic
  return (
    <>
      <h3>Simple Todos Example</h3>
      <form onSubmit={addTodo}>
        <input /* ...props */ />
        <button>+</button>
      </form>
      <For each={todos}>
        {(todo, i) => (
          <div>
            <input type="checkbox" /* ...props */ />
            <input type="text" /* ...props */ />
            <button /* ...props */>x</button>
          </div>
        )}
      </For>
    </>
  );
};
render(App, document.getElementById("app")!);
```

**ccTUI (ComputerCraft) 目标版本:**
```typescript
// ... imports
type TodoItem = { title: string; done: boolean };

const App = () => {
  const [newTitle, setTitle] = createSignal("");
  const [todos, setTodos] = createStore<TodoItem[]>([]); // 使用简化版的 Store

  const addTodo = () => {
    batch(() => {
      setTodos(todos.length, { title: newTitle(), done: false });
      setTitle("");
    });
  };

  return div({ class: "flex flex-col" }, // 使用类似 TailwindCSS 的类名进行布局
    h3("Simple Todos Example"),
    form({ onSubmit: addTodo, class: "flex flex-row" },
      input({
        placeholder: "enter todo and click +",
        value: newTitle, // 直接传递 Signal
        onInput: setTitle, // 直接传递 Setter
      }),
      button("+")
    ),
    For({ each: todos },
      (todo, i) => div({ class: "flex flex-row items-center" },
        input({
          type: "checkbox",
          checked: () => todo.done, // 通过 accessor 获取
          onChange: (checked) => setTodos(i(), "done", checked),
        }),
        input({
          type: "text",
          value: () => todo.title,
          onChange: (newTitle) => setTodos(i(), "title", newTitle),
        }),
        button({ onClick: () => setTodos((t) => removeIndex(t, i())) }, "x")
      )
    )
  );
};

render(App);
```
*注意：上述 ccTUI 代码是设计目标，具体实现（如 `createStore`, `removeIndex`）需要被创建。*

---

## 1. 基础组件 API

组件是返回 `UIObject` 的函数。第一个参数是 `props` 对象，后续参数是子组件。

### 容器与文本
- **`div(props: DivProps, ...children: UIObject[]): UIObject`**
  - 通用容器组件，用于包裹其他组件并应用布局样式。
  - `DivProps`: `{ class?: string }` - `class` 属性用于指定布局，详见“布局系统”。

- **`label(props: LabelProps, text: string | Signal<string>): UIObject`**
  - 静态或动态文本标签。
  - `LabelProps`: `{ class?: string }`

- **`h1`, `h2`, `h3`(text): UIObject**
  - 预设样式的标题标签，本质是 `label` 的封装。

### 交互组件
- **`button(props: ButtonProps, text: string): UIObject`**
  - 可点击的按钮。
  - `ButtonProps`: `{ onClick?: () => void, class?: string }`
  - 按钮会在被点击时调用 `onClick` 回调。

- **`input(props: InputProps): UIObject`**
  - 文本或复选框输入。
  - `InputProps`:
    - `type?: "text" | "checkbox"` (默认为 "text")
    - `value?: Signal<string>`: (用于 text) 文本内容的 Signal。
    - `onInput?: (value: string) => void`: (用于 text) 内容变化时的回调。
    - `checked?: Signal<boolean>`: (用于 checkbox) 选中状态的 Signal。
    - `onChange?: (checked: boolean) => void`: (用于 checkbox) 状态变化时的回调。
    - `placeholder?: string`
    - `class?: string`

- **`form(props: FormProps, ...children: UIObject[]): UIObject`**
  - 表单容器，主要用于组织输入组件。
  - `FormProps`: `{ onSubmit?: () => void, class?: string }`
  - 在表单内按回车键（或点击提交按钮，如果未来实现）会触发 `onSubmit`。

---

## 2. 控制流

- **`For<T>(props: ForProps<T>, renderFn: (item: T, index: number) => UIObject): UIObject`**
  - 用于渲染列表。它会根据 `each` 数组的变化，高效地创建、销毁或更新子组件。
  - `ForProps`: `{ each: Signal<T[]> }`
  - `renderFn`: 一个函数，接收当前项和索引，返回用于渲染该项的 `UIObject`。

- **`Show(props: ShowProps, child: UIObject): UIObject`**
  - 用于条件渲染。当 `when` 条件为 `true` 时渲染 `child`，否则渲染 `fallback`。
  - `ShowProps`:
    - `when: () => boolean`: 一个返回布尔值的访问器函数 (accessor)。
    - `fallback?: UIObject`: 当 `when` 返回 `false` 时要渲染的组件。
  - `child`: 当 `when` 返回 `true` 时要渲染的组件。

  **SolidJS 示例:**
  ```typescript
  import { createSignal, Show } from "solid-js";

  function App() {
    const [loggedIn, setLoggedIn] = createSignal(false);
    const toggle = () => setLoggedIn(!loggedIn());

    return (
      <Show
        when={loggedIn()}
        fallback={<button onClick={toggle}>Log In</button>}
      >
        <button onClick={toggle}>Log Out</button>
      </Show>
    );
  }
  ```

  **ccTUI 目标版本:**
  ```typescript
  const App = () => {
    const [loggedIn, setLoggedIn] = createSignal(false);
    const toggle = () => setLoggedIn(!loggedIn());

    return Show(
      {
        when: loggedIn, // 直接传递 Signal 的 getter
        fallback: button({ onClick: toggle }, "Log In"),
      },
      button({ onClick: toggle }, "Log Out")
    );
  };
  ```

---

## 3. 布局系统 (Flexbox)

借鉴 TailwindCSS 的类名系统，通过 `class` 属性为 `div` 等容器组件提供布局指令。渲染引擎需要解析这些类名并应用 Flexbox 算法。

### 核心类名

- **`flex`**: 必须。将容器声明为 Flex 容器。
- **`flex-row`**: (默认) 主轴方向为水平。
- **`flex-col`**: 主轴方向为垂直。

### 对齐与分布 (Justify & Align)

- **`justify-start`**: (默认) 从主轴起点开始排列。
- **`justify-center`**: 主轴居中。
- **`justify-end`**: 从主轴终点开始排列。
- **`justify-between`**: 两端对齐，项目之间的间隔都相等。

- **`items-start`**: 交叉轴的起点对齐。
- **`items-center`**: 交叉轴的中点对齐。
- **`items-end`**: 交叉轴的终点对齐。

### 示例
```typescript
// 一个垂直居中的登录框
div({ class: "flex flex-col justify-center items-center" },
  label("Username"),
  input({}),
  label("Password"),
  input({}),
  button("Login")
)
```

### 实现要点
渲染引擎在计算布局时：
1. 解析 `class` 字符串，转换为布局属性（如 `flexDirection`, `justifyContent`）。
2. 实现一个简化的 Flexbox 算法，该算法能根据容器尺寸、子元素尺寸和布局属性，为每个子元素计算出正确的 `(x, y)` 坐标和 `(width, height)`。
3. 在 `draw` 阶段，将计算出的区域传递给子组件进行绘制。

---

## 4. 响应式系统 (Reactivity System)

框架的核心是其细粒度的响应式系统。该系统由 Signal 和 Effect 组成，其设计深受 SolidJS 启发。理解这两者是构建动态UI的关键。

### `createSignal`: 响应式的基本单元

Signal 是一个包含值的“盒子”，当它的值发生变化时，它可以通知所有正在“监听”它的代码。

- **`createSignal<T>(initialValue: T): [() => T, (newValue: T) => void]`**
  - 它接收一个初始值，并返回一个包含两个函数的数组：一个 `getter` 和一个 `setter`。
  - **Getter** (`() => T`): 一个无参数的函数，调用它会返回 Signal 的当前值。**重要的是，在特定上下文（如组件渲染或 Effect 中）调用 getter 会自动将该上下文注册为监听者。**
  - **Setter** (`(newValue: T) => void`): 一个函数，用于更新 Signal 的值。调用它会触发所有监听该 Signal 的上下文重新执行。

  **示例:**
  ```typescript
  // 1. 创建一个 signal
  const [count, setCount] = createSignal(0);

  // 2. 读取值 (这是一个函数调用)
  print(count()); // 输出: 0

  // 3. 更新值
  setCount(1);
  print(count()); // 输出: 1

  // 4. 在组件中使用 (当 count 变化时，label 会自动更新)
  label({}, () => `Count: ${count()}`);
  ```

### `createEffect`: 响应 Signal 的变化

Effect 用于将响应式系统与外部世界（如日志、计时器、手动API调用）连接起来。它是一个自动跟踪其依赖（即它内部读取的 Signal）并重新执行的函数。

- **`createEffect(fn: () => void): void`**
  - 它接收一个函数 `fn` 并立即执行一次。
  - 框架会监视 `fn` 在执行期间读取了哪些 Signal (调用了哪些 getter)。
  - 当任何一个被依赖的 Signal 更新时，`fn` 会被自动重新执行。

  **示例:**
  ```typescript
  const [count, setCount] = createSignal(0);

  // 创建一个 effect 来响应 count 的变化
  createEffect(() => {
    // 这个 effect 读取了 count()，因此它依赖于 count Signal
    print(`The current count is: ${count()}`);
  });
  // 控制台立即输出: "The current count is: 0"

  // 稍后在代码的其他地方更新 signal
  setCount(5);
  // effect 会自动重新运行，控制台输出: "The current count is: 5"
  ```

### 更新与批处理

- **`batch(fn: () => void)`**
  - 将多次状态更新合并为一次，以进行单次、高效的 UI 重绘。如果你需要在一个操作中连续多次调用 `setter`，应该将它们包裹在 `batch` 中以获得最佳性能。

  ```typescript
  batch(() => {
    setFirstName("John");
    setLastName("Smith");
  }); // UI 只会更新一次
  ```

### 复杂状态管理

- **`createStore<T extends object>(initialValue: T): [T, (updater: ...) => void]`**
  - 用于响应式地管理对象和数组。与 `createSignal` 管理单个值不同，`createStore` 允许你独立地更新对象或数组的特定部分，并只触发关心这些部分的更新。其 API 应参考 SolidJS 的 `createStore`。

---

## 5. 代码规范与构建

- **代码规范**:
  - 使用 `unknown` 代替 `any`。
  - 使用 `undefined` 代替 `null`。
  - 遵循 TSDoc 规范为所有函数、参数、返回值、分支和循环添加注释。
- **构建与验证**:
  - 使用 `just build-example sync` 命令构建示例代码并检查编译时错误。
  - 使用 `pnpm dlx eslint [file]` 命令对修改后的文件进行代码风格检查。

---

## 6. 文件结构说明

本节旨在说明 `ccTUI` 框架核心目录下的主要文件及其职责。

### `src/lib/ccTUI/`

- **`index.ts`**: 框架的公共 API 入口。所有可供外部使用的组件（如 `div`, `button`）和函数（如 `createSignal`）都应由此文件导出。
- **`reactivity.ts`**: 包含框架的响应式系统核心，即 `createSignal`, `createEffect`, `batch`, `createMemo` 等的实现。
- **`store.ts`**: 包含 `createStore` 的实现，用于管理对象和数组等复杂状态。
- **`UIObject.ts`**: 定义了所有 UI 元素的基类或基础类型 `UIObject`，包括位置、尺寸、父子关系、绘制（draw）和更新（update）等通用接口。
- **`application.ts`**: 包含 `Application` 类，负责管理主窗口、事件循环（event loop）、焦点管理和全局重绘。`render` 函数也在这里。
- **`renderer.ts`**: 负责将 `UIObject` 树解析并绘制到 ComputerCraft 终端屏幕上。
- **`layout.ts`**: Flexbox 布局引擎的实现。解析 `class` 属性并计算组件的布局。
- **`components.ts`**: 包含所有基础 UI 组件的实现，如 `div`, `label`, `button`, `input`, `form` 等。
- **`controlFlow.ts`**: 包含控制流组件，如 `For` 和 `Show`，用于处理列表渲染和条件渲染。
- **`framework.md`**: (本文档) 框架的设计指南、API 参考和代码规范。

---

## 7. 框架示例

- **`src/tuiExample/main.ts`**: 此文件将作为新的响应式框架示例，用于展示和验证所有 SolidJS 风格的 API。
  - 在对框架进行任何修改或添加新功能后，都应在此文件中创建或更新相应的示例来验证其正确性。
  - 使用 `just build-example sync` 命令可以编译此示例并将其同步到游戏内的 `computer` 目录中，以便在 Minecraft 环境中实际运行和查看效果。

---

## 8. 实现状态

### ✅ 已实现的功能

#### 响应式系统 (reactivity.ts)
- ✅ `createSignal<T>(initialValue: T)` - 创建响应式信号
- ✅ `createEffect(fn: () => void)` - 创建自动跟踪依赖的副作用
- ✅ `batch(fn: () => void)` - 批量更新多个信号
- ✅ `createMemo<T>(fn: () => T)` - 创建派生信号（计算属性）

#### Store (store.ts)
- ✅ `createStore<T>(initialValue: T)` - 创建响应式存储，用于管理对象和数组
- ✅ `removeIndex<T>(array: T[], index: number)` - 辅助函数：从数组中移除元素
- ✅ `insertAt<T>(array: T[], index: number, item: T)` - 辅助函数：插入元素到数组

#### 基础组件 (components.ts)
- ✅ `div(props, ...children)` - 通用容器组件
- ✅ `label(props, text)` - 文本标签组件
- ✅ `h1(text)`, `h2(text)`, `h3(text)` - 标题组件
- ✅ `button(props, text)` - 按钮组件
- ✅ `input(props)` - 输入组件（支持 text 和 checkbox 类型）
- ✅ `form(props, ...children)` - 表单容器组件

#### 控制流 (controlFlow.ts)
- ✅ `For<T>(props, renderFn)` - 列表渲染组件
- ✅ `Show(props, child)` - 条件渲染组件

#### 布局系统 (layout.ts)
- ✅ Flexbox 布局引擎实现
- ✅ 支持的类名：
  - `flex-row`, `flex-col` - 设置 flex 方向
  - `justify-start`, `justify-center`, `justify-end`, `justify-between` - 主轴对齐
  - `items-start`, `items-center`, `items-end` - 交叉轴对齐

#### 渲染器 (renderer.ts)
- ✅ 将 UI 树渲染到 ComputerCraft 终端
- ✅ 支持响应式文本内容
- ✅ 处理焦点状态的视觉反馈

#### 应用程序 (application.ts)
- ✅ `Application` 类 - 管理应用生命周期
- ✅ `render(rootFn)` - 便捷的渲染函数
- ✅ 事件循环（键盘、鼠标）
- ✅ 自动焦点管理
- ✅ 响应式重渲染

### 📋 API 导出 (index.ts)
- ✅ 所有新 API 已正确导出
- ✅ 保留旧 API 以实现向后兼容

### 🎯 示例代码
- ✅ `main.new.ts` - 简单的计数器示例，演示响应式系统的基本用法

### 🔄 向后兼容性
- ✅ 旧的类组件系统（Signal, UIComponent, Button 等）仍然可用
- ✅ 旧的示例代码 `main.ts` 不受影响

---

## 9. 使用指南

### 基本示例

```typescript
import { createSignal, div, label, button, render } from "../lib/ccTUI";

const App = () => {
  const [count, setCount] = createSignal(0);

  return div({ class: "flex flex-col" },
    label({}, () => `Count: ${count()}`),
    button({ onClick: () => setCount(count() + 1) }, "Increment")
  );
};

render(App);
```

### 构建与运行

```bash
# 构建示例
just build-example

# 构建并同步到游戏
just build-example sync

# 或使用 pnpm 直接构建
pnpm tstl -p ./tsconfig.tuiExample.json
```

### 代码检查

```bash
# 运行 ESLint 检查
pnpm dlx eslint src/lib/ccTUI/reactivity.ts
```
