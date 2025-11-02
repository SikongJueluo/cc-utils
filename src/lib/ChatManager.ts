import { Queue } from "./datatype/Queue";
import { ChatBoxEvent, pullEventAs } from "./event";
import { Result, Ok, Err } from "./thirdparty/ts-result-es";
import { gTimerManager } from "./TimerManager";

/**
 * Chat manager error types
 */
export interface ChatManagerError {
  kind: "ChatManager";
  reason: string;
  chatboxIndex?: number;
}

export interface NoIdleChatboxError {
  kind: "NoIdleChatbox";
  reason: "All chatboxes are busy";
}

export interface SendFailureError {
  kind: "SendFailure";
  reason: string;
  chatboxIndex: number;
}

export interface EmptyBufferError {
  kind: "EmptyBuffer";
  reason: "No messages in buffer";
}

export type ChatError =
  | ChatManagerError
  | NoIdleChatboxError
  | SendFailureError
  | EmptyBufferError;

/**
 * Base interface for chat messages and toasts
 */
interface ChatBasicMessage {
  message: string | MinecraftTextComponent | MinecraftTextComponent[];
  prefix?: string;
  brackets?: string;
  bracketColor?: string;
  range?: number;
  utf8Support?: boolean;
}

/**
 * Interface for chat toast notifications
 */
export interface ChatToast extends ChatBasicMessage {
  /** Target player username to send the toast to */
  targetPlayer: string;
  /** Title of the toast notification */
  title: string | MinecraftTextComponent | MinecraftTextComponent[];
}

/**
 * Interface for regular chat messages
 */
export interface ChatMessage extends ChatBasicMessage {
  /** Optional target player username for private messages */
  targetPlayer?: string;
}

/**
 * ChatManager class for managing multiple ChatBox peripherals
 * Handles message queuing, sending with cooldown management, and event receiving
 * Uses Result types for robust error handling
 */
export class ChatManager {
  /** Array of all available ChatBox peripherals */
  private chatboxes: ChatBoxPeripheral[];

  /** Queue for pending chat messages */
  private messageQueue = new Queue<ChatMessage>();

  /** Queue for pending toast notifications */
  private toastQueue = new Queue<ChatToast>();

  /** Buffer for received chat events */
  private chatBuffer = new Queue<ChatBoxEvent>();

  /** Array tracking which chatboxes are currently idle (not in cooldown) */
  private idleChatboxes: boolean[];

  /** Flag
 to control the running state of loops */
  private isRunning = false;

  /** Lua thread for managing chat operations */
  private thread?: LuaThread;

  /**
   * Constructor - initializes the ChatManager with available ChatBox peripherals
   * @param peripherals Array of ChatBox peripherals to manage
   */
  constructor(peripherals: ChatBoxPeripheral[]) {
    if (peripherals.length === 0) {
      throw new Error("ChatManager requires at least one ChatBox peripheral");
    }

    this.chatboxes = peripherals;
    // Initially all chatboxes are idle
    this.idleChatboxes = peripherals.map(() => true);
  }

  /**
   * Adds a chat message to the sending queue
   * @param message The chat message to send
   * @returns Result indicating success or failure
   */
  public sendMessage(message: ChatMessage): Result<void, ChatManagerError> {
    try {
      this.messageQueue.enqueue(message);
      return new Ok(undefined);
    } catch (error) {
      return new Err({
        kind: "ChatManager",
        reason: `Failed to enqueue message: ${String(error)}`,
      });
    }
  }

  /**
   * Adds a toast notification to the sending queue
   * @param toast The toast notification to send
   * @returns Result indicating success or failure
   */
  public sendToast(toast: ChatToast): Result<void, ChatManagerError> {
    try {
      this.toastQueue.enqueue(toast);
      return new Ok(undefined);
    } catch (error) {
      return new Err({
        kind: "ChatManager",
        reason: `Failed to enqueue toast: ${String(error)}`,
      });
    }
  }

  /**
   * Retrieves and removes the next received chat event from the buffer
   * @returns Result containing the chat event or an error if buffer is empty
   */
  public getReceivedMessage(): Result<ChatBoxEvent, EmptyBufferError> {
    const event = this.chatBuffer.dequeue();
    if (event === undefined) {
      return new Err({
        kind: "EmptyBuffer",
        reason: "No messages in buffer",
      });
    }
    return new Ok(event);
  }

