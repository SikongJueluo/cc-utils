# ChatManager Documentation

## Introduction

`ChatManager` is a powerful utility for managing interactions with one or more `chatBox` peripherals in ComputerCraft. It simplifies the process of sending and receiving chat messages by handling complexities like peripheral cooldowns, message queuing, and asynchronous operations.

It is designed for applications that need to reliably send a high volume of messages or toasts without getting bogged down by peripheral limitations, or for applications that need to listen for commands or messages from players.

## Features

*   **Multi-Peripheral Management:** Seamlessly manages one or more `chatBox` peripherals.
*   **Message Queuing:** Automatically queues messages and toasts, sending them as chatboxes become available.
*   **Cooldown Handling:** Respects the 1-second cooldown of chatboxes to prevent message loss.
*   **Asynchronous Operation:** Can run in the background (`runAsync`) without blocking your main program loop.
*   **Message Buffering:** Receives and buffers incoming chat messages for your application to process.
*   **Queued and Immediate Sending:** Supports both adding messages to a queue and sending them immediately (if a chatbox is available).
*   **Rich Content Support:** Send simple strings or complex formatted messages using `MinecraftTextComponent`.
*   **Robust Error Handling:** Uses a `Result`-based API to make error handling explicit and reliable.
*   **Comprehensive API:** Provides methods for sending global messages, private messages, and toast notifications.

## Tutorial: Getting Started with ChatManager

Here’s how to integrate `ChatManager` into your project.

### 1. Initialization

First, find your available `chatBox` peripherals and create a `ChatManager` instance.

```typescript
import { ChatManager } from '@/lib/ChatManager';

// Find all available chatbox peripherals
const peripheralNames = peripheral.getNames();
const chatboxPeripherals: ChatBoxPeripheral[] = [];

for (const name of peripheralNames) {
  const peripheralType = peripheral.getType(name);
  if (peripheralType[0] === "chatBox") {
    const chatbox = peripheral.wrap(name) as ChatBoxPeripheral;
    chatboxPeripherals.push(chatbox);
  }
}

if (chatboxPeripherals.length === 0) {
  print("Error: No chatbox peripherals found.");
  return;
}

// Create the manager instance
const chatManager = new ChatManager(chatboxPeripherals);
```

### 2. Running the Manager

To start the sending and receiving loops, you must run the manager. For most use cases, running it asynchronously is best.

```typescript
// Start ChatManager in the background so it doesn't block the main program
const runResult = chatManager.runAsync();

if (runResult.isErr()) {
  print(`Warning: Failed to start ChatManager: ${runResult.error.reason}`);
} else {
  print("ChatManager started successfully!");
}

// Your main program logic can continue here...
```
**Important:** `ChatManager` relies on `gTimerManager` to handle cooldowns. Ensure you are also running the global timer manager in your application.
```typescript
import { gTimerManager } from "@/lib/TimerManager";

// In your main parallel loop
parallel.waitForAll(
  () => yourMainLoop(),
  () => chatManager.run(), // if you choose the blocking run
  () => gTimerManager.run()
);
```

### 3. Sending a Message (Queued)

Use `sendMessage` to add a message to the queue. `ChatManager` will send it as soon as a chatbox is free.

```typescript
// Send a global message
chatManager.sendMessage({
  message: "Hello, world!",
  prefix: "MySystem",
});

// Send a private message
chatManager.sendMessage({
  message: "This is a secret.",
  targetPlayer: "Steve",
  prefix: "Whisper",
});
```

### 4. Sending a Toast (Queued)

Similarly, use `sendToast` to queue a toast notification.

```typescript
chatManager.sendToast({
  title: "Server Alert",
  message: "Restart in 5 minutes!",
  targetPlayer: "Steve",
  prefix: "Admin",
});
```

### 5. Receiving Messages

Use `getReceivedMessage` to pull incoming chat events from the buffer. It's best to do this in a loop.

```typescript
function myCliLoop() {
  while (true) {
    const result = chatManager.getReceivedMessage();
    if (result.isOk()) {
      const event = result.value;
      print(`[${event.username}]: ${event.message}`);
      // Process the command or message...
    } else {
      // Buffer is empty, wait a bit before checking again
      sleep(0.5);
    }
  }
}
```

## Advanced Topics

### Immediate Sending

If you need to send a message right away and bypass the queue, use the `Immediate` methods. These will fail if no chatbox is currently available.

```typescript
const result = chatManager.sendMessageImmediate({
  message: "URGENT!",
  targetPlayer: "Admin",
});

if (result.isErr()) {
  if (result.error.kind === "NoIdleChatbox") {
    print("Could not send immediately: all chatboxes are busy.");
  } else {
    print(`Failed to send message: ${result.error.reason}`);
  }
}
```

### Rich Text Messages (`MinecraftTextComponent`)

You can send fully formatted messages by providing a `MinecraftTextComponent` object instead of a string.

```typescript
const richMessage: MinecraftTextComponent = {
  text: "This is ",
  color: "gold",
  extra: [
    { text: "important!", color: "red", bold: true }
  ],
};

chatManager.sendMessage({
  message: richMessage,
  targetPlayer: "AllPlayers",
  utf8Support: true, // Recommended for complex components
});
```

### Error Handling

Methods return a `Result` object (`Ok` or `Err`). Always check the result to handle potential failures gracefully.

```typescript
const result = chatManager.sendMessage(message);
if (result.isErr()) {
  logger.error(`Failed to queue message: ${result.error.reason}`);
}
```

The possible error `kind`s are:
*   `ChatManagerError`: General errors, e.g., failure to enqueue.
*   `NoIdleChatboxError`: Returned by `Immediate` methods when no chatbox is free.
*   `SendFailureError`: A hardware or permission error occurred during sending.
*   `EmptyBufferError`: Returned by `getReceivedMessage` when the buffer is empty.

### Status and Management

You can inspect and control the `ChatManager` at runtime.

```typescript
// Get the number of items waiting to be sent
const pending = chatManager.getPendingMessageCount();
print(`Messages in queue: ${pending}`);

// Get the number of received messages waiting to be processed
const buffered = chatManager.getBufferedMessageCount();
print(`Received messages in buffer: ${buffered}`);

// Get the status of each chatbox (true = idle, false = busy)
const statuses = chatManager.getChatboxStatus();

// Clear the sending queues
chatManager.clearQueues();

// Clear the received message buffer
chatManager.clearBuffer();

// Stop the manager's background loops
chatManager.stop();
```

## API Reference

### Core Class
*   `ChatManager(peripherals: ChatBoxPeripheral[])`

### Primary Methods
*   `run(): Result<void, ChatManagerError>`: Starts the manager (blocking).
*   `runAsync(): Result<LuaThread, ChatManagerError>`: Starts the manager in the background.
*   `stop(): Result<void, ChatManagerError>`: Stops the background loops.
*   `sendMessage(message: ChatMessage): Result<void, ChatManagerError>`: Queues a chat message.
*   `sendToast(toast: ChatToast): Result<void, ChatManagerError>`: Queues a toast.
*   `getReceivedMessage(): Result<ChatBoxEvent, EmptyBufferError>`: Retrieves a message from the receive buffer.
*   `sendMessageImmediate(message: ChatMessage): Result<void, ChatError>`: Sends a message immediately.
*   `sendToastImmediate(toast: ChatToast): Result<void, ChatError>`: Sends a toast immediately.

### Interfaces
*   `ChatMessage`
*   `ChatToast`
*   `ChatError` (union of all possible error types)