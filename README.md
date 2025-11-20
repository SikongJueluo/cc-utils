# cc-utils

A collection of advanced utilities and libraries for Minecraft ComputerCraft, written in TypeScript and compiled to Lua. This project includes a powerful access control system, an automated crafting utility for the Create mod, and a declarative TUI framework.

## Features

### 1. Access Control System
A comprehensive system for managing player access to a specific area. It uses a `playerDetector` to monitor for players in range and a `chatBox` to interact with them and administrators.

- **Player Detection:** Monitors a configurable range for players.
- **Group-Based Permissions:** Assign players to groups (`admin`, `user`, `VIP`, `enemies`, etc.) with specific permissions (`isAllowed`, `isNotice`).
- **In-Game CLI:** Administrators can manage the system in-game via chat commands (e.g., `@AC /add <group> <player>`).
- **TUI for Configuration:** A user-friendly Text-based User Interface (TUI) for easy configuration. It can be launched with `accesscontrol config` or by pressing `c` in the main program or log viewer.
- **Customizable Toasts:** Configure welcome, notice, and warning toast messages for different players and situations.
- **Logging:** Detailed logging of events, viewable with the included `logviewer` program.

### 2. AutoCraft System
An automated crafting solution designed to work with the Create mod's packaged recipes.

- **Automated Crafting:** Detects cardboard packages in a chest and automatically crafts the recipes they contain.
- **Recipe Parsing:** Extracts complex, multi-step crafting recipes from package NBT data.
- **Inventory Management:** Manages pulling ingredients from a source inventory and pushing crafted items to a destination.

### 3. ccTUI Framework
A declarative, reactive TUI (Terminal User Interface) framework inspired by [SolidJS](https://www.solidjs.com/) for building complex and interactive interfaces in ComputerCraft.

- **Declarative Syntax:** Build UIs with simple, composable functions like `div`, `label`, `button`, and `input`.
- **Reactive State Management:** Uses signals (`createSignal`), stores (`createStore`), and effects (`createEffect`) for fine-grained, automatic UI updates.
- **Flexbox Layout:** Easily create complex layouts using CSS-like classes (`flex`, `flex-row`, `flex-col`, `justify-center`, `items-center`, etc.).
- **Control Flow:** Includes `<For>` and `<Show>` components for conditional and list-based rendering.
- **Component-Based:** Structure your UI into reusable components. See `src/tuiExample/main.ts` for a demo.

### 4. ccCLI Framework
A lightweight, functional-style framework for building command-line interfaces (CLIs) within CC:Tweaked. It supports nested commands, arguments, options, and automatic help generation. See the [ccCLI Documentation](./docs/ccCLI.md) for more details.

- **Declarative API:** Define commands, arguments, and options using a simple, object-based structure.
- **Nested Commands:** Organize complex applications with subcommands (e.g., `mycli command subcommand`).
- **Automatic Help:** Generates detailed help messages for commands and subcommands.
- **Global Context:** Inject shared state or services into command actions.
- **Type-Safe:** Built with TypeScript for robust development.

### 5. Core Libraries
- **`ChatManager`:** A powerful manager for `chatBox` peripherals that handles message queuing, cooldowns, and asynchronous sending/receiving. See the [ChatManager Documentation](./docs/ChatManager.md) for more details.
- **`ccStructLog`:** A modern, structured logging library inspired by Python's `structlog`. It provides a flexible, extensible framework based on processors, renderers, and streams, designed for CC:Tweaked. See the [ccStructLog Documentation](./docs/ccStructLog.md) for more details.
- **`PeripheralManager`:** A utility for easily finding and requiring peripherals by name or type.
- **`CraftManager`:** A library for parsing and executing crafting recipes from Create mod packages.

## Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/)
- [just](https://github.com/casey/just) command runner
- A ComputerCraft environment (e.g., [CraftOS-PC](https://www.craftos-pc.cc/))

## Setup & Installation

1.  **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd cc-utils
    ```

2.  **Install dependencies:**
    ```sh
    pnpm install
    ```

## Building

This project uses `just` to manage build tasks. The compiled Lua files will be placed in the `build/` directory.

- **Build all modules:**
  ```sh
  just build
  ```

- **Build a specific module:**
  ```sh
  just build-accesscontrol
  just build-autocraft
  just build-example
  ```

## Deployment

To deploy the built programs to your in-game computer, you need to configure the sync path in the `.justfile`.

1.  Open the `.justfile` and modify the `sync-path` variable to point to your CraftOS-PC computer's directory.

    ```justfile
    # Example for Linux
    sync-path := "/home/user/.local/share/craftos-pc/computer/0/user/"
    
    # Example for Windows
    # sync-path := "/cygdrive/c/Users/YourUser/AppData/Roaming/CraftOS-PC/computer/0/user/"
    ```

2.  Run the sync command:
    ```sh
    just sync
    ```
    This will copy the contents of the `build/` directory to your computer.

## Usage

### Access Control

- **Start the system:**
  ```sh
  accesscontrol start
  ```

- **Open the configuration TUI:**
  ```sh
  accesscontrol config
  ```
  Alternatively, press `c` while the main program is running.

- **View logs:**
  ```sh
  logviewer accesscontrol.log
  ```

- **Admin Commands (in-game chat):**
  ```
  @AC /help
  @AC /add user Notch
  @AC /list
  ```

### AutoCraft

The autocraft program runs in the background. Simply run it on a turtle with the correct peripheral setup (see `src/autocraft/main.ts`). It will automatically process packages placed in the designated chest.

```sh
autocraft
```

### TUI Example

Run the example program to see a demonstration of the `ccTUI` framework.

```sh
tuiExample
```

## Development

- **Lint and format the code:**
  ```sh
  just lint
  ```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
