import { RotateCcw, Settings, Volume2, VolumeX, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { choosePlayableColor, countOccupied, createInitialBoard, placeBubble, removeBubbles, resolvePops, traceShot } from "./game/board";
import { playBlocked, playPop, playShoot } from "./game/audio";
import { OGRE_REACTIONS, colorDef, type BoardSlot, type BubbleColorId, type OgreReactionId, type OgreReactionState, type ShotPlan, type Vec2 } from "./game/types";

type GameStatus = "playing" | "won" | "lost";

const FIRST_AIM: Vec2 = { x: 0.18, y: 0.16 };
const POP_STEP_MS = 140;
const POP_ANIMATION_MS = 520;
const DEBUG_REACTION_IDS = new Set<OgreReactionId>(OGRE_REACTIONS);

function makeBoard(seed: number) {
  return createInitialBoard(seed);
}

function debugReactionState(): OgreReactionState {
  const debugId = new URLSearchParams(window.location.search).get("reaction");
  return DEBUG_REACTION_IDS.has(debugId as OgreReactionId) ? { id: debugId as OgreReactionId, tick: 1 } : { id: "joy", tick: 0 };
}

export default function App() {
  const [seed, setSeed] = useState(13);
  const [level, setLevel] = useState(1);
  const [slots, setSlots] = useState<BoardSlot[]>(() => makeBoard(13));
  const [score, setScore] = useState(0);
  const [activeColor, setActiveColor] = useState<BubbleColorId>(() => choosePlayableColor(makeBoard(13)));
  const [nextColor, setNextColor] = useState<BubbleColorId>(() => choosePlayableColor(makeBoard(31)));
  const [aimTarget, setAimTarget] = useState<Vec2>(FIRST_AIM);
  const [shot, setShot] = useState<ShotPlan | null>(null);
  const [poppingIds, setPoppingIds] = useState<Set<string>>(new Set());
  const [cascadeActive, setCascadeActive] = useState(false);
  const [reaction, setReaction] = useState<OgreReactionState>(() => debugReactionState());
  const [status, setStatus] = useState<GameStatus>("playing");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shotId, setShotId] = useState(1);
  const popTimersRef = useRef<number[]>([]);

  const emptyCount = useMemo(() => slots.length - countOccupied(slots), [slots]);
  const disabled = status !== "playing" || Boolean(shot) || cascadeActive;

  const clearPopTimers = useCallback(() => {
    popTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    popTimersRef.current = [];
  }, []);

  const resetGame = useCallback(
    (advanceLevel = false) => {
      const nextSeed = seed + 17 + (advanceLevel ? level * 7 : 0);
      const board = makeBoard(nextSeed);
      clearPopTimers();
      setSeed(nextSeed);
      setLevel((current) => (advanceLevel ? current + 1 : current));
      setSlots(board);
      setScore(0);
      setActiveColor(choosePlayableColor(board));
      setNextColor(choosePlayableColor(board));
      setAimTarget(FIRST_AIM);
      setShot(null);
      setPoppingIds(new Set());
      setCascadeActive(false);
      setReaction(debugReactionState());
      setStatus("playing");
      setSettingsOpen(false);
    },
    [clearPopTimers, level, seed],
  );

  const beginShot = useCallback(() => {
    if (disabled) {
      playBlocked(soundEnabled);
      return;
    }

    const trace = createShotPlan(slots, aimTarget, activeColor, shotId);
    if (!trace.targetSlotId) {
      playBlocked(soundEnabled);
      setStatus("lost");
      return;
    }

    setShot(trace);
    setShotId((current) => current + 1);
    playShoot(soundEnabled);
  }, [activeColor, aimTarget, disabled, shotId, slots, soundEnabled]);

  const finishShot = useCallback(
    (completedShot: ShotPlan) => {
      if (!completedShot.targetSlot || !completedShot.targetSlotId) {
        setShot(null);
        return;
      }

      const added = placeBubble(slots, completedShot.targetSlot, completedShot.color);
      const result = resolvePops(added, completedShot.targetSlotId);
      const allRemoved = [...new Set([...result.matchingIds, ...result.detachedIds])];

      setShot(null);
      setActiveColor(nextColor);
      setNextColor(choosePlayableColor(added));

      if (allRemoved.length === 0) {
        setSlots(added);
        if (emptyCount <= 1) {
          setStatus("lost");
        }
        return;
      }

      triggerOgreReaction(setReaction);
      setSlots(added);
      setScore((current) => current + result.matchingIds.length * 120 + result.detachedIds.length * 180 + Math.max(0, allRemoved.length - 3) * 35);
      setCascadeActive(true);
      setPoppingIds(new Set());
      clearPopTimers();

      const popOrder = orderPopCascade(added, allRemoved, completedShot.targetSlotId);

      popOrder.forEach((id, index) => {
        const popTimer = window.setTimeout(() => {
          setPoppingIds((current) => new Set([...current, id]));
          playPop(soundEnabled, 1);

          const removeTimer = window.setTimeout(() => {
            setSlots((current) => removeBubbles(current, [id]));
            setPoppingIds((current) => {
              const next = new Set(current);
              next.delete(id);
              return next;
            });
          }, POP_ANIMATION_MS);

          popTimersRef.current.push(removeTimer);
        }, index * POP_STEP_MS);

        popTimersRef.current.push(popTimer);
      });

      const finishTimer = window.setTimeout(() => {
        setSlots((current) => {
          if (countOccupied(current) === 0) {
            setStatus("won");
          }
          return current;
        });
        setPoppingIds(new Set());
        setCascadeActive(false);
        popTimersRef.current = [];
      }, Math.max(0, popOrder.length - 1) * POP_STEP_MS + POP_ANIMATION_MS + 80);

      popTimersRef.current.push(finishTimer);
    },
    [clearPopTimers, emptyCount, nextColor, slots, soundEnabled],
  );

  useEffect(() => clearPopTimers, [clearPopTimers]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        beginShot();
      }

      if (event.code === "ArrowLeft") {
        setAimTarget((current) => ({ ...current, x: Math.max(-3.1, current.x - 0.16) }));
      }

      if (event.code === "ArrowRight") {
        setAimTarget((current) => ({ ...current, x: Math.min(3.1, current.x + 0.16) }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [beginShot]);

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Ogre Popper game">
        <GameCanvas
          slots={slots}
          poppingIds={poppingIds}
          activeColor={activeColor}
          aimTarget={aimTarget}
          shot={shot}
          disabled={disabled}
          reaction={reaction}
          onAim={setAimTarget}
          onShoot={beginShot}
          onShotDone={finishShot}
        />

        <div className="hud hud-left">
          <div className="brand">Ogre Popper</div>
          <Metric label="Score" value={score.toLocaleString()} />
          <Metric label="Level" value={level.toString()} />
        </div>

        <div className="hud hud-right">
          <div className="next-wrap">
            <span>Next</span>
            <BubblePreview colorId={nextColor} />
          </div>
          <button className="icon-button" type="button" onClick={() => resetGame(false)} aria-label="Restart" title="Restart">
            <RotateCcw size={22} />
          </button>
          <button className="icon-button" type="button" onClick={() => setSoundEnabled((current) => !current)} aria-label="Toggle sound" title="Toggle sound">
            {soundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings">
            <Settings size={22} />
          </button>
        </div>

        {status !== "playing" ? (
          <div className="result-panel" role="dialog" aria-modal="true">
            <h1>{status === "won" ? "Freshly Cleared" : "Outbreak Overload"}</h1>
            <p>{status === "won" ? "The ogre is pimple-free for now." : "The board is packed. Reload the outbreak and try cleaner angles."}</p>
            <button type="button" onClick={() => resetGame(status === "won")}>
              {status === "won" ? "Next Level" : "Try Again"}
            </button>
          </div>
        ) : null}

        {settingsOpen ? (
          <div className="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">
            <div className="settings-head">
              <h2>Settings</h2>
              <button className="icon-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings" title="Close">
                <X size={20} />
              </button>
            </div>
            <button className="settings-row" type="button" onClick={() => setSoundEnabled((current) => !current)}>
              <span>Sound</span>
              <strong>{soundEnabled ? "On" : "Off"}</strong>
            </button>
            <button className="settings-row" type="button" onClick={() => resetGame(false)}>
              <span>Board</span>
              <strong>New</strong>
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function triggerOgreReaction(setReaction: Dispatch<SetStateAction<OgreReactionState>>) {
  setReaction((current) => {
    const choices = OGRE_REACTIONS.filter((reaction) => reaction !== current.id);
    const id = choices[Math.floor(Math.random() * choices.length)] ?? current.id;
    return { id, tick: current.tick + 1 };
  });
}

function orderPopCascade(slots: BoardSlot[], ids: string[], originId: string | null) {
  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  const origin = originId ? byId.get(originId) : null;

  return [...ids].sort((a, b) => {
    const slotA = byId.get(a);
    const slotB = byId.get(b);
    if (!origin || !slotA || !slotB) {
      return a.localeCompare(b);
    }

    const distanceA = Math.hypot(slotA.x - origin.x, slotA.y - origin.y);
    const distanceB = Math.hypot(slotB.x - origin.x, slotB.y - origin.y);
    return distanceA - distanceB || slotA.row - slotB.row || slotA.col - slotB.col;
  });
}

function createShotPlan(slots: BoardSlot[], aimTarget: Vec2, color: BubbleColorId, id: number): ShotPlan {
  const result = traceShot(slots, aimTarget);
  return {
    id,
    color,
    path: result.path,
    targetSlotId: result.targetSlotId,
    targetSlot: result.targetSlot,
  };
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BubblePreview({ colorId }: { colorId: BubbleColorId }) {
  const color = colorDef(colorId);
  return <span className="bubble-preview" style={{ "--pimple": color.hex, "--pimple-dark": color.dark, "--pimple-glow": color.glow } as React.CSSProperties} />;
}
