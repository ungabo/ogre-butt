# Ogre Popper Browser Game Plan

## Goal

Build the first playable browser version of a bubble-popper game themed around cleaning pimple-like bubbles from a stylized ogre butt playfield. The game should feel like a classic bubble shooter, using a flat 2D physics board over the ogre artwork so aiming, collision, and cluster popping stay readable.

## Current Art Direction

- Use the cleaned ogre cutout as the main character/playfield reference.
- Keep the spray-paint arcade style: chunky outlines, graffiti backdrop, saturated accents, irreverent but non-explicit comedy.
- Bubble pieces should read as gross colored pimple-bubbles: each color uses a distinct sprite treatment, with the former green/teal family rendered as whiteheads so it does not blend into the ogre skin.
- Avoid gore, pus, medical realism, explicit framing, genitals, or anus details.

## Browser Prototype Scope

1. Launch as a Vite + React + Three.js web app.
2. Render the ogre and background as image assets.
3. Render the playable pimple-bubbles as Three.js objects placed on a cheek-shaped flat staggered 2D board.
4. Aim with mouse or touch.
5. Shoot the active pimple-bubble from a bottom-center launcher.
6. Attach the shot to the nearest legal flat board slot after collision.
7. Pop connected groups of three or more matching colors.
8. Award score and update the objective counter.
9. Randomly swap the ogre's upper-body reaction overlay only when a shot creates a real pimple pop.
10. Support restart, next bubble preview, basic level state, win/loss states, and responsive layout.

## Board Model

The board uses a single flat staggered 2D slot map. Projectile physics, collision, attachment, and bouncing all run in plain 2D screen/world space.

- Each slot has regular `x` and `y` spacing so neighbor relationships are predictable.
- The slot rows are shaped to stay on the ogre's butt cheeks rather than covering the whole torso or outfit.
- The current slot shape is biased farther left than the first pass so pimples cover more of the left cheek while the outer rails remain page-edge bounce bumpers.
- Slot `z` is a constant render layer and is not used for physics.
- Neighbor links are precomputed by distance, giving the normal bubble shooter graph logic a stable shaped board to live on.
- The board does not spin in this version.
- No depth, surface wrapping, or body-shape projection is part of gameplay physics.

## Shot Model

- Player aim is converted from screen space into world space.
- The projectile traces upward from the launcher as straight 2D line segments.
- Side-wall bounces are supported in 2D screen/world space.
- Raised welt bumper rails render from the same outer `SHOT_BOUNDS` used by physics, so the visible rim sits at the page-edge bounce perimeter rather than around the cheek board.
- Collision checks use continuous ray-circle intersections against occupied bubble positions, so fast shots and post-bounce shots cannot step through pimples.
- On hit, the shot attaches to the nearest empty neighbor slot around the impact.
- If no hit occurs, it attaches near the top/nearest available slot.
- Only resolved shots that pop at least one matching cluster cycle the broader head-and-shoulder reaction layer through joy, surprise, tickle, startled, and brow-raise expressions while the butt/playfield art remains fixed.

## Pop Rules

- After every shot, run a breadth-first search from the attached slot.
- If at least three connected bubbles share the same color, mark that cluster for popping.
- After a pop, any non-anchored disconnected clusters may also clear for a bonus.
- Pop clears run as a timed cascade: pimples burst one by one with goo droplets, a shock flash, and a fading green healing patch before each slot is removed.
- The objective is to reduce the number of pimples left on the board.

## Asset Inventory

- `assets/concepts/gameplay-screen-concept-01.png`: primary screen concept.
- `assets/concepts/ogre-butt-pimple-popper-concept-sheet-01.png`: early concept sheet.
- `assets/concepts/ogre-butt-main-board-hires-01.png`: pimple-covered concept art.
- `assets/characters/ogre-clean-cutout-01.png`: transparent ogre cutout without pimples.
- `assets/backgrounds/graffiti-game-bg-01.png`: graffiti background.
- `assets/props/spray-launcher-cutout-01.png`: transparent launcher prop.
- `assets/bubbles/gross-pimple-sprite-sheet-01.png`: transparent six-pimple sprite sheet.
- `assets/bubbles/pimple-red-angry.png`: red inflamed pimple sprite.
- `assets/bubbles/pimple-blue-cystic.png`: blue cystic pimple sprite.
- `assets/bubbles/pimple-gold-whitehead.png`: yellow whitehead pimple sprite.
- `assets/bubbles/pimple-violet-blister.png`: violet blister pimple sprite.
- `assets/bubbles/pimple-whitehead-clean.png`: current whitehead pimple sprite used for the teal/whitehead color family.
- `assets/bubbles/pimple-teal-drippy.png`: older teal source sprite kept as an intermediate asset.
- `assets/bubbles/pimple-orange-popped.png`: orange popped pimple sprite.

## Implementation Notes

- Keep HUD text and controls code-native.
- Keep the app as the first screen, not a marketing page.
- Use small focused modules:
  - `src/game/board.ts`: slots, neighbors, shot tracing, match resolution.
  - `src/game/types.ts`: shared game types.
  - `src/components/GameCanvas.tsx`: Three.js rendering and pointer capture.
  - `src/App.tsx`: game state and HUD composition.
- Use Web Audio for small procedural pop/shoot sounds so no audio files are required yet.
- `?reaction=joy`, `?reaction=surprise`, `?reaction=tickle`, `?reaction=startle`, and `?reaction=browRaise` force reaction states for screenshot QA.

## Follow-Up Platform Path

After the browser prototype feels good:

1. Tune board shape and bubble placement against the enlarged ogre art.
2. Add level layouts and difficulty ramps.
3. Add stronger effects: pop particles, goo-free spray bursts, combo text, screen shake.
4. Keep future platform versions on this same simple 2D projectile core even if the character art becomes more elaborate.
5. Package with Capacitor, Electron, or native ports after web gameplay is proven.