  /**
   * Finds the first available (idle) chatbox
   * @returns Result containing chatbox index or error if none available
   */
  private findIdleChatbox(): Result<number, NoIdleChatboxError> {
    for (let i = 0; i < this.idleChatboxes.length; i++) {
      if (this.idleChatboxes[i]) {
        return new Ok(i);
      }
    }
    return new Err({
      kind: "NoIdleChatbox",
      reason: "All chatboxes are busy",
    });
  }

  /**
   * Marks a chatbox as busy and sets up a timer to mark it as idle after cooldown
   * @param chatboxIndex Index of the chatbox to mark as busy
   * @returns Result indicating success or failure
   */
  private setChatboxBusy(chatboxIndex: number): Result<void, ChatManagerError> {
    if (chatboxIndex < 0 || chatboxIndex >= this.idleChatboxes.length) {
      return new Err({
        kind: "ChatManager",
        reason: "Invalid chatbox index",
        chatboxIndex,
      });
    }

    this.idleChatboxes[chatboxIndex] = false;

    if (!gTimerManager.status()) {
      return new Err({
        kind: "ChatManager",
        reason: "TimerManager is not running",
      });
    }

    gTimerManager.setTimeOut(1, () => {
      this.idleChatboxes[chatboxIndex] = true;
    });

    return Ok.EMPTY;
  }

  /**
   * Attempts to send a chat message using an available chatbox
   * @param message The message to send
   * @returns Result indicating success or failure with error details
   */
  private trySendMessage(message: ChatMessage): Result<void, ChatError> {
    const chatboxResult = this.findIdleChatbox();
    if (chatboxResult.isErr()) {
      return chatboxResult;
    }

    const chatboxIndex = chatboxResult.value;
    const chatbox = this.chatboxes[chatboxIndex];

    try {
      let success: boolean;
      let errorMsg: string | undefined;

      // Determine the appropriate sending method based on message properties
      if (message.targetPlayer !== undefined) {
        // Send private message to specific player
        if (typeof message.message === "string") {
          [success, errorMsg] = chatbox.sendMessageToPlayer(
            textutils.serialiseJSON(message.message, {
              unicode_strings: message.utf8Support,
            }),
            message.targetPlayer,
            textutils.serialiseJSON(message.prefix ?? "AP", {
              unicode_strings: message.utf8Support,
            }),
            message.brackets,
            message.bracketColor,
            message.range,
            message.utf8Support,
          );
        } else {
          // Handle MinecraftTextComponent for private message
          [success, errorMsg] = chatbox.sendFormattedMessageToPlayer(
            textutils.serialiseJSON(message.message, {
              unicode_strings: message.utf8Support,
              allow_repetitions: true,
            }),
            message.targetPlayer,
            textutils.serialiseJSON(message.prefix ?? "AP", {
              unicode_strings: message.utf8Support,
            }),
            message.brackets,
            message.bracketColor,
            message.range,
            message.utf8Support,
          );
        }
      } else {
        // Send global message
        if (typeof message.message === "string") {
          [success, errorMsg] = chatbox.sendMessage(
            textutils.serialiseJSON(message.message, {
              unicode_strings: message.utf8Support,
            }),
            textutils.serialiseJSON(message.prefix ?? "AP", {
              unicode_strings: message.utf8Support,
            }),
            message.brackets,
            message.bracketColor,
            message.range,
            message.utf8Support,
          );
        } else {
          // Handle MinecraftTextComponent for global message
          [success, errorMsg] = chatbox.sendFormattedMessage(
            textutils.serialiseJSON(message.message, {
              unicode_strings: message.utf8Support,
              allow_repetitions: true,
            }),
            textutils.serialiseJSON(message.prefix ?? "AP", {
              unicode_strings: message.utf8Support,
            }),
            message.brackets,
            message.bracketColor,
            message.range,
            message.utf8Support,
          );
        }
      }

      if (success) {
        // Mark chatbox as busy for cooldown period
        const busyResult = this.setChatboxBusy(chatboxIndex);
        if (busyResult.isErr()) {
          return busyResult;
        }
        return new Ok(undefined);
      } else {
        return new Err({
          kind: "SendFailure",
          reason: errorMsg ?? "Unknown send failure",
          chatboxIndex,
        });
      }
    } catch (error) {
      return new Err({
        kind: "SendFailure",
        reason: `Exception during send: ${String(error)}`,
        chatboxIndex,
      });
    }
  }

