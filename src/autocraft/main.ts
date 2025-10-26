import {
  CraftManager,
  CraftRecipe,
  CreatePackageTag,
} from "@/lib/CraftManager";
import { CCLog, LogLevel } from "@/lib/ccLog";
import { Queue } from "@/lib/datatype/Queue";

const logger = new CCLog("autocraft.log", { outputMinLevel: LogLevel.Info });

const peripheralsNames = {
  // packsInventory: "minecraft:chest_14",
  // itemsInventory: "minecraft:chest_15",
  // packageExtractor: "create:packager_3",
  blockReader: "bottom",
  wiredModem: "right",
  redstone: "left",
  packsInventory: "minecraft:chest_1121",
  itemsInventory: "minecraft:chest_1120",
  packageExtractor: "create:packager_0",
};

const packsInventory = peripheral.wrap(
  peripheralsNames.packsInventory,
) as InventoryPeripheral;
const itemsInventory = peripheral.wrap(
  peripheralsNames.itemsInventory,
) as InventoryPeripheral;
const packageExtractor = peripheral.wrap(
  peripheralsNames.packageExtractor,
) as InventoryPeripheral;
const blockReader = peripheral.wrap(
  peripheralsNames.blockReader,
) as BlockReaderPeripheral;
const wiredModem = peripheral.wrap(
  peripheralsNames.wiredModem,
) as WiredModemPeripheral;
const turtleLocalName = wiredModem.getNameLocal();

enum State {
  IDLE,
  READ_RECIPE,
  CRAFT_OUTPUT,
}

function main() {
  const craftManager = new CraftManager(turtleLocalName, itemsInventory);
  const recipesQueue = new Queue<CraftRecipe>();
  const recipesWaitingMap = new Map<number, CraftRecipe[] | CraftRecipe>();
  let currentState = State.IDLE;
  let nextState = State.IDLE;
  let hasPackage = redstone.getInput(peripheralsNames.redstone);
  while (hasPackage) {
    hasPackage = redstone.getInput(peripheralsNames.redstone);
    logger.warn("redstone activated when init, please clear inventory");
    sleep(1);
  }

  logger.info("AutoCraft init finished...");
  while (true) {
    // Switch state
    switch (currentState) {
      case State.IDLE: {
        nextState = hasPackage ? State.READ_RECIPE : State.IDLE;
        break;
      }
      case State.READ_RECIPE: {
        nextState = hasPackage ? State.READ_RECIPE : State.CRAFT_OUTPUT;
        break;
      }
      case State.CRAFT_OUTPUT: {
        nextState =
          recipesQueue.size() > 0
            ? State.CRAFT_OUTPUT
            : hasPackage
              ? State.READ_RECIPE
              : State.IDLE;
        break;
      }
      default: {
        logger.error(`Unknown state`);
        nextState = hasPackage ? State.READ_RECIPE : State.IDLE;
        break;
      }
    }

    // State logic
    switch (currentState) {
      case State.IDLE: {
        if (!hasPackage) os.pullEvent("redstone");
        hasPackage = redstone.getInput(peripheralsNames.redstone);
        break;
      }

      case State.READ_RECIPE: {
        logger.info(`Package detected`);
        const packagesInfoRecord = packsInventory.list();
        for (const key in packagesInfoRecord) {
          const slotNum = parseInt(key);
          packsInventory.pushItems(turtleLocalName, slotNum);

          // Get package NBT
          logger.debug(
            `Turtle:\n${textutils.serialise(blockReader.getBlockData()!, { allow_repetitions: true })}`,
          );
          const packageDetailInfo = blockReader.getBlockData()?.Items[1];
          if (packageDetailInfo === undefined) {
            logger.error(`Package detail info not found`);
            continue;
          }

          // Get OrderId and isFinal
          const packageOrderId = (packageDetailInfo.tag as CreatePackageTag)
            .Fragment.OrderId;
          const packageIsFinal =
            (packageDetailInfo.tag as CreatePackageTag).Fragment.IsFinal > 0
              ? true
              : false;

          // Get recipe
          const packageRecipes =
            CraftManager.getPackageRecipe(packageDetailInfo);
          if (packageRecipes.isSome()) {
            if (packageIsFinal) recipesQueue.enqueue(packageRecipes.value);
            else recipesWaitingMap.set(packageOrderId, packageRecipes.value);
          } else {
            if (packageIsFinal && recipesWaitingMap.has(packageOrderId)) {
              recipesQueue.enqueue(recipesWaitingMap.get(packageOrderId)!);
              recipesWaitingMap.delete(packageOrderId);
            } else {
              logger.debug(`No recipe, just pass`);
            }
          }
          packageExtractor.pullItems(turtleLocalName, 1);
        }

        if (
          currentState === State.READ_RECIPE &&
          nextState === State.CRAFT_OUTPUT
        ) {
          craftManager.initItemsMap();
        }

        break;
      }

      case State.CRAFT_OUTPUT: {
        // Check recipe
        const recipe = recipesQueue.dequeue();
        if (recipe === undefined) break;

        let restCraftCnt = recipe.Count;
        let maxSignleCraftCnt = restCraftCnt;

        let craftItemDetail: ItemDetail | undefined = undefined;
        do {
          // Clear workbench
          craftManager.clearTurtle();

          logger.info(`Pull items according to a recipe`);
          const craftCnt = craftManager
            .pullItemsWithRecipe(recipe, maxSignleCraftCnt)
            .unwrapOrElse((error) => {
              logger.error(error.message);
              return 0;
            });

          if (craftCnt == 0) break;
          if (craftCnt < maxSignleCraftCnt) maxSignleCraftCnt = craftCnt;
          const craftRet = craftManager.craft(maxSignleCraftCnt);
          craftItemDetail ??= craftRet;
          logger.info(`Craft ${craftCnt} times`);
          restCraftCnt -= craftCnt;
        } while (restCraftCnt > 0);

        // Finally output
        if (restCraftCnt > 0) {
          logger.warn(
            `Only craft ${recipe.Count - restCraftCnt}x ${craftItemDetail?.name ?? "UnknownItem"}`,
          );
        } else {
          logger.info(
            `Finish craft ${recipe.Count}x ${craftItemDetail?.name ?? "UnknownItem"}`,
          );
        }

        // Clear workbench and inventory
        const turtleItemSlots = Object.values(
          blockReader.getBlockData()!.Items,
        ).map((val) => val.Slot + 1);
        craftManager.clearTurtle(turtleItemSlots);

        break;
      }

      default: {
        sleep(1);
        break;
      }
    }

    // Check packages
    hasPackage = redstone.getInput(peripheralsNames.redstone);
    // State update
    currentState = nextState;
  }
}

try {
  main();
} catch (error: unknown) {
  logger.error(textutils.serialise(error as object));
} finally {
  logger.close();
}
