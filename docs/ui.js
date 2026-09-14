import { BUILDING_TYPES, nextDirection, tileInDirection } from "./machines.js";
import { RESOURCE_TYPES } from "./resources.js";

export class GameUI {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.dragging = false;
    this.dragMoved = false;
    this.lastPointer = null;
    this.activePointerId = null;
    this.multiTouchActive = false;
    this.pinchDistance = null;

    this.top = {
      money: document.getElementById("money"),
      rate: document.getElementById("rate"),
      level: document.getElementById("level"),
      buildings: document.getElementById("buildingsPlaced"),
    };

    this.toolbarEl = document.getElementById("bottomToolbar");
    this.buildToolbar();
    this.bindInputs();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  buildToolbar() {
    this.toolbarEl.innerHTML = "";

    for (const [type, cfg] of Object.entries(BUILDING_TYPES)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "toolBtn";
      button.dataset.type = type;
      button.textContent = `${cfg.label} (£${cfg.cost})`;
      button.addEventListener("click", () => {
        this.game.selectedType = type;
        this.refreshToolbar();
      });
      this.toolbarEl.appendChild(button);
    }

    const rotate = document.createElement("button");
    rotate.type = "button";
    rotate.className = "toolBtn rotateBtn";
    rotate.textContent = "Rotate ↻";
    rotate.addEventListener("click", () => {
      this.game.selectedDirection = nextDirection(this.game.selectedDirection);
    });
    this.toolbarEl.appendChild(rotate);

    this.refreshToolbar();
  }

  refreshToolbar() {
    for (const btn of this.toolbarEl.querySelectorAll(".toolBtn[data-type]")) {
      const type = btn.dataset.type;
      const cfg = BUILDING_TYPES[type];
      const unlocked = this.game.level >= cfg.unlockLevel;
      btn.disabled = !unlocked;
      btn.classList.toggle("active", this.game.selectedType === type);
      btn.classList.toggle("locked", !unlocked);
    }
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return {
      x: x / this.game.camera.zoom + this.game.camera.x,
      y: y / this.game.camera.zoom + this.game.camera.y,
    };
  }

  worldToTile(wx, wy) {
    const ts = this.game.world.tileSize;
    return { x: Math.floor(wx / ts), y: Math.floor(wy / ts) };
  }

  placeAt(clientX, clientY) {
    const world = this.screenToWorld(clientX, clientY);
    const tile = this.worldToTile(world.x, world.y);
    this.game.placeBuilding(this.game.selectedType, tile.x, tile.y, this.game.selectedDirection);
  }

