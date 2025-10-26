import { CraftManager } from "@/lib/CraftManager";
import { CCLog } from "@/lib/ccLog";

const logger = new CCLog("autocraft.log");

const peripheralsNames = {
  packagesContainer: "minecraft:chest_10",
  itemsContainer: "minecraft:chest_9",
  packageExtractor: "create:packager_1",
  blockReader: "front",
  wiredModem: "back",
  redstone: "front",
};

const packagesContainer = peripheral.wrap(
  peripheralsNames.packagesContainer,
) as InventoryPeripheral;
const itemsContainer = peripheral.wrap(
  peripheralsNames.itemsContainer,
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
  CHECK_PACK,
  READ_RECIPE,
  PULL_ITEMS,
  CRAFT_OUTPUT,
}

function main() {
  const craftManager = new CraftManager(turtleLocalName);
  let hasPackage = redstone.getInput(peripheralsNames.redstone);
  // let currentState = State.IDLE;
  // let nextState = State.IDLE;

  logger.info("AutoCraft init finished...");
  while (true) {
    if (!hasPackage) os.pullEvent("redstone");
    hasPackage = redstone.getInput(peripheralsNames.redstone);
    if (!hasPackage) {
      continue;
    }
    logger.info(`Package detected`);

    const itemsInfo = packagesContainer.list();
    for (const key in itemsInfo) {
      const slot = parseInt(key);
      const item = itemsInfo[slot];
      logger.info(`${item.count}x ${item.name} in slot ${key}`);

      // Get package NBT
      packagesContainer.pushItems(turtleLocalName, slot);
      const packageInfo = blockReader.getBlockData()!.Items[1];
      // log.info(textutils.serialise(packageInfo));

      // Get recipe
      const packageRecipes = CraftManager.getPackageRecipe(packageInfo);

      // No recipe, just extract package
      if (packageRecipes.isNone()) {
        packageExtractor.pullItems(turtleLocalName, 1);
        logger.info(`No recipe, just pass`);
        continue;
      }

      // Extract package
      // log.info(`Get recipe ${textutils.serialise(recipe)}`);
      packageExtractor.pullItems(turtleLocalName, 1);

      // Pull and craft multi recipe
      for (const recipe of packageRecipes.value) {
        let craftOutputItem: BlockItemDetailData | undefined = undefined;
        let restCraftCnt = recipe.Count;

        do {
          // Clear workbench
          craftManager.pushAll(itemsContainer);

          logger.info(`Pull items according to a recipe`);
          const craftCnt = craftManager
            .pullItems(recipe, itemsContainer, restCraftCnt)
            .unwrapOrElse((error) => {
              logger.error(error.message);
              return 0;
            });

          if (craftCnt == 0) break;
          craftManager.craft();
          logger.info(`Craft ${craftCnt} times`);
          restCraftCnt -= craftCnt;

          // Get output item
          craftOutputItem ??= blockReader.getBlockData()!.Items[1];
        } while (restCraftCnt > 0);

        // Finally output
        if (restCraftCnt > 0) {
          logger.warn(`Only craft ${recipe.Count - restCraftCnt} times`);
        } else {
          logger.info(`Finish craft ${recipe.Count}x ${craftOutputItem?.id}`);
        }
        craftManager.pushAll(itemsContainer);
      }
    }
  }
}

try {
  main();
} catch (error: unknown) {
  logger.error(textutils.serialise(error as object));
} finally {
  logger.close();
}
