import { CCLog } from "./ccLog";

const log = new CCLog("CraftManager.log");

// ComputerCraft Turtle inventory layout:
// 1,  2,  3,  4
// 5,  6,  7,  8
// 9,  10, 11, 12
// 13, 14, 15, 16

const TURTLE_SIZE = 16;
// const CRAFT_SLOT_CNT = 9;
const CRAFT_SLOT_TABLE: number[] = [1, 2, 3, 5, 6, 7, 9, 10, 11];
// const REST_SLOT_CNT = 7;
// const REST_SLOT_TABLE: number[] = [4, 8, 12, 13, 14, 15, 16];

interface CreatePackageTag {
  Items: {
    Items: {
      id: string;
      Count: number;
      Slot: number;
    }[];
    Size: number;
  };
  Fragment: {
    Index: number;
    OrderContext: {
      OrderedCrafts: {
        Pattern: {
          Entries: {
            Item: {
              id: string;
              Count: number;
              tag?: object;
            };
            Amount: number;
          }[];
        };
        Count: number;
      }[];
      OrderedStacks: {
        Entries: {
          Item: {
            id: string;
            Count: number;
          };
          Amount: number;
        }[];
      };
    };
    IsFinal: number;
    OrderId: number;
    LinkIndex: number;
    IsFinalLink: number;
  };
  Address: string;
}

interface CraftRecipeItem {
  Item: {
    id: string;
    Count: number;
  };
  Amount: number;
}

interface CraftRecipe {
  PatternEntries: Record<number, CraftRecipeItem>;
  Count: number;
}

type CraftMode = "keep" | "keepProduct" | "keepIngredient";

class CraftManager {
  private localName: string;

  constructor(modem: WiredModemPeripheral | string) {
    if (turtle == undefined) {
      throw new Error("Script must be run in a turtle computer");
    }

    if (modem == undefined) {
      throw new Error("Please provide a valid modem");
    }

    let name = "";
    if (typeof modem === "string") {
      name = modem;
    } else {
      if (peripheral.getType(modem) !== "modem") {
        throw new Error("Please provide a valid modem");
      }

      name = modem.getNameLocal();
      if (name === null) {
        throw new Error("Please provide a valid modem");
      }
    }
    this.localName = name;
    // log.info(`Get turtle name : ${name}`);
  }

  public pushAll(outputInventory: InventoryPeripheral): void {
    for (let i = 1; i <= TURTLE_SIZE; i++) {
      outputInventory.pullItems(this.localName, i);
    }
  }

  public craft(dstInventory?: InventoryPeripheral, limit?: number): void {
    turtle.craft(limit);

    if (dstInventory != undefined) {
      dstInventory.pullItems(this.localName, 1, limit);
    }
  }

  public static getPackageRecipe(
    item: BlockItemDetailData,
  ): CraftRecipe[] | undefined {
    if (
      !item.id.includes("create:cardboard_package") ||
      (item.tag as CreatePackageTag)?.Fragment?.OrderContext
        ?.OrderedCrafts?.[0] == undefined
    ) {
      return undefined;
    }

    const orderedCraft = (item.tag as CreatePackageTag).Fragment.OrderContext
      .OrderedCrafts;
    return orderedCraft.map((value, _) => ({
      PatternEntries: value.Pattern.Entries,
      Count: value.Count,
    }));
  }

  public pullItems(
    recipe: CraftRecipe,
    inventory: InventoryPeripheral,
    limit: number,
  ): number {
    let maxCraftCount = limit;

    for (const index in recipe.PatternEntries) {
      const entry = recipe.PatternEntries[index];
      if (entry.Item.Count == 0 || entry.Item.id == "minecraft:air") {
        continue;
      }

      const ingredientList = inventory.list();
      let restCount = maxCraftCount;
      for (const key in ingredientList) {
        // Get item detail and check max count
        const slot = parseInt(key);
        const ingredient = inventory.getItemDetail(slot)!;
        if (entry.Item.id != ingredient.name) {
          continue;
        }

        const ingredientMaxCount = ingredient.maxCount;
        if (maxCraftCount > ingredientMaxCount) {
          maxCraftCount = ingredientMaxCount;
          restCount = maxCraftCount;
        }
        log.info(
          `Slot ${slot} ${ingredient.name} max count: ${ingredientMaxCount}`,
        );

        // TODO: Process multi count entry item
        if (ingredient.count >= restCount) {
          inventory.pushItems(
            this.localName,
            slot,
            restCount,
            CRAFT_SLOT_TABLE[parseInt(index) - 1],
          );
          restCount = 0;
          break;
        } else {
          inventory.pushItems(
            this.localName,
            slot,
            ingredient.count,
            CRAFT_SLOT_TABLE[parseInt(index) - 1],
          );
          restCount -= ingredient.count;
        }
      }

      if (restCount > 0) return 0;
    }

    return maxCraftCount;
  }
}

export {
  CraftManager,
  CraftRecipe,
  CraftMode,
  CraftRecipeItem,
  CreatePackageTag,
};