  bindInputs() {
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        this.game.camera.zoom = Math.max(0.45, Math.min(2.5, this.game.camera.zoom * factor));
      },
      { passive: false },
    );

    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.multiTouchActive) return;
      if (this.activePointerId !== null && this.activePointerId !== e.pointerId) return;
      this.activePointerId = e.pointerId;
      this.dragging = true;
      this.dragMoved = false;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this.activePointerId) return;
      if (!this.dragging || !this.lastPointer) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.dragMoved = true;
      this.game.camera.x -= dx / this.game.camera.zoom;
      this.game.camera.y -= dy / this.game.camera.zoom;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener("pointerup", (e) => {
      if (e.pointerId !== this.activePointerId) return;
      if (!this.dragMoved && !this.multiTouchActive) this.placeAt(e.clientX, e.clientY);
      this.dragging = false;
      this.lastPointer = null;
      this.activePointerId = null;
      this.canvas.releasePointerCapture(e.pointerId);
    });

    this.canvas.addEventListener("pointercancel", (e) => {
      if (e.pointerId !== this.activePointerId) return;
      this.dragging = false;
      this.dragMoved = false;
      this.lastPointer = null;
      this.activePointerId = null;
    });

    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        this.multiTouchActive = true;
        this.dragging = false;
        this.dragMoved = false;
        this.lastPointer = null;
        this.activePointerId = null;
        this.pinchDistance = this.distance(e.touches[0], e.touches[1]);
      }
    }, { passive: false });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length !== 2 || this.pinchDistance == null) return;
      e.preventDefault();
      const d = this.distance(e.touches[0], e.touches[1]);
      const ratio = d / this.pinchDistance;
      this.game.camera.zoom = Math.max(0.45, Math.min(2.5, this.game.camera.zoom * ratio));
      this.pinchDistance = d;
    }, { passive: false });

    this.canvas.addEventListener("touchend", () => {
      this.pinchDistance = null;
      this.multiTouchActive = false;
    });

    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "r") {
        this.game.selectedDirection = nextDirection(this.game.selectedDirection);
      }
    });
  }

  distance(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  clampCamera() {
    const worldW = this.game.world.width * this.game.world.tileSize;
    const worldH = this.game.world.height * this.game.world.tileSize;
    const viewW = this.canvas.clientWidth / this.game.camera.zoom;
    const viewH = this.canvas.clientHeight / this.game.camera.zoom;
    const maxX = Math.max(0, worldW - viewW);
    const maxY = Math.max(0, worldH - viewH);

    this.game.camera.x = Math.max(0, Math.min(maxX, this.game.camera.x));
    this.game.camera.y = Math.max(0, Math.min(maxY, this.game.camera.y));
  }

  draw(timeSec) {
    this.clampCamera();
    this.updateHud();

    const { ctx } = this;
    const { camera, world } = this.game;
    const ts = world.tileSize;

    const viewW = this.canvas.clientWidth;
    const viewH = this.canvas.clientHeight;

    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = "#16191f";
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    this.drawGrid(ts, world.width, world.height);
    this.drawDeposits(ts);
    this.drawBuildings(ts, timeSec);
    this.drawBeltItems(ts);

    ctx.restore();
  }

  drawGrid(ts, w, h) {
    const ctx = this.ctx;
    ctx.strokeStyle = "#242933";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * ts, 0);
      ctx.lineTo(x * ts, h * ts);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * ts);
      ctx.lineTo(w * ts, y * ts);
      ctx.stroke();
    }
  }

  drawDeposits(ts) {
    const ctx = this.ctx;
    for (const dep of this.game.deposits) {
      ctx.fillStyle = RESOURCE_TYPES[dep.resource].color;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(dep.x * ts + ts / 2, dep.y * ts + ts / 2, ts * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawBuildings(ts, timeSec) {
    const ctx = this.ctx;
    for (const b of this.game.buildings) {
      const cfg = BUILDING_TYPES[b.type];
      ctx.fillStyle = cfg.color;
      ctx.fillRect(b.x * ts + 4, b.y * ts + 4, ts - 8, ts - 8);

      if (b.type === "belt") {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        const flow = ((timeSec * 60) % ts) - ts;
        if (b.dir === "left" || b.dir === "right") {
          ctx.fillRect(b.x * ts + flow, b.y * ts + ts * 0.42, ts * 1.7, ts * 0.16);
        } else {
          ctx.fillRect(b.x * ts + ts * 0.42, b.y * ts + flow, ts * 0.16, ts * 1.7);
        }
      }

      const head = tileInDirection(b.x, b.y, b.dir);
      const cx = b.x * ts + ts / 2;
      const cy = b.y * ts + ts / 2;
      const tx = head.x * ts + ts / 2;
      const ty = head.y * ts + ts / 2;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (tx - cx) * 0.35, cy + (ty - cy) * 0.35);
      ctx.stroke();
    }
  }

  drawBeltItems(ts) {
    const ctx = this.ctx;
    for (const bi of this.game.beltItems) {
      const startX = bi.x * ts + ts / 2;
      const startY = bi.y * ts + ts / 2;
      const next = tileInDirection(bi.x, bi.y, bi.dir);
      const x = startX + (next.x * ts + ts / 2 - startX) * Math.min(bi.progress, 1);
      const y = startY + (next.y * ts + ts / 2 - startY) * Math.min(bi.progress, 1);
      ctx.fillStyle = "#f7f7f7";
      ctx.beginPath();
      ctx.arc(x, y, ts * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  updateHud() {
    this.top.money.textContent = Math.floor(this.game.money);
    this.top.rate.textContent = this.game.productionRate();
    this.top.level.textContent = this.game.level;
    this.top.buildings.textContent = this.game.buildingsPlaced;
    this.refreshToolbar();
  }
}
