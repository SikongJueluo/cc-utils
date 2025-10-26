import { Queue } from "./datatype/Queue";
import { Result, Ok, Err, Option, Some, None } from "./thirdparty/ts-result-es";

// ComputerCraft Turtle inventory layout:
// 1,  2,  3,  4
// 5,  6,  7,  8
// 9,  10, 11, 12
// 13, 14, 15, 16

const TURTLE_SIZE = 16;
const CRAFT_OUTPUT_SLOT = 4;
// const CRAFT_SLOT_CNT = 9;
const CRAFT_SLOT_TABLE: number[] = [1, 2, 3, 5, 6, 7, 9, 10, 11];
// const REST_SLOT_CNT = 7;
// const REST_SLOT_TABLE: number[] = [4, 8, 12, 13, 14, 15, 16];

/**
 * Represents the NBT data of a Create mod package. This data is used for managing crafting and logistics,
 * especially in the context of multi-step crafting orders.
 * The structure is inspired by the logic in Create's own packaging and repackaging helpers.
 * @see https://github.com/Creators-of-Create/Create/blob/mc1.21.1/dev/src/main/java/com/simibubi/create/content/logistics/packager/repackager/PackageRepackageHelper.java
 */
interface CreatePackageTag {
  /**
   * The items contained within this package.
   */
  Items: {
    /**
     * A list of the items stored in the package.
     */
    Items: {
      id: string;
      Count: number;
      Slot: number;
    }[];
    /**
     * The number of slots in the package's inventory.
     */
    Size: number;
  };
  /**
   * Information about this package's role as a fragment of a larger crafting order.
   * This is used to track progress and manage dependencies in a distributed crafting system.
   */
  Fragment: {
    /**
     * The index of this fragment within the larger order.
     */
    Index: number;
    /**
     * The context of the overall order this fragment belongs to.
     */
    OrderContext: {
      /**
       * A list of crafting recipes required for the order.
       */
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
      /**
       * A list of pre-existing item stacks required for the order.
       */
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
    /**
     * Whether this is the final fragment in the sequence for this specific part of the order.
     */
    IsFinal: number;
    /**
     * The unique identifier for the overall order.
     */
    OrderId: number;
    /**
     * The index of this package in a linked list of packages for the same order.
     */
    LinkIndex: number;
    /**
     * Whether this is the last package in the linked list.
     */
    IsFinalLink: number;
  };
  /**
   * The destination address for this package.
   */
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
  slotCountQueue: Queue<{
    slotNum: number;
    count: number;
  }>;
  maxCount: number;
}

type CraftMode = "keep" | "keepProduct" | "keepIngredient";

class CraftManager {
  private localName: string;
  private inventory: InventoryPeripheral;

  private inventoryItemsMap = new Map<string, InventorySlotInfo>();

