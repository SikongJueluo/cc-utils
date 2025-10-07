import { CraftManager } from "@/lib/CraftManager";
import * as peripheralManager from "../lib/PeripheralManager";
import { CCLog } from "@/lib/ccLog";

const log = new CCLog("autocraft.log");

const peripheralsRelativeSides = {
  packagesContainer: "minecraft:chest_10",
  itemsContainer: "minecraft:chest_9",
  packageExtractor: "create:packager_1",
  blockReader: "front",
  wiredModem: "back",
};

function main() {
  const packagesContainer = peripheralManager.findByNameRequired(
    "inventory",
    peripheralsRelativeSides.packagesContainer,
  );

  const itemsContainer = peripheralManager.findByNameRequired(
    "inventory",
    peripheralsRelativeSides.itemsContainer,
  );

  const packageExtractor = peripheralManager.findByNameRequired(
    "inventory",
    peripheralsRelativeSides.packageExtractor,
  );

  const blockReader = peripheralManager.findByNameRequired(
    "blockReader",
    peripheralsRelativeSides.blockReader,
  );

  const wiredModem = peripheralManager.findByNameRequired(
    "wiredModem",
    peripheralsRelativeSides.wiredModem,
  );
  const turtleLocalName = wiredModem.getNameLocal();

  const craftManager = new CraftManager(turtleLocalName);

  let hasPackage = redstone.getInput("front");
  while (true) {
    if (!hasPackage) os.pullEvent("redstone");
    hasPackage = redstone.getInput("front");
    if (!hasPackage) {
      continue;
    }
    log.info(`Package detected`);

    const itemsInfo = packagesContainer.list();
    for (const key in itemsInfo) {
      const slot = parseInt(key);
      const item = itemsInfo[slot];
      log.info(`${item.count}x ${item.name} in slot ${key}`);

      // Get package NBT
      packagesContainer.pushItems(turtleLocalName, slot);
      const packageInfo = blockReader.getBlockData().Items[1];
      // log.info(textutils.serialise(packageInfo));

      // Get recipe
      const packageRecipes = CraftManager.getPackageRecipe(packageInfo);

      // No recipe, just extract package
      if (packageRecipes == undefined) {
        packageExtractor.pullItems(turtleLocalName, 1);
        log.info(`No recipe, just pass`);
        continue;
      }

      // Extract package
      // log.info(`Get recipe ${textutils.serialise(recipe)}`);
      packageExtractor.pullItems(turtleLocalName, 1);

      // Pull and craft multi recipe
      for (const recipe of packageRecipes) {
        let craftOutputItem: BlockItemDetailData | undefined = undefined;
        let restCraftCnt = recipe.Count;

        do {
          // Clear workbench
          craftManager.pushAll(itemsContainer);

          log.info(`Pull items according to a recipe`);
          const craftCnt = craftManager.pullItems(
            recipe,
            itemsContainer,
            restCraftCnt,
          );
          if (craftCnt == 0) break;
          craftManager.craft();
          log.info(`Craft ${craftCnt} times`);
          restCraftCnt -= craftCnt;

          // Get output item
          craftOutputItem ??= blockReader.getBlockData().Items[1];
        } while (restCraftCnt > 0);

        // Finally output
        if (restCraftCnt > 0) {
          log.warn(`Only craft ${recipe.Count - restCraftCnt} times`);
        } else {
          log.info(`Finish craft ${recipe.Count}x ${craftOutputItem?.id}`);
        }
        craftManager.pushAll(itemsContainer);
      }
    }
  }
}

try {
  main();
} catch (error: unknown) {
  log.error(textutils.serialise(error as object));
} finally {
  log.close();
}