  /**
   * Attempts to send a toast notification using an available chatbox
   * @param toast The toast to send
   * @returns Result indicating success or failure with error details
   */
  private trySendToast(toast: ChatToast): Result<void, ChatError> {
    const chatboxResult = this.findIdleChatbox();
    if (chatboxResult.isErr()) {
      return chatboxResult;
    }

    const chatboxIndex = chatboxResult.value;
    const chatbox = this.chatboxes[chatboxIndex];

    try {
      let success: boolean;
      let errorMsg: string | undefined;

      // Send toast notification
      if (
        typeof toast.message === "string" &&
        typeof toast.title === "string"
      ) {
        [success, errorMsg] = chatbox.sendToastToPlayer(
          textutils.serialiseJSON(toast.message, {
            unicode_strings: toast.utf8Support,
          }),
          textutils.serialiseJSON(toast.title, {
            unicode_strings: toast.utf8Support,
          }),
          toast.targetPlayer,
          textutils.serialiseJSON(toast.prefix ?? "AP", {
            unicode_strings: toast.utf8Support,
          }),
          toast.brackets,
          toast.bracketColor,
          toast.range,
          toast.utf8Support,
        );
      } else {
        // Handle MinecraftTextComponent for toast
        const messageJson =
          typeof toast.message === "string"
            ? toast.message
            : textutils.serialiseJSON(toast.message, {
                unicode_strings: true,
                allow_repetitions: toast.utf8Support,
              });
        const titleJson =
          typeof toast.title === "string"
            ? toast.title
            : textutils.serialiseJSON(toast.title, {
                unicode_strings: true,
                allow_repetitions: toast.utf8Support,
              });

        [success, errorMsg] = chatbox.sendFormattedToastToPlayer(
          messageJson,
          titleJson,
          toast.targetPlayer,
          textutils.serialiseJSON(toast.prefix ?? "AP", {
            unicode_strings: toast.utf8Support,
          }),
          toast.brackets,
          toast.bracketColor,
          toast.range,
          toast.utf8Support,
        );
      }

      if (success) {
        // Mark chatbox as busy for cooldown period
        const busyResult = this.setChatboxBusy(chatboxIndex);
        if (busyResult.isErr()) {
          return busyResult;
        }
        return new Ok(undefined);
      } else {
        return new Err({
          kind: "SendFailure",
          reason: errorMsg ?? "Unknown toast send failure",
          chatboxIndex,
        });
      }
    } catch (error) {
      return new Err({
        kind: "SendFailure",
        reason: `Exception during toast send: ${String(error)}`,
        chatboxIndex,
      });
    }
  }

  /**
   * Main sending loop - continuously processes message and toast queues
   * Runs in a separate coroutine to handle sending with proper timing
   */
  private sendLoop(): void {
    while (this.isRunning) {
      let sentSomething = false;

      // Try to send a message if queue is not empty
      if (this.messageQueue.size() > 0) {
        const message = this.messageQueue.peek();
        if (message) {
          const result = this.trySendMessage(message);
          if (result.isOk()) {
            this.messageQueue.dequeue(); // Remove from queue only if successfully sent
            sentSomething = true;
          } else if (result.error.kind === "SendFailure") {
            // Log send failures but keep trying
            print(`Failed to send message: ${result.error.reason}`);
            this.messageQueue.dequeue(); // Remove failed message to prevent infinite retry
          }
          // For NoIdleChatbox errors, we keep the message in queue and try again later
        }
      }

      // Try to send a toast if queue is not empty
      if (this.toastQueue.size() > 0) {
        const toast = this.toastQueue.peek();
        if (toast) {
          const result = this.trySendToast(toast);
          if (result.isOk()) {
            this.toastQueue.dequeue(); // Remove from queue only if successfully sent
            sentSomething = true;
          } else if (result.error.kind === "SendFailure") {
            // Log send failures but keep trying
            print(`Failed to send toast: ${result.error.reason}`);
            this.toastQueue.dequeue(); // Remove failed toast to prevent infinite retry
          }
          // For NoIdleChatbox errors, we keep the toast in queue and try again later
        }
      }

      // Small sleep to prevent busy waiting and allow other coroutines to run
      if (!sentSomething) {
        sleep(0.1);
      }
    }
  }

  /**
   * Main receiving loop - continuously listens for chat events
   * Runs in a separate coroutine to handle incoming messages
   */
  private receiveLoop(): void {
    while (this.isRunning) {
      try {
        // Listen for chatbox_message events
        const event = pullEventAs(ChatBoxEvent, "chat");

        if (event) {
          // Store received event in buffer for user processing
          this.chatBuffer.enqueue(event);
        }
      } catch (error) {
        // Log receive errors but continue running
        print(`Error in receive loop: ${String(error)}`);
        sleep(0.1); // Brief pause before retrying
      }
    }
  }

