/// <reference path="./shared.d.ts" />

/**
 * Represents the Block Reader peripheral from Advanced Peripherals.
 * Used to read data about blocks in front of it.
 *
 * @see https://docs.advanced-peripherals.de/0.7/peripherals/block_reader/
 */
/** @noSelf **/
declare interface BlockReaderPeripheral extends IPeripheral {
  /**
   * Returns the registry name of the block (ex. minecraft:dirt).
   *
   * @returns The registry name of the block
   */
  getBlockName(): string;

  /**
   * Returns the block data of the block if block is a tile entity.
   *
   * @returns The block data table if the block is a tile entity, otherwise nil
   */
  getBlockData(): BlockDetailData | undefined;

  /**
   * Returns the properties of a block and its state.
   *
   * @returns The block states table if available, otherwise nil
   */
  getBlockStates(): Record<string, unknown> | undefined;

  /**
   * Returns true whether the block is a tile entity or not.
   *
   * @returns Boolean indicating if the block is a tile entity, or nil if unable to determine
   */
  isTileEntity(): boolean | undefined;
}
