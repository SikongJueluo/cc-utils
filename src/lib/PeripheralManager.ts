type PeripheralType = "inventory" | "modem" | "wiredModem" | "blockReader";
type BlockSide = "top" | "bottom" | "left" | "right" | "front" | "back";

// Declare the function signature for findBySide
function findByName(
  devType: "inventory",
  devName: string,
): InventoryPeripheral | undefined;
function findByName(
  devType: "modem",
  devName: string,
): ModemPeripheral | undefined;
function findByName(
  devType: "wiredModem",
  devName: string,
): WiredModemPeripheral | undefined;
function findByName(
  devType: "blockReader",
  devName: string,
): BlockReaderPeripheral | undefined;
function findByName(
  devType: PeripheralType,
  side: BlockSide,
): IPeripheral | undefined;
function findByName(
  devType: PeripheralType,
  devName: string,
): IPeripheral | undefined;

// Implement the function signature for findBySide
function findByName(
  devType: PeripheralType,
  devName: string,
): IPeripheral | undefined {
  const dev = peripheral.find(
    devType == "wiredModem" ? "modem" : devType,
    (name: string, _) => {
      return name == devName;
    },
  )[0];

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

  return dev;
}

// Declare the function signature for findBySideRequired
function findByNameRequired(
  devType: "inventory",
  devName: string,
): InventoryPeripheral;
function findByNameRequired(devType: "modem", devName: string): ModemPeripheral;
function findByNameRequired(
  devType: "wiredModem",
  devName: string,
): WiredModemPeripheral;
function findByNameRequired(
  devType: "blockReader",
  devName: string,
): BlockReaderPeripheral;
function findByNameRequired<T extends IPeripheral>(
  devType: PeripheralType,
  side: BlockSide,
): T;
function findByNameRequired<T extends IPeripheral>(
  devType: PeripheralType,
  devName: string,
): T;

// Implement the function signature for findBySideRequired
function findByNameRequired<T extends IPeripheral>(
  devType: PeripheralType,
  side: string,
): T {
  const dev = findByName(devType, side);
  if (!dev) {
    throw new Error(
      `Required peripheral of type '${devType}' not found on side '${side}'`,
    );
  }
  return dev as T;
}

export { PeripheralType, BlockSide, findByName, findByNameRequired };