  constructor(
    modem: WiredModemPeripheral | string,
    srcInventory: InventoryPeripheral,
  ) {
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

    // Inventory
    this.inventory = srcInventory;
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

  public initItemsMap() {
    const ingredientList = this.inventory.list();
    for (const key in ingredientList) {
      const slotNum = parseInt(key);
      const item = this.inventory.getItemDetail(slotNum)!;

      if (this.inventoryItemsMap.has(item.name)) {
        this.inventoryItemsMap.get(item.name)!.slotCountQueue.enqueue({
          slotNum: slotNum,
          count: item.count,
        });
      } else {
        this.inventoryItemsMap.set(item.name, {
          name: item.name,
          maxCount: item.maxCount,
          slotCountQueue: new Queue<{ slotNum: number; count: number }>([
            { slotNum: slotNum, count: item.count },
          ]),
        });
      }
    }
  }

  public pullFromInventory(
    itemId: string,
    count?: number,
    toSlot?: number,
  ): Result<number> {
    const item = this.inventoryItemsMap.get(itemId);
    if (item === undefined || item.slotCountQueue.size() === 0)
      return new Err(Error(`No item match ${itemId}`));

    if (count === undefined) {
      const itemSlot = item.slotCountQueue.dequeue()!;
      const pullItemsCnt = this.inventory.pushItems(
        this.localName,
        itemSlot.slotNum,
        itemSlot.count,
        toSlot,
      );
      return new Ok(pullItemsCnt);
    }

    let restCount = count;
    while (restCount > 0 && item.slotCountQueue.size() > 0) {
      const itemSlot = item.slotCountQueue.dequeue()!;
      const pullItemsCnt = this.inventory.pushItems(
        this.localName,
        itemSlot.slotNum,
        Math.min(restCount, itemSlot.count),
        toSlot,
      );
      if (pullItemsCnt < itemSlot.count) {
        item.slotCountQueue.enqueue({
          slotNum: itemSlot.slotNum,
          count: itemSlot.count - pullItemsCnt,
        });
      }
      restCount -= pullItemsCnt;
    }

    return new Ok(count - restCount);
  }

  public pushToInventoryEmpty(
    fromSlot: number,
    count?: number,
  ): Result<number> {
    let emptySlot = 0;
    for (let i = this.inventory.size(); i > 0; i--) {
      const isEmpty = this.inventory.getItemDetail(i) === undefined;
      if (isEmpty) {
        emptySlot = i;
        break;
      }
    }

    if (emptySlot <= 0) return new Err(Error("No empty slot found"));

    return new Ok(
      this.inventory.pullItems(this.localName, fromSlot, count, emptySlot),
    );
  }

  public pushToInventory(fromSlot: number): Result<number> {
    const itemInfoDetail = turtle.getItemDetail(fromSlot) as
      | SlotDetail
      | undefined;
    if (itemInfoDetail === undefined) return new Ok(0);
    const inventoryItemInfo = this.inventoryItemsMap.get(itemInfoDetail.name);

    if (inventoryItemInfo === undefined) {
      return this.pushToInventoryEmpty(fromSlot, itemInfoDetail.count);
    }

    let restItemsCount = itemInfoDetail.count;
    for (const slotInfo of inventoryItemInfo.slotCountQueue) {
      const pullItemsCount = inventoryItemInfo.maxCount - slotInfo.count;
      if (pullItemsCount > 0) {
        this.inventory.pullItems(
          this.localName,
          fromSlot,
          pullItemsCount,
          slotInfo.slotNum,
        );
        restItemsCount -= pullItemsCount;
        if (restItemsCount <= 0) break;
      }
    }

    if (restItemsCount > 0) {
      const pushRet = this.pushToInventoryEmpty(fromSlot, restItemsCount);
      if (pushRet.isErr()) return pushRet;
    }

    return new Ok(itemInfoDetail.count);
  }

  public clearTurtle(slots?: number[]): void {
    if (slots !== undefined) {
      for (const slotNum of slots) {
        this.pushToInventory(slotNum);
      }
      return;
    }

    for (let i = 1; i <= TURTLE_SIZE; i++) {
      this.pushToInventory(i);
    }
  }

  public craft(limit?: number, outputSlot = CRAFT_OUTPUT_SLOT): ItemDetail {
    turtle.select(outputSlot);
    turtle.craft(limit);
    const craftItemDetail = turtle.getItemDetail(
      outputSlot,
      true,
    ) as ItemDetail;

    return craftItemDetail;
  }

  public pullItemsWithRecipe(
    recipe: CraftRecipe,
    craftCnt: number,
  ): Result<number> {
    let maxCraftCnt = craftCnt;
    for (const index in recipe.PatternEntries) {
      const entry = recipe.PatternEntries[index];
      if (entry.Item.Count == 0 || entry.Item.id == "minecraft:air") {
        continue;
      }

      const ingredient = this.inventoryItemsMap.get(entry.Item.id);
      if (ingredient === undefined)
        return new Err(Error(`No ingredient match ${entry.Item.id}`));

      // Check item max stack count
      if (ingredient.maxCount < maxCraftCnt) {
        maxCraftCnt = ingredient.maxCount;
      }

      // Pull items
      const pullItemsCnt = this.pullFromInventory(
        ingredient.name,
        maxCraftCnt,
        CRAFT_SLOT_TABLE[index],
      );
      if (pullItemsCnt.isErr()) return pullItemsCnt;

      if (pullItemsCnt.value < maxCraftCnt)
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
