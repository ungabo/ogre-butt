# Chat-To-Project Handoff

This file converts the working chat into a persistent Codex project brief for Ogre Popper.

## Original Game Idea

The user wanted a game modeled on bubble popper games: a player shoots a colored ball at a cluster of colored balls, and connected balls of the same color pop. The custom theme is an ogre butt covered in colored pimple-bubbles. The player is effectively popping pimples by matching bubble colors.

The first playable target is browser-based. Other platforms can come later once the browser version feels good.

## Major Decisions

- Use a browser prototype with Vite, React, Three.js, and React Three Fiber.
- Use raster generated assets for the ogre, background, launcher, pimple sprites, and reaction overlays.
- Keep gameplay physics purely 2D.
- Do not use earlier curvature or 3D-wrapped butt physics.
- Represent the butt playfield as a shaped staggered slot board.
- Use page-edge bumper rails for side bounces.
- Use pimple sprites, not normal glossy balls.
- Make the green/teal color family into whiteheads so it does not blend into ogre skin.
- The loaded/extra box at bottom right was removed.
- Reactions are full raster expression overlays, not simple vector face parts.
- Ogre reactions only change after a launched ball produces actual pops.

## Current Code Structure

- `src/App.tsx`
  - Owns game state, HUD, reset, shot lifecycle, pop cascade timing, win/loss state, and reaction triggering.
  - Current rule: `triggerOgreReaction(...)` runs only after `allRemoved.length > 0`.
- `src/game/board.ts`
  - Builds the shaped cheek board.
  - Computes neighbor links.
  - Traces shots using flat 2D ray segments.
  - Handles wall and top collisions.
  - Resolves first pimple contact and attachment.
  - Resolves pop clusters and detached clusters.
- `src/components/GameCanvas.tsx`
  - Renders background, ogre, rails, pimples, aim guide, launcher, projectile, effects, and raster reaction overlay.
- `src/game/types.ts`
  - Shared game model types and color definitions.
- `src/game/audio.ts`
  - Procedural sound effects.

## Mechanics Notes

The user repeatedly emphasized that the mechanics should be very simple and readable:

- Straight lines only.
- Equal-angle side-wall bounces.
- No hidden curvature.
- No 3D surface behavior.
- No projectile passing over or under pimples.
- The first contacted pimple should stop the shot path.
- The final attachment can be to a neighboring slot, but the visible projectile should not appear to travel through existing pimples.

Recent changes:

- `traceShot(...)` now pushes the actual impact point when a bubble is hit.
- When a bubble is hit, the visible path no longer continues to the target slot center.
- Neighbor distance was widened so visually adjacent rows can count as connected.
- Whitehead rendering was replaced with a real sprite, removing the oversized brown fallback.

## Visual Notes

The user wants:

- Spray-paint/painterly arcade style.
- Tight UI.
- Large ogre body on screen.
- Pimple-bubbles tightly packed like classic bubble shooter examples.
- Whiteheads should match other pimple sizes.
- Raised rails should justify bounce boundaries and sit near the page/screen edges.
- The face/expression art must match the original ogre style.

Avoid:

- Reintroducing a flat card-like vector expression layer.
- Moving eyebrows/mouth as separate simple shapes.
- Oversized whitehead blobs.
- Gaps between pimple-bubbles.
- Letting the ogre reaction change on misses.

## Asset Inventory

Core assets:

- `assets/characters/ogre-clean-cutout-01.png`
- `assets/backgrounds/graffiti-game-bg-01.png`
- `assets/props/spray-launcher-cutout-01.png`
- `assets/bubbles/pimple-red-angry.png`
- `assets/bubbles/pimple-blue-cystic.png`
- `assets/bubbles/pimple-gold-whitehead.png`
- `assets/bubbles/pimple-violet-blister.png`
- `assets/bubbles/pimple-orange-popped.png`
- `assets/bubbles/pimple-whitehead-clean.png`

Reaction assets:

- `assets/characters/reactions/ogre-reaction-joy.png`
- `assets/characters/reactions/ogre-reaction-surprise.png`
- `assets/characters/reactions/ogre-reaction-tickle.png`
- `assets/characters/reactions/ogre-reaction-startle.png`
- `assets/characters/reactions/ogre-reaction-browRaise.png`

Intermediate assets exist in the same folders with names like `*-bluekey-01.png`, `*-magenta-01.png`, `*-fullpatch.png`, and source sheets. Keep them until the user confirms cleanup.

## QA Evidence

Screenshots have been saved under `qa/screenshots/`. Useful recent ones include:

- `mechanics-whitehead-asset.png`
- `mechanics-final-bounce-aim.png`
- `mechanics-final-bounce-flight.png`
- `mechanics-final-bounce-resolved.png`
- `reaction-raster-masked-joy.png`
- `reaction-raster-masked-surprise.png`
- `reaction-raster-masked-browRaise.png`
- `no-match-face-before.png`
- `no-match-face-after.png`

The app was built successfully with:

```powershell
npm.cmd run build
```

The only noted build issue is Vite's large chunk warning.

## Known Risks And Open Items

- The reaction overlays are raster and style-aligned, but still not final seamless character art. They may need regeneration or manual compositing to blend perfectly.
- There is still old vector reaction code in `GameCanvas.tsx` below the new raster overlay path. It is unreachable/unused in current behavior but should be removed in a cleanup pass.
- Shot collision feels improved but should keep getting tested, especially rail bounces into dense clusters.
- Pimple spacing is much better after sprite scaling, but final board spacing may need another visual tuning pass against reference images.
- The project folder is not currently a git repository, so use file backups or initialize git before larger cleanup/refactors.

## Suggested Next Session Prompt

Continue work in `D:\__MY APPS\ogre butt`. Read `CODEX.md` first. The priority is to polish Ogre Popper's bubble shooter mechanics and visual cohesion without reintroducing curved physics. Verify every gameplay change with Playwright screenshots at `http://127.0.0.1:5173/`.
