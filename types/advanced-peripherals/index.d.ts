declare interface BlockItemDetailData {
  id: string;
  tag: object;
  Count: number;
  Slot: number;
}

declare interface BlockDetailData {
  Items: Record<number, BlockItemDetailData>;
}

declare class BlockReaderPeripheral {
  getBlockData(): BlockDetailData;
}
