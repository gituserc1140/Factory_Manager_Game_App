import { FactoryGame } from "./factory.js";
import { GameUI } from "./ui.js";

const canvas = document.getElementById("gameCanvas");
const game = new FactoryGame();
const ui = new GameUI(game, canvas);

const menuOverlay = document.getElementById("menuOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const startBtn = document.getElementById("startBtn");
const loadBtn = document.getElementById("loadBtn");
const pauseToggle = document.getElementById("pauseToggle");
const resumeBtn = document.getElementById("resumeBtn");
const saveBtn = document.getElementById("saveBtn");
const menuBtn = document.getElementById("menuBtn");

function setState(state) {
  game.state = state;
  menuOverlay.classList.toggle("visible", state === "menu");
  menuOverlay.classList.toggle("hidden", state !== "menu");
  pauseOverlay.classList.toggle("visible", state === "paused");
  pauseOverlay.classList.toggle("hidden", state !== "paused");
  const pauseEnabled = state === "playing" || state === "paused";
  pauseToggle.disabled = !pauseEnabled;
  pauseToggle.hidden = !pauseEnabled;
  pauseToggle.setAttribute("aria-hidden", String(!pauseEnabled));
}

startBtn.addEventListener("click", () => {
  game.reset();
  setState("playing");
});

loadBtn.addEventListener("click", () => {
  const loaded = game.load();
  if (!loaded) game.reset();
  setState("playing");
});

pauseToggle.addEventListener("click", () => {
  if (game.state === "playing") setState("paused");
  else if (game.state === "paused") setState("playing");
});

resumeBtn.addEventListener("click", () => setState("playing"));
saveBtn.addEventListener("click", () => game.save());
menuBtn.addEventListener("click", () => setState("menu"));

let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (game.state === "playing") game.tick(dt);
  ui.draw(now / 1000);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
setState("menu");
