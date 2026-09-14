import { ITEM_VALUES, RECIPES } from "./resources.js";

export const DIRECTIONS = ["right", "down", "left", "up"];

export const DIR_VECTORS = {
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
};

export const BUILDING_TYPES = {
  miner: {
    label: "Miner",
    color: "#f39a2b",
    cost: 40,
    unlockLevel: 1,
    productionTime: 1,
  },
  belt: {
    label: "Belt",
    color: "#d98f34",
    cost: 6,
    unlockLevel: 1,
  },
  processor: {
    label: "Processor",
    color: "#3b9ad9",
    cost: 120,
    unlockLevel: 2,
    speedMult: 1,
  },
  storage: {
    label: "Storage",
    color: "#6a7fad",
    cost: 90,
    unlockLevel: 3,
    capacity: 50,
  },
  advancedProcessor: {
    label: "Adv. Proc",
    color: "#5c64d6",
    cost: 220,
    unlockLevel: 4,
    speedMult: 1.8,
  },
  seller: {
    label: "Seller",
    color: "#2dbd65",
    cost: 80,
    unlockLevel: 1,
  },
};

export function nextDirection(dir) {
  const idx = DIRECTIONS.indexOf(dir);
  return DIRECTIONS[(idx + 1) % DIRECTIONS.length];
}

export function tileInDirection(x, y, dir) {
  const v = DIR_VECTORS[dir] || DIR_VECTORS.right;
  return { x: x + v.x, y: y + v.y };
}

export function createBuilding(type, x, y, dir = "right") {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    x,
    y,
    dir,
    timer: 0,
    outputQueue: [],
    inventory: {},
    activeRecipeId: null,
  };
}

export function canAcceptItem(building, itemName) {
  if (!building) return false;
  if (building.type === "seller") return true;
  if (building.type === "storage") {
    const cap = BUILDING_TYPES.storage.capacity;
    const total = Object.values(building.inventory).reduce((a, b) => a + b, 0);
    return total < cap;
  }
  if (building.type === "processor" || building.type === "advancedProcessor") {
    return RECIPES.some((r) => Object.prototype.hasOwnProperty.call(r.input, itemName));
  }
  return false;
}

export function receiveItem(factory, building, itemName) {
  if (building.type === "seller") {
    const value = ITEM_VALUES[itemName] || 0;
    factory.money += value;
    factory.sales.push({ t: performance.now(), value });
    factory.itemsSold += 1;
    return true;
  }

  building.inventory[itemName] = (building.inventory[itemName] || 0) + 1;
  return true;
}

function consumeRecipeInputs(building, recipe) {
  for (const [item, qty] of Object.entries(recipe.input)) {
    if ((building.inventory[item] || 0) < qty) return false;
  }

  for (const [item, qty] of Object.entries(recipe.input)) {
    building.inventory[item] -= qty;
  }
  return true;
}

export function updateMachine(factory, building, dt, depositAt) {
  if (building.type === "miner") {
    building.timer += dt;
    if (building.timer >= BUILDING_TYPES.miner.productionTime) {
      const dep = depositAt(building.x, building.y);
      if (dep) {
        building.outputQueue.push(dep.resource);
        factory.totalProduced += 1;
      }
      building.timer = 0;
    }
    return;
  }

  if (building.type !== "processor" && building.type !== "advancedProcessor") return;

  const speedMult = BUILDING_TYPES[building.type].speedMult;

  if (!building.activeRecipeId) {
    for (const recipe of RECIPES) {
      if (consumeRecipeInputs(building, recipe)) {
        building.activeRecipeId = recipe.id;
        building.timer = recipe.time / speedMult;
        break;
      }
    }
    return;
  }

  building.timer -= dt;
  if (building.timer <= 0) {
    const recipe = RECIPES.find((r) => r.id === building.activeRecipeId);
    if (recipe) {
      for (const [item, qty] of Object.entries(recipe.output)) {
        for (let i = 0; i < qty; i += 1) {
          building.outputQueue.push(item);
          factory.totalProduced += 1;
        }
      }
    }
    building.activeRecipeId = null;
    building.timer = 0;
  }
}
