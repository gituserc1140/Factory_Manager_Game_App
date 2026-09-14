export const RESOURCE_TYPES = {
  iron: { label: "Iron Ore", color: "#8e9aa8" },
  copper: { label: "Copper Ore", color: "#c97a4d" },
  coal: { label: "Coal", color: "#3d3d3d" },
};

export const ITEM_VALUES = {
  iron: 5,
  copper: 8,
  coal: 4,
  ironPlate: 15,
  copperWire: 20,
};

export const RECIPES = [
  { id: "ironPlate", input: { iron: 1 }, output: { ironPlate: 1 }, time: 2 },
  { id: "copperWire", input: { copper: 1 }, output: { copperWire: 1 }, time: 2 },
];

const R_TYPES = Object.keys(RESOURCE_TYPES);

export function createDeposits(width, height, target = 90) {
  const deposits = [];
  for (let i = 0; i < target; i += 1) {
    deposits.push({
      x: 2 + Math.floor(Math.random() * (width - 4)),
      y: 2 + Math.floor(Math.random() * (height - 4)),
      resource: R_TYPES[Math.floor(Math.random() * R_TYPES.length)],
    });
  }
  return dedupeDeposits(deposits);
}

export function dedupeDeposits(deposits) {
  const seen = new Set();
  return deposits.filter((d) => {
    const key = `${d.x},${d.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function depositAt(deposits, x, y) {
  return deposits.find((d) => d.x === x && d.y === y) || null;
}
