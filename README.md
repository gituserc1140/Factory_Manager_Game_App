# Factory Manager Game App

Factory Manager is a mobile-friendly 2D browser automation game built with HTML, CSS, JavaScript, and Canvas.

## Play

Deploy the `/docs` folder with GitHub Pages and open `index.html`.

## Gameplay

- Place **Miners** on Iron, Copper, or Coal deposits.
- Route output with **Conveyor Belts**.
- Feed **Processors** and **Advanced Processors** to craft products.
- Use **Storage** for overflow.
- Deliver to **Seller** buildings to earn money.
- Spend money to expand and unlock higher-tier buildings.

## Progression

- **Level 1:** Miner, Belt, Seller
- **Level 2:** Processor
- **Level 3:** Storage
- **Level 4:** Advanced Processor

## Controls

### Mobile
- Tap to place selected building
- Drag to move the map
- Pinch to zoom
- Use large bottom toolbar buttons

### Desktop
- Click to place selected building
- Click + drag to move map
- Mouse wheel to zoom
- Press `R` (or Rotate button) to rotate output direction

## Economy

Current sale values:

- Iron Ore = £5
- Copper Ore = £8
- Coal = £4
- Iron Plate = £15
- Copper Wire = £20

Top bar shows:

- Money
- Production rate (last 60s, £/min)
- Level
- Buildings placed

## Save / Load

- Save from the pause menu (stored in `localStorage`)
- Load from the main menu

## Project Structure

```
/docs
  index.html
  style.css
  game.js
  factory.js
  machines.js
  resources.js
  ui.js
README.md
```
