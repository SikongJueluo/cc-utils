/// <reference path="./shared.d.ts" />

/**
 * Represents the Chat Box peripheral from Advanced Peripherals.
 * Used to interact with Minecraft's chat system.
 *
 * @see https://minecraft.wiki/w/Text_component_format
 * @see https://docs.advanced-peripherals.de/latest/peripherals/chat_box/
 */
/** @noSelf **/
declare interface ChatBoxPeripheral extends IPeripheral {
  /**
   * Broadcasts a message to the global chat or if range is specified it is sent to all players in the range.
   * The prefix will change the text that appears inside the brackets at the start of a message. Defaults to "AP".
   * To change the brackets used around the prefix you must specify a string like so: "[]", "()", "<>", ...
   * bracketColor specifies the color to use for the brackets, this must be in the MOTD code format.
   * If utf8Support is true: message, prefix, brackets, and bracketColor are all expected to be UTF8 encoded, using the utf8 standard library, unicode escape sequences, or similar.
   *
   * @param message The message to send
   * @param prefix The prefix to display in brackets at the start of the message (defaults to "AP")
   * @param brackets The bracket style around the prefix (e.g., "[]", "()", "<>")
   * @param bracketColor The color for the brackets in MOTD code format
   * @param range The range in blocks to send the message to players (if not global)
   * @param utf8Support Whether to use UTF8 encoding for the message
   * @returns true if the message is successfully sent, or nil and an error message if it fails
   */
  sendMessage(
    message: string,
    prefix?: string,
    brackets?: string,
    bracketColor?: string,
    range?: number,
    utf8Support?: boolean,
  ): LuaMultiReturn<[boolean, string | undefined]>;

  /**
   * Similar to sendMessage() this sends a message to one specific player. Specify the player to send the message to with the username parameter.
   *
   * @param message The message to send
   * @param username The username of the player to send the message to
   * @param prefix The prefix to display in brackets at the start of the message (defaults to "AP")
   * @param brackets The bracket style around the prefix (e.g., "[]", "()", "<>")
   * @param bracketColor The color for the brackets in MOTD code format
   * @param range The range in blocks to send the message to players (if not global)
   * @param utf8Support Whether to use UTF8 encoding for the message
   * @returns true if the message is successfully sent, or nil and an error message if it fails
   */
  sendMessageToPlayer(
    message: string,
    username: string,
    prefix?: string,
    brackets?: string,
    bracketColor?: string,
    range?: number,
    utf8Support?: boolean,
  ): LuaMultiReturn<[boolean, string | undefined]>;

  /**
   * Sends a toast to the specified player. The design of the toast is the classic notification design.
   * It's planned to add a custom rendered design in the future.
   *
   * @param message The message for the toast
   * @param title The title of the toast
   * @param username The username of the player to send the toast to
   * @param prefix The prefix to display in brackets at the start of the message (defaults to "AP")
   * @param brackets The bracket style around the prefix (e.g., "[]", "()", "<>")
   * @param bracketColor The color for the brackets in MOTD code format
   * @param range The range in blocks to send the message to players (if not global)
   * @param utf8Support Whether to use UTF8 encoding for the message
   * @returns true if the toast is successfully sent, or nil and an error message if it fails
   */
  sendToastToPlayer(
    message: string,
    title: string,
    username: string,
    prefix?: string,
    brackets?: string,
    bracketColor?: string,
    range?: number,
    utf8Support?: boolean,
  ): LuaMultiReturn<[boolean, string | undefined]>;

  /**
   * This function is fundamentally the same as sendMessage() except it takes a Minecraft text component as the first parameter.
   * Find out more information on how the text component format works on the minecraft wiki. You can generate the json at minecraft.tools.
   *
   * @param json The Minecraft text component to send (as JSON string)
   * @param prefix The prefix to display in brackets at the start of the message (defaults to "AP")
   * @param brackets The bracket style around the prefix (e.g., "[]", "()", "<>")
   * @param bracketColor The color for the brackets in MOTD code format
   * @param range The range in blocks to send the message to players (if not global)
   * @param utf8Support Whether to use UTF8 encoding for the message
   * @returns true if the message is successfully sent, or nil and an error message if it fails
   */
  sendFormattedMessage(
    json: string,
    prefix?: string,
    brackets?: string,
    bracketColor?: string,
    range?: number,
    utf8Support?: boolean,
  ): LuaMultiReturn<[boolean, string | undefined]>;

  /**
   * Similar to sendFormattedMessage() this sends a formatted message to one specific player. Specify the player to send the message to with the username parameter.
   *
   * @param json The Minecraft text component to send (as JSON string)
   * @param username The username of the player to send the message to
   * @param prefix The prefix to display in brackets at the start of the message (defaults to "AP")
   * @param brackets The bracket style around the prefix (e.g., "[]", "()", "<>")
   * @param bracketColor The color for the brackets in MOTD code format
   * @param range The range in blocks to send the message to players (if not global)
   * @param utf8Support Whether to use UTF8 encoding for the message
   * @returns true if the message is successfully sent, or nil and an error message if it fails
   */
  sendFormattedMessageToPlayer(
    json: string,
    username: string,
    prefix?: string,
    brackets?: string,
    bracketColor?: string,
    range?: number,
    utf8Support?: boolean,
  ): LuaMultiReturn<[boolean, string | undefined]>;

  /**
   * This function is fundamentally the same as sendToast() except it takes a Minecraft text component as the first and second parameter.
   * Find out more information on how the text component format works on the minecraft wiki. You can generate the json at minecraft.tools.
   *
   * @param messageJson The Minecraft text component for the message (as JSON string)
   * @param titleJson The Minecraft text component for the title (as JSON string)
   * @param username The username of the player to send the toast to
   * @param prefix The prefix to display in brackets at the start of the message (defaults to "AP")
   * @param brackets The bracket style around the prefix (e.g., "[]", "()", "<>")
   * @param bracketColor The color for the brackets in MOTD code format
   * @param range The range in blocks to send the message to players (if not global)
   * @param utf8Support Whether to use UTF8 encoding for the message
   * @returns true if the toast is successfully sent, or nil and an error message if it fails
   */
  sendFormattedToastToPlayer(
    messageJson: string,
    titleJson: string,
    username: string,
    prefix?: string,
    brackets?: string,
    bracketColor?: string,
    range?: number,
    utf8Support?: boolean,
  ): LuaMultiReturn<[boolean, string | undefined]>;
}