  /**
   * Starts the ChatManager's main operation loops
   * Launches both sending and receiving coroutines in parallel
   * @returns Result indicating success or failure of startup
   */
  public run(): Result<void, ChatManagerError> {
    if (this.isRunning) {
      return new Err({
        kind: "ChatManager",
        reason: "ChatManager is already running",
      });
    }

    try {
      this.isRunning = true;

      // Start both send and receive loops in parallel
      parallel.waitForAll(
        () => this.sendLoop(),
        () => this.receiveLoop(),
      );

      return new Ok(undefined);
    } catch (error) {
      this.isRunning = false;
      return new Err({
        kind: "ChatManager",
        reason: `Failed to start ChatManager: ${String(error)}`,
      });
    }
  }

  /**
   * Starts the ChatManager asynchronously without blocking
   * Useful when you need to run other code alongside the ChatManager
   * @returns Result indicating success or failure of async startup
   */
  public runAsync(): Result<LuaThread, ChatManagerError> {
    if (this.isRunning) {
      return new Err({
        kind: "ChatManager",
        reason: "ChatManager is already running",
      });
    }

    try {
      this.isRunning = true;
      this.thread = coroutine.create(() => {
        const result = this.run();
        if (result.isErr()) {
          print(`ChatManager async error: ${result.error.reason}`);
        }
      });

      // Start the run method in a separate coroutine
      coroutine.resume(this.thread);

      return new Ok(this.thread);
    } catch (error) {
      this.isRunning = false;
      return new Err({
        kind: "ChatManager",
        reason: `Failed to start ChatManager async: ${String(error)}`,
      });
    }
  }

  /**
   * Stops the ChatManager loops gracefully
   * @returns Result indicating success or failure of shutdown
   */
  public stop(): Result<void, ChatManagerError> {
    if (!this.isRunning) {
      return new Err({
        kind: "ChatManager",
        reason: "ChatManager is not running",
      });
    }

    try {
      this.isRunning = false;
      return new Ok(undefined);
    } catch (error) {
      return new Err({
        kind: "ChatManager",
        reason: `Failed to stop ChatManager: ${String(error)}`,
      });
    }
  }

  /**
   * Gets the number of pending messages in the queue
   * @returns Number of pending messages
   */
  public getPendingMessageCount(): number {
    return this.messageQueue.size();
  }

  /**
   * Gets the number of pending toasts in the queue
   * @returns Number of pending toasts
   */
  public getPendingToastCount(): number {
    return this.toastQueue.size();
  }

  /**
   * Gets the number of received messages in the buffer
   * @returns Number of buffered received messages
   */
  public getBufferedMessageCount(): number {
    return this.chatBuffer.size();
  }

  /**
   * Gets the current status of all chatboxes
   * @returns Array of boolean values indicating which chatboxes are idle
   */
  public getChatboxStatus(): boolean[] {
    return [...this.idleChatboxes]; // Return a copy to prevent external modification
  }

  /**
   * Gets the running state of the ChatManager
   * @returns true if ChatManager is currently running
   */
  public isManagerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Clears all pending messages and toasts from queues
   * Does not affect the received message buffer
   * @returns Result indicating success or failure
   */
  public clearQueues(): Result<void, ChatManagerError> {
    try {
      this.messageQueue.clear();
      this.toastQueue.clear();
      return new Ok(undefined);
    } catch (error) {
      return new Err({
        kind: "ChatManager",
        reason: `Failed to clear queues: ${String(error)}`,
      });
    }
  }

  /**
   * Clears the received message buffer
   * @returns Result indicating success or failure
   */
  public clearBuffer(): Result<void, ChatManagerError> {
    try {
      this.chatBuffer.clear();
      return new Ok(undefined);
    } catch (error) {
      return new Err({
        kind: "ChatManager",
        reason: `Failed to clear buffer: ${String(error)}`,
      });
    }
  }

  /**
   * Tries to send a message immediately, bypassing the queue
   * @param message The message to send immediately
   * @returns Result indicating success or failure with error details
   */
  public sendMessageImmediate(message: ChatMessage): Result<void, ChatError> {
    return this.trySendMessage(message);
  }

  /**
   * Tries to send a toast immediately, bypassing the queue
   * @param toast The toast to send immediately
   * @returns Result indicating success or failure with error details
   */
  public sendToastImmediate(toast: ChatToast): Result<void, ChatError> {
    return this.trySendToast(toast);
  }
}
