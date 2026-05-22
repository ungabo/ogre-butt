# Ogre Popper Codex Project

## Project Summary

Ogre Popper is a browser bubble-shooter prototype built in Vite, React, Three.js, and React Three Fiber. The game is modeled on classic bubble popper games: the player launches a colored pimple-bubble, it travels in straight 2D lines, bounces off side rails, sticks to the first contacted board area, and pops connected groups of three or more matching pimples.

The theme is gross-comedy arcade art: a stylized ogre butt playfield covered in pimple-like bubbles. Keep the execution cartoonish, painterly, and game-like. Avoid medical realism, gore, explicit anatomy details, or making the joke feel more graphic than the current art.

## Current Workspace

- Project folder: `D:\__MY APPS\ogre butt`
- Dev URL: `http://127.0.0.1:5173/`
- Main app entry: `src/App.tsx`
- Three.js renderer: `src/components/GameCanvas.tsx`
- Board and shot logic: `src/game/board.ts`
- Shared types: `src/game/types.ts`
- Planning doc: `docs/BROWSER_GAME_PLAN.md`
- Full handoff doc: `docs/CHAT_PROJECT_HANDOFF.md`

## Commands

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173
npm.cmd run build
npm.cmd run preview
```

The app has been validated with Playwright CLI screenshots. The production build passes, with only the existing Vite large-chunk warning from asset and Three.js bundle size.

## Product Direction

- First screen should be the playable game, not a landing page.
- Physics must stay simple, flat, and 2D. Do not bring back butt-curvature, depth projection, or wrapped/tower physics.
- The pimple-bubbles should visually touch like classic bubble shooter grids.
- Whitehead pimples must be the same size as all other pimples. Do not use an oversized brown-ring fallback for whites.
- Side rails are page-edge raised bumpers and should align with the actual bounce perimeter.
- The launch path should be straight segments with equal-angle reflection off rails.
- Moving shots should stop at the first contacted pimple/rail/top outcome and should not visually pass over a pimple before resolving.
- Ogre facial reactions should change only when a launched ball causes a pop cascade. No-match shots keep the face static.

## Current Asset Notes

- Main ogre: `assets/characters/ogre-clean-cutout-01.png`
- Graffiti background: `assets/backgrounds/graffiti-game-bg-01.png`
- Launcher: `assets/props/spray-launcher-cutout-01.png`
- Current whitehead pimple sprite: `assets/bubbles/pimple-whitehead-clean.png`
- Other pimple sprites are in `assets/bubbles/`.
- Raster reaction overlays are in `assets/characters/reactions/`:
  - `ogre-reaction-joy.png`
  - `ogre-reaction-surprise.png`
  - `ogre-reaction-tickle.png`
  - `ogre-reaction-startle.png`
  - `ogre-reaction-browRaise.png`

The reaction overlays are now raster assets, not vector/shape overlays. They are closer to the original ogre style, but still may need higher quality paint edits or regenerated expression art for perfect seamlessness.

## Implementation State

- Board is a shaped 2D staggered slot grid over the ogre butt.
- Shot tracing uses continuous ray-circle checks in `src/game/board.ts`.
- The visible shot path now ends at first impact when a bubble is hit, instead of animating through to the attachment slot center.
- Popping uses BFS from the newly placed slot and clears groups of three or more matching colors.
- Pop effects cascade one pimple at a time with goo droplets, shock ring, and healing patch.
- The face reaction is triggered only after a real pop result.
- `?reaction=joy`, `?reaction=surprise`, `?reaction=tickle`, `?reaction=startle`, and `?reaction=browRaise` force reaction states for QA screenshots.

## Immediate Next Work

1. Continue tuning shot collision and attachment until post-bounce shots feel exact.
2. Keep checking pimple spacing visually against classic bubble shooter references.
3. Improve raster expression overlays so the edges and upper-body blend are more seamless.
4. Add deterministic debug/QA helpers for testing specific colors and board states.
5. Clean up old generated/intermediate assets once the art direction is locked.

## Important User Preferences From The Chat

- The game should feel like a classic bubble shooter, not a physics experiment.
- The ogre and butt should stay visually large, with the playfield focused on the butt cheeks.
- The UI should stay tight and not consume much of the screen.
- The art style must match the original ogre concept. Avoid campy/simple face-part animation.
- Do not lose track of expression work while fixing mechanics.
