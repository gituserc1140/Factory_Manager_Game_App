import {
  BUILDING_TYPES,
  DIRECTIONS,
  createBuilding,
  tileInDirection,
  canAcceptItem,
  receiveItem,
  updateMachine,
} from "./machines.js";
import { createDeposits, dedupeDeposits, depositAt, RESOURCE_TYPES } from "./resources.js";

const SAVE_KEY = "factory-manager-save-v1";

export class FactoryGame {
  constructor() {
    this.world = { width: 64, height: 44, tileSize: 40 };
    this.camera = { x: 0, y: 0, zoom: 1 };

    this.state = "menu";
    this.selectedType = "miner";
    this.selectedDirection = "right";

    this.money = 180;
    this.level = 1;
    this.totalProduced = 0;
    this.itemsSold = 0;
    this.buildingsPlaced = 0;

    this.deposits = createDeposits(this.world.width, this.world.height);
    this.buildings = [];
    this.tiles = new Map();
    this.beltItems = [];
    this.sales = [];

    this.levelThresholds = [0, 200, 600, 1300];
    this.beltSpeed = 2.6;
  }

  reset() {
    const fresh = new FactoryGame();
    Object.assign(this, fresh);
    this.state = "playing";
  }

  tileKey(x, y) {
    return `${x},${y}`;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.world.width && y < this.world.height;
  }

  depositAt(x, y) {
    return depositAt(this.deposits, x, y);
  }

  buildingAt(x, y) {
    return this.tiles.get(this.tileKey(x, y)) || null;
  }

  canPlace(type, x, y) {
    if (!this.inBounds(x, y)) return { ok: false, reason: "Out of bounds" };
    if (this.buildingAt(x, y)) return { ok: false, reason: "Tile occupied" };

    if (type === "miner" && !this.depositAt(x, y)) {
      return { ok: false, reason: "Miner must be on a deposit" };
    }

    const cfg = BUILDING_TYPES[type];
    if (!cfg) return { ok: false, reason: "Unknown building" };
    if (this.level < cfg.unlockLevel) return { ok: false, reason: "Building locked" };
    if (this.money < cfg.cost) return { ok: false, reason: "Not enough money" };

    return { ok: true };
  }

  placeBuilding(type, x, y, dir = this.selectedDirection) {
    const result = this.canPlace(type, x, y);
    if (!result.ok) return result;

    const building = createBuilding(type, x, y, dir);
    this.buildings.push(building);
    this.tiles.set(this.tileKey(x, y), building);

    this.money -= BUILDING_TYPES[type].cost;
    this.buildingsPlaced += 1;

    return { ok: true };
  }

  updateLevel() {
    let newLevel = 1;
    for (let i = 0; i < this.levelThresholds.length; i += 1) {
      if (this.money >= this.levelThresholds[i]) newLevel = i + 1;
    }
    this.level = Math.min(newLevel, 4);
  }

  emitFromBuilding(building) {
    if (!building.outputQueue.length) return;
    const target = tileInDirection(building.x, building.y, building.dir);
    const item = building.outputQueue[0];

    const targetBuilding = this.buildingAt(target.x, target.y);
    if (targetBuilding && canAcceptItem(targetBuilding, item)) {
      receiveItem(this, targetBuilding, item);
      building.outputQueue.shift();
      return;
    }

    const belt = targetBuilding && targetBuilding.type === "belt" ? targetBuilding : null;
    if (!belt) return;

    const occupied = this.beltItems.some((bi) => bi.x === belt.x && bi.y === belt.y && bi.progress < 0.95);
    if (occupied) return;

    this.beltItems.push({ x: belt.x, y: belt.y, item, dir: belt.dir, progress: 0 });
    building.outputQueue.shift();
  }

  updateBelts(dt) {
    for (const bi of this.beltItems) {
      bi.progress += dt * this.beltSpeed;
      if (bi.progress < 1) continue;

      const next = tileInDirection(bi.x, bi.y, bi.dir);
      const targetBuilding = this.buildingAt(next.x, next.y);

      if (targetBuilding && targetBuilding.type === "belt") {
        const blocked = this.beltItems.some(
          (other) => other !== bi && other.x === targetBuilding.x && other.y === targetBuilding.y && other.progress < 0.95,
        );
        if (!blocked) {
          bi.x = targetBuilding.x;
          bi.y = targetBuilding.y;
          bi.dir = targetBuilding.dir;
          bi.progress = 0;
        } else {
          bi.progress = 0.95;
        }
        continue;
      }

      if (targetBuilding && canAcceptItem(targetBuilding, bi.item)) {
        receiveItem(this, targetBuilding, bi.item);
        bi.remove = true;
        continue;
      }

      bi.progress = 0.95;
    }

    this.beltItems = this.beltItems.filter((bi) => !bi.remove);
  }

