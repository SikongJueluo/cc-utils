type PeripheralType =
  | "inventory"
  | "modem"
  | "wiredModem"
  | "blockReader"
  | "chatBox"
  | "playerDetector";
type BlockSide = "top" | "bottom" | "left" | "right" | "front" | "back";

// Declare the function signature for findBySide
function findByName(
  devType: "inventory",
  devName?: string,
): InventoryPeripheral | undefined;
function findByName(
  devType: "modem",
  devName?: string,
): ModemPeripheral | undefined;
function findByName(
  devType: "wiredModem",
  devName?: string,
): WiredModemPeripheral | undefined;
function findByName(
  devType: "blockReader",
  devName?: string,
): BlockReaderPeripheral | undefined;
function findByName(
  devType: "chatBox",
  devName?: string,
): ChatBoxPeripheral | undefined;
function findByName(
  devType: "playerDetector",
  devName?: string,
): PlayerDetectorPeripheral | undefined;
function findByName(
  devType: PeripheralType,
  side: BlockSide,
): IPeripheral | undefined;
function findByName(
  devType: PeripheralType,
  devName?: string,
): IPeripheral | undefined;

// Implement the function signature for findByName
function findByName(
  devType: PeripheralType,
  devName?: string,
): IPeripheral | undefined {
  let dev;
  if (devName == undefined) {
    dev = peripheral.find(devType)[0];
  } else {
    dev = peripheral.find(
      devType == "wiredModem" ? "modem" : devType,
      (name: string, _) => {
        return name == devName;
      },
    )[0];
  }

  // Seperate Modem and wiredModem
  if (
    devType == "modem" &&
    ((dev as ModemPeripheral).isWireless == undefined ||
      (dev as ModemPeripheral).isWireless() == false)
  )
    return undefined;

  if (
    devType == "wiredModem" &&
    (dev as ModemPeripheral).isWireless != undefined &&
    (dev as ModemPeripheral).isWireless() == true
  )
    return undefined;

  if (dev != undefined && peripheral.getType(dev) != devType) return undefined;

  return dev;
}

// Declare the function signature for findBySideRequired
function findByNameRequired(
  devType: "inventory",
  devName?: string,
): InventoryPeripheral;
function findByNameRequired(
  devType: "modem",
  devName?: string,
): ModemPeripheral;
function findByNameRequired(
  devType: "wiredModem",
  devName?: string,
): WiredModemPeripheral;
function findByNameRequired(
  devType: "blockReader",
  devName?: string,
): BlockReaderPeripheral;
function findByNameRequired(
  devType: "chatBox",
  devName?: string,
): ChatBoxPeripheral;
function findByNameRequired(
  devType: "playerDetector",
  devName?: string,
): PlayerDetectorPeripheral;
function findByNameRequired<T extends IPeripheral>(
  devType: PeripheralType,
  side: BlockSide,
): T;
function findByNameRequired<T extends IPeripheral>(
  devType: PeripheralType,
  devName?: string,
): T;

// Implement the function signature for findBySideRequired
function findByNameRequired<T extends IPeripheral>(
  devType: PeripheralType,
  devName?: string,
): T {
  const dev = findByName(devType, devName);
  if (dev == undefined) {
    throw new Error(
      `Required peripheral of type '${devType}' not found with name '${devName}'`,
    );
  }
  return dev as T;
}

export { PeripheralType, BlockSide, findByName, findByNameRequired };
