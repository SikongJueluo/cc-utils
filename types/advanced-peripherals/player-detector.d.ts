/**
 * Represents the Player Detector peripheral from Advanced Peripherals.
 * Used to detect and track players in the world.
 *
 * @see https://docs.advanced-peripherals.de/0.7/peripherals/player_detector/
 */
/** @noSelf **/
declare interface PlayerDetectorPeripheral extends IPeripheral {
  /**
   * Returns information about the player with the specified username.
   *
   * @param username The player's username to look up
   * @returns A table containing player information, or nil if the player is not found
   */
  getPlayerPos(username: string): PlayerInfo | undefined;

  /**
   * Returns information about the player with the specified username.
   * Alternative name for getPlayerPos.
   *
   * @param username The player's username to look up
   * @returns A table containing player information, or nil if the player is not found
   */
  getPlayer(username: string): PlayerInfo | undefined;

  /**
   * Returns a list of all online players.
   *
   * @returns Table containing all online players as an array of usernames
   */
  getOnlinePlayers(): string[];

  /**
   * Returns a list of players within the given range of the peripheral.
   *
   * @param range The range to search for players
   * @returns Array containing usernames of players within range
   */
  getPlayersInRange(range: number): string[];

  /**
   * Returns a list of players within the 2 positions posOne and posTwo.
   *
   * @param posOne Position with x, y, z coordinates
   * @param posTwo Position with x, y, z coordinates
   * @returns Array containing usernames of players within the specified coordinates
   */
  getPlayersInCoords(posOne: Coordinate, posTwo: Coordinate): string[];

  /**
   * Returns a list of players within a cuboid centered at the peripheral.
   *
   * @param w Width of the cuboid (x-axis)
   * @param h Height of the cuboid (y-axis)
   * @param d Depth of the cuboid (z-axis)
   * @returns Array containing usernames of players within the specified cuboid
   */
  getPlayersInCubic(w: number, h: number, d: number): string[];

  /**
   * Returns true if the player whose username matches the provided username is within the given range of the peripheral.
   *
   * @param range The range to check
   * @param username The player's username to check
   * @returns Boolean indicating if the player is in range
   */
  isPlayerInRange(range: number, username: string): boolean;

  /**
   * Returns true if the player is within the 2 positions.
   *
   * @param posOne Position with x, y, z coordinates
   * @param posTwo Position with x, y, z coordinates
   * @param username The player's username to check
   * @returns Boolean indicating if the player is in the specified coordinates
   */
  isPlayerInCoords(
    posOne: Coordinate,
    posTwo: Coordinate,
    username: string,
  ): boolean;

  /**
   * Returns true if the player is within the cuboid centered at the peripheral.
   *
   * @param w Width of the cuboid (x-axis)
   * @param h Height of the cuboid (y-axis)
   * @param d Depth of the cuboid (z-axis)
   * @param username The player's username to check
   * @returns Boolean indicating if the player is in the specified cuboid
   */
  isPlayerInCubic(w: number, h: number, d: number, username: string): boolean;

  /**
   * Returns true if there is any player in the given range.
   *
   * @param range The range to check
   * @returns Boolean indicating if any player is in range
   */
  isPlayersInRange(range: number): boolean;

  /**
   * Returns true if any player is within the 2 positions.
   *
   * @param posOne Position with x, y, z coordinates
   * @param posTwo Position with x, y, z coordinates
   * @returns Boolean indicating if any player is in the specified coordinates
   */
  isPlayersInCoords(posOne: Coordinate, posTwo: Coordinate): boolean;

  /**
   * Returns true if any player is within the cuboid centered at the peripheral.
   *
   * @param w Width of the cuboid (x-axis)
   * @param h Height of the cuboid (y-axis)
   * @param d Depth of the cuboid (z-axis)
   * @returns Boolean indicating if any player is in the specified cuboid
   */
  isPlayersInCubic(w: number, h: number, d: number): boolean;
}

/**
 * Represents a coordinate in 3D space.
 */
declare interface Coordinate {
  /**
   * The x coordinate.
   */
  x: number;
  /**
   * The y coordinate.
   */
  y: number;
  /**
   * The z coordinate.
   */
  z: number;
}

/**
 * Contains detailed information about a player.
 */
declare interface PlayerInfo {
  /**
   * The dimension the player is in.
   */
  dimension: string;
  /**
   * The height of the player's eyes.
   */
  eyeHeight: number;
  /**
   * The pitch of the player's head.
   */
  pitch: number;
  /**
   * The health of the player.
   */
  health: number;
  /**
   * The max health of the player.
   */
  maxHealth: number;
  /**
   * The air supply of the player.
   */
  airSupply: number;
  /**
   * The respawn position of the player.
   */
  respawnPosition: number;
  /**
   * The respawn dimension of the player.
   */
  respawnDimension: number;
  /**
   * The respawn angle of the player in degrees.
   */
  respawnAngle: number;
  /**
   * The yaw of the player's head.
   */
  yaw: number;
  /**
   * The x coordinate.
   */
  x: number;
  /**
   * The y coordinate.
   */
  y: number;
  /**
   * The z coordinate.
   */
  z: number;
}

/**
 * Player click event type for the Player Detector peripheral.
 * Fires when a player clicks on the block.
 */
declare interface PlayerClickEvent {
  /**
   * The name of the event.
   */
  event: "playerClick";
  /**
   * The username of the player who clicked the block.
   */
  username: string;
  /**
   * The name of the peripheral like playerDetector_4.
   */
  devicename: string;
}

/**
 * Player join event type for the Player Detector peripheral.
 * Fires when a player joins the world/a server.
 */
declare interface PlayerJoinEvent {
  /**
   * The name of the event.
   */
  event: "playerJoin";
  /**
   * The username of the player who joined.
   */
  username: string;
  /**
   * The resource id of the dimension the player is in.
   */
  dimension: string;
}

/**
 * Player leave event type for the Player Detector peripheral.
 * Fires when a player leaves the world/a server.
 */
declare interface PlayerLeaveEvent {
  /**
   * The name of the event.
   */
  event: "playerLeave";
  /**
   * The username of the player who left.
   */
  username: string;
  /**
   * The resource id of the dimension the player was in.
   */
  dimension: string;
}

/**
 * Player changed dimension event type for the Player Detector peripheral.
 * Fires when a player changes dimensions.
 */
declare interface PlayerChangedDimensionEvent {
  /**
   * The name of the event.
   */
  event: "playerChangedDimension";
  /**
   * The username of the player who changed dimensions.
   */
  username: string;
  /**
   * The resource id of the dimension the player was in.
   */
  fromDim: string;
  /**
   * The resource id of the dimension the player is in.
   */
  toDim: string;
}
