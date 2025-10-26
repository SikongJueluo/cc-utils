import { Queue } from "./datatype/Queue";
import { Result, Ok, Err, Option, Some, None } from "./thirdparty/ts-result-es";

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

interface InventorySlotInfo {
  name: string;
  count: number;
  maxCount: number;
  slotNum: number;
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
  ): Option<CraftRecipe[]> {
    if (
      !item.id.includes("create:cardboard_package") ||
      (item.tag as CreatePackageTag)?.Fragment?.OrderContext
        ?.OrderedCrafts?.[0] == undefined
    ) {
      return None;
    }

    const orderedCraft = (item.tag as CreatePackageTag).Fragment.OrderContext
      .OrderedCrafts;
    return new Some(
      orderedCraft.map((value, _) => ({
        PatternEntries: value.Pattern.Entries,
        Count: value.Count,
      })),
    );
  }

  public pullItems(
    recipe: CraftRecipe,
    srcInventory: InventoryPeripheral,
    craftCnt: number,
  ): Result<number> {
    // Initialize hash map
    const ingredientList = srcInventory.list();
    const ingredientMap = new Map<string, Queue<InventorySlotInfo>>();
    for (const key in ingredientList) {
      const slotNum = parseInt(key);
      const item = srcInventory.getItemDetail(slotNum)!;

      if (ingredientMap.has(item.name)) {
        ingredientMap.get(item.name)!.enqueue({
          name: item.name,
          slotNum: slotNum,
          count: item.count,
          maxCount: item.maxCount,
        });
      } else {
        ingredientMap.set(
          item.name,
          new Queue<InventorySlotInfo>([
            {
              name: item.name,
              slotNum: slotNum,
              count: item.count,
              maxCount: item.maxCount,
            },
          ]),
        );
      }
    }

    let maxCraftCnt = craftCnt;
    for (const index in recipe.PatternEntries) {
      const entry = recipe.PatternEntries[index];
      if (entry.Item.Count == 0 || entry.Item.id == "minecraft:air") {
        continue;
      }

      if (!ingredientMap.has(entry.Item.id))
        return new Err(Error(`No ingredient match ${entry.Item.id}`));

      const ingredient = ingredientMap.get(entry.Item.id)!;
      let restCraftCnt = maxCraftCnt;
      while (restCraftCnt > 0 && ingredient.size() > 0) {
        const slotItem = ingredient.dequeue()!;

        // Check item max stack count
        if (slotItem.maxCount < maxCraftCnt) {
          maxCraftCnt = slotItem.maxCount;
          restCraftCnt = maxCraftCnt;
        }

        if (slotItem.count >= restCraftCnt) {
          const pushItemsCnt = srcInventory.pushItems(
            this.localName,
            slotItem.slotNum,
            restCraftCnt,
            CRAFT_SLOT_TABLE[index],
          );
          if (pushItemsCnt !== restCraftCnt)
            return new Err(
              Error(
                `Try to get items ${restCraftCnt}x "${slotItem.name}" from inventory, but only get ${pushItemsCnt}x`,
              ),
            );
          if (slotItem.count > restCraftCnt) {
            ingredient.enqueue({
              ...slotItem,
              count: slotItem.count - restCraftCnt,
            });
          }
          restCraftCnt = 0;
        } else {
          const pushItemsCnt = srcInventory.pushItems(
            this.localName,
            slotItem.slotNum,
            slotItem.count,
            CRAFT_SLOT_TABLE[index],
          );
          if (pushItemsCnt !== slotItem.count)
            return new Err(
              Error(
                `Try to get items ${slotItem.count}x "${slotItem.name}" from inventory, but only get ${pushItemsCnt}x`,
              ),
            );
          restCraftCnt -= slotItem.count;
        }
      }

      if (restCraftCnt > 0)
        return new Err(Error("Not enough items in inventory"));
    }

    return new Ok(maxCraftCnt);
  }
}

export {
  CraftManager,
  CraftRecipe,
  CraftMode,
  CraftRecipeItem,
  CreatePackageTag,
};