  tick(dt) {
    if (this.state !== "playing") return;

    for (const building of this.buildings) {
      updateMachine(this, building, dt, (x, y) => this.depositAt(x, y));
    }

    for (const building of this.buildings) {
      this.emitFromBuilding(building);
    }

    this.updateBelts(dt);
    this.updateLevel();
    this.trimSales();
  }

  trimSales() {
    const now = performance.now();
    this.sales = this.sales.filter((s) => now - s.t <= 60000);
  }

  productionRate() {
    return Math.round(this.sales.reduce((acc, s) => acc + s.value, 0));
  }

  save() {
    const payload = {
      money: this.money,
      level: this.level,
      totalProduced: this.totalProduced,
      itemsSold: this.itemsSold,
      buildingsPlaced: this.buildingsPlaced,
      selectedType: this.selectedType,
      selectedDirection: this.selectedDirection,
      camera: this.camera,
      deposits: this.deposits,
      buildings: this.buildings,
      beltItems: this.beltItems,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }

  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      const fresh = new FactoryGame();
      Object.assign(this, fresh);

      this.money = data.money ?? this.money;
      this.level = data.level ?? this.level;
      this.totalProduced = data.totalProduced ?? this.totalProduced;
      this.itemsSold = data.itemsSold ?? this.itemsSold;
      this.buildingsPlaced = data.buildingsPlaced ?? this.buildingsPlaced;
      this.selectedType = BUILDING_TYPES[data.selectedType] ? data.selectedType : this.selectedType;
      this.selectedDirection = DIRECTIONS.includes(data.selectedDirection) ? data.selectedDirection : this.selectedDirection;

      if (data.camera && Number.isFinite(data.camera.x) && Number.isFinite(data.camera.y) && Number.isFinite(data.camera.zoom)) {
        this.camera = {
          x: data.camera.x,
          y: data.camera.y,
          zoom: Math.max(0.45, Math.min(2.5, data.camera.zoom)),
        };
      }

      if (Array.isArray(data.deposits)) {
        this.deposits = dedupeDeposits(
          data.deposits.filter(
            (d) => Number.isInteger(d.x) && Number.isInteger(d.y) && RESOURCE_TYPES[d.resource] && this.inBounds(d.x, d.y),
          ),
        );
      }

      const loadedBuildings = Array.isArray(data.buildings)
        ? data.buildings.filter(
            (b) =>
              b &&
              BUILDING_TYPES[b.type] &&
              Number.isInteger(b.x) &&
              Number.isInteger(b.y) &&
              this.inBounds(b.x, b.y) &&
              DIRECTIONS.includes(b.dir) &&
              (b.type !== "miner" || this.depositAt(b.x, b.y)),
          )
        : [];
      const occupiedTiles = new Set();
      this.buildings = loadedBuildings.filter((b) => {
        const key = this.tileKey(b.x, b.y);
        if (occupiedTiles.has(key)) return false;
        occupiedTiles.add(key);
        return true;
      });

      this.tiles = new Map();
      for (const b of this.buildings) {
        this.tiles.set(this.tileKey(b.x, b.y), b);
      }
      this.beltItems = Array.isArray(data.beltItems)
        ? data.beltItems.filter((bi) => {
            if (
              !bi ||
              !Number.isInteger(bi.x) ||
              !Number.isInteger(bi.y) ||
              !this.inBounds(bi.x, bi.y) ||
              !DIRECTIONS.includes(bi.dir) ||
              typeof bi.item !== "string" ||
              !Number.isFinite(bi.progress) ||
              bi.progress < 0 ||
              bi.progress > 1
            ) {
              return false;
            }
            const sourceBuilding = this.buildingAt(bi.x, bi.y);
            return sourceBuilding?.type === "belt";
          })
        : [];
      this.sales = [];
      this.state = "playing";
      return true;
    } catch {
      return false;
    }
  }
}
