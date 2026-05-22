import { Canvas, ThreeEvent, useFrame, useLoader, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import backgroundUrl from "../../assets/backgrounds/graffiti-game-bg-01.png";
import bluePimpleUrl from "../../assets/bubbles/pimple-blue-cystic.png";
import goldPimpleUrl from "../../assets/bubbles/pimple-gold-whitehead.png";
import orangePimpleUrl from "../../assets/bubbles/pimple-orange-popped.png";
import redPimpleUrl from "../../assets/bubbles/pimple-red-angry.png";
import violetPimpleUrl from "../../assets/bubbles/pimple-violet-blister.png";
import whitePimpleUrl from "../../assets/bubbles/pimple-whitehead-clean.png";
import ogreUrl from "../../assets/characters/ogre-clean-cutout-01-soft-shoulder.png";
import reactionBrowRaiseUrl from "../../assets/characters/reactions/face/ogre-reaction-browRaise-face.png";
import reactionJoyUrl from "../../assets/characters/reactions/face/ogre-reaction-joy-face.png";
import reactionStartleUrl from "../../assets/characters/reactions/face/ogre-reaction-startle-face.png";
import reactionSurpriseUrl from "../../assets/characters/reactions/face/ogre-reaction-surprise-face.png";
import reactionTickleUrl from "../../assets/characters/reactions/face/ogre-reaction-tickle-face.png";
import launcherUrl from "../../assets/props/spray-launcher-cutout-01.png";
import { BOARD_Z, BUBBLE_RADIUS, SHOOTER_POSITION, SHOT_BOUNDS, SHOT_Z, traceShot } from "../game/board";
import { colorDef, type BoardSlot, type BubbleColorId, type OgreReactionId, type OgreReactionState, type ShotPlan, type TraceResult, type Vec2, type Vec3 } from "../game/types";

const PIMPLE_SPRITES: Record<BubbleColorId, string> = {
  red: redPimpleUrl,
  blue: bluePimpleUrl,
  gold: goldPimpleUrl,
  violet: violetPimpleUrl,
  teal: whitePimpleUrl,
  orange: orangePimpleUrl,
};

const REACTION_SPRITES: Record<OgreReactionId, string> = {
  joy: reactionJoyUrl,
  surprise: reactionSurpriseUrl,
  tickle: reactionTickleUrl,
  startle: reactionStartleUrl,
  browRaise: reactionBrowRaiseUrl,
};

const BUMPER_BOTTOM_Y = SHOOTER_POSITION.y - 0.2;
const BUMPER_WIDTH = 0.14;
const BUMPER_Z = BOARD_Z - 0.02;
const GOO_COLORS = ["#d8ff37", "#fff38a", "#9eff4a", "#e9f45a", "#6fc02b"];
const PIMPLE_SPRITE_SCALE = 2;
const PIMPLE_TEXTURE_SIZE = 512;
const PIMPLE_SOURCE_TRIMS: Record<BubbleColorId, { x: number; y: number; size: number }> = {
  red: { x: 124, y: 102, size: 330 },
  blue: { x: 88, y: 102, size: 330 },
  gold: { x: 49, y: 104, size: 330 },
  violet: { x: 120, y: 69, size: 330 },
  teal: { x: 68, y: 60, size: 376 },
  orange: { x: 47, y: 71, size: 330 },
};
const REACTION_SPRITE_POSITION: [number, number, number] = [1.5, 1.36, 0.96];
const REACTION_SPRITE_SCALE: [number, number, number] = [2.38, 2.87, 1];
const REACTION_FACE_SCALE = 0.62;
const REACTION_FACE_SOURCE = { x: 2.45, y: 1.92 };
const REACTION_FACE_TARGET = { x: 1.62, y: 1.48 };
const EXPRESSION_POSES: Record<
  OgreReactionId,
  {
    head: [number, number, number];
    headScale: [number, number, number];
    rotation: number;
    eyes: "soft" | "wide" | "squint" | "tense" | "raised";
    mouth: "grin" | "open" | "laugh" | "clench" | "smirk";
    accent: string;
  }
> = {
  joy: {
    head: [1.78, 1.33, 0.92],
    headScale: [0.46, 0.36, 1],
    rotation: -0.1,
    eyes: "soft",
    mouth: "grin",
    accent: "#fff08a",
  },
  surprise: {
    head: [1.7, 1.4, 0.92],
    headScale: [0.47, 0.38, 1],
    rotation: -0.22,
    eyes: "wide",
    mouth: "open",
    accent: "#38e8d1",
  },
  tickle: {
    head: [1.82, 1.31, 0.92],
    headScale: [0.48, 0.35, 1],
    rotation: 0.08,
    eyes: "squint",
    mouth: "laugh",
    accent: "#ef3aa2",
  },
  startle: {
    head: [1.68, 1.41, 0.92],
    headScale: [0.46, 0.38, 1],
    rotation: -0.28,
    eyes: "tense",
    mouth: "clench",
    accent: "#ff8b20",
  },
  browRaise: {
    head: [1.76, 1.36, 0.92],
    headScale: [0.46, 0.36, 1],
    rotation: -0.04,
    eyes: "raised",
    mouth: "smirk",
    accent: "#bff24a",
  },
};

interface GameCanvasProps {
  slots: BoardSlot[];
  poppingIds: Set<string>;
  activeColor: BubbleColorId;
  aimTarget: Vec2;
  shot: ShotPlan | null;
  disabled: boolean;
  reaction: OgreReactionState;
  onAim: (target: Vec2) => void;
  onShoot: () => void;
  onShotDone: (shot: ShotPlan) => void;
}

export function GameCanvas({ slots, poppingIds, activeColor, aimTarget, shot, disabled, reaction, onAim, onShoot, onShotDone }: GameCanvasProps) {
  const trace = useMemo<TraceResult>(() => traceShot(slots, aimTarget), [slots, aimTarget]);

  return (
    <Canvas
      className="game-canvas"
      camera={{ position: [0, 0, 7.4], fov: 42, near: 0.1, far: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#07080c"]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[-2.4, 2.8, 5]} intensity={1.6} />
      <pointLight position={[1.7, -1, 3]} intensity={5} color="#ff35b5" />
      <pointLight position={[-2.6, 1.4, 3]} intensity={4} color="#24d7ff" />
      <ResponsiveCamera />

      <TexturedPlane url={backgroundUrl} position={[0, 0, -2.3]} scale={[13.45, 7.57, 1]} opacity={1} />
      <TexturedPlane url={ogreUrl} position={[0.05, 0.02, -0.62]} scale={[8.4, 5.6, 1]} opacity={1} />
      <OgreReactionOverlay reaction={reaction} />
      <RaisedBumperRails />

      {slots.map((slot) =>
        slot.bubble ? (
          <PimpleBubble key={slot.id} slot={slot} colorId={slot.bubble} popping={poppingIds.has(slot.id)} />
        ) : null,
      )}

      <AimGuide trace={trace} colorId={activeColor} visible={!disabled && !shot} />
      <LauncherRig colorId={activeColor} />
      {shot ? <Projectile key={shot.id} shot={shot} onDone={onShotDone} /> : null}
      <PointerPlane onAim={onAim} onShoot={onShoot} disabled={disabled} />
    </Canvas>
  );
}

function OgreReactionOverlay({ reaction }: { reaction: OgreReactionState }) {
  const groupRef = useRef<THREE.Group>(null);
  const lastTickRef = useRef(reaction.tick);
  const startedRef = useRef(0);
  const texture = useLoader(THREE.TextureLoader, REACTION_SPRITES[reaction.id]);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    if (lastTickRef.current !== reaction.tick) {
      lastTickRef.current = reaction.tick;
      startedRef.current = clock.elapsedTime;
    }

    const age = reaction.tick === 0 ? 999 : clock.elapsedTime - startedRef.current;
    const pop = Math.sin(Math.min(age / 0.42, 1) * Math.PI) * 0.035;
    const jiggle = age < 0.62 ? Math.sin(age * 26) * 0.012 : 0;
    group.visible = reaction.tick > 0;
    group.scale.set(REACTION_SPRITE_SCALE[0] * (1 + pop), REACTION_SPRITE_SCALE[1] * (1 + pop), 1);
    group.rotation.z = jiggle;
  });

  if (reaction.tick === 0) {
    return null;
  }

  return (
    <group ref={groupRef} position={REACTION_SPRITE_POSITION} scale={REACTION_SPRITE_SCALE} renderOrder={28}>
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.04} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FullExpressionOverlay({ id, tick }: { id: OgreReactionId; tick: number }) {
  const pose = EXPRESSION_POSES[id];

  return (
    <group>
      <ExpressionShoulders id={id} tick={tick} />
      <group position={pose.head} rotation={[0, 0, pose.rotation]} scale={pose.headScale}>
        <Oval position={[0.05, -0.04, 0]} scale={[1.22, 0.96, 1]} color="#1b2a0b" opacity={0.82} renderOrder={31} />
        <Oval position={[0, 0, 0.02]} scale={[1.06, 0.82, 1]} color="#8cc82c" opacity={0.96} renderOrder={32} />
        <Oval position={[-0.18, 0.08, 0.03]} scale={[0.78, 0.56, 1]} color="#a4d63d" opacity={0.82} renderOrder={33} />
        <Oval position={[0.36, -0.02, 0.04]} scale={[0.42, 0.54, 1]} color="#5f971b" opacity={0.5} renderOrder={34} />
        <ExpressionEyes type={pose.eyes} />
        <ExpressionMouth type={pose.mouth} />
        <ExpressionBrow type={pose.eyes} />
        <Dash position={[-0.62, 0.34, 0.08]} scale={[0.34, 0.055, 1]} rotation={0.42} color={pose.accent} opacity={0.8} />
        <Dash position={[0.52, 0.3, 0.08]} scale={[0.27, 0.05, 1]} rotation={-0.3} color={pose.accent} opacity={0.72} />
      </group>
    </group>
  );
}

function ExpressionShoulders({ id, tick }: { id: OgreReactionId; tick: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const lastTickRef = useRef(tick);
  const startedRef = useRef(0);
  const accent = EXPRESSION_POSES[id].accent;

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    if (lastTickRef.current !== tick) {
      lastTickRef.current = tick;
      startedRef.current = clock.elapsedTime;
    }

    const age = clock.elapsedTime - startedRef.current;
    group.visible = age < 1.3 || tick === 1;
    group.scale.setScalar(1 + Math.sin(Math.min(age / 0.5, 1) * Math.PI) * 0.035);
  });

  return (
    <group ref={groupRef}>
      <Oval position={[1.36, 1.16, 0.86]} scale={[0.88, 0.38, 1]} color="#6fab20" opacity={0.16} renderOrder={24} />
      <Oval position={[1.54, 1.3, 0.87]} scale={[0.62, 0.32, 1]} color="#98cf35" opacity={0.22} renderOrder={25} />
      <Dash position={[1.16, 1.42, 0.9]} scale={[0.38, 0.044, 1]} rotation={-0.42} color={accent} opacity={0.55} />
      <Dash position={[1.48, 1.18, 0.9]} scale={[0.32, 0.04, 1]} rotation={0.35} color={accent} opacity={0.44} />
      <Dash position={[1.8, 1.05, 0.9]} scale={[0.25, 0.036, 1]} rotation={-0.2} color={accent} opacity={0.34} />
    </group>
  );
}

function ExpressionEyes({ type }: { type: "soft" | "wide" | "squint" | "tense" | "raised" }) {
  if (type === "soft") {
    return (
      <group>
        <Dash position={[-0.3, 0.12, 0.09]} scale={[0.3, 0.06, 1]} rotation={0.08} color="#14200a" />
        <Dash position={[0.24, 0.1, 0.09]} scale={[0.25, 0.055, 1]} rotation={-0.06} color="#14200a" />
        <Oval position={[-0.22, 0.15, 0.1]} scale={[0.045, 0.03, 1]} color="#fff9df" opacity={0.82} renderOrder={36} />
      </group>
    );
  }

  if (type === "squint" || type === "tense") {
    const leftRotation = type === "tense" ? -0.24 : 0.16;
    const rightRotation = type === "tense" ? 0.28 : -0.12;
    return (
      <group>
        <Dash position={[-0.3, 0.12, 0.09]} scale={[0.32, 0.065, 1]} rotation={leftRotation} color="#152109" />
        <Dash position={[0.24, 0.12, 0.09]} scale={[0.28, 0.06, 1]} rotation={rightRotation} color="#152109" />
      </group>
    );
  }

  if (type === "raised") {
    return (
      <group>
        <Oval position={[-0.28, 0.18, 0.09]} scale={[0.2, 0.16, 1]} color="#fff9df" opacity={0.92} renderOrder={35} />
        <Oval position={[-0.23, 0.17, 0.1]} scale={[0.075, 0.08, 1]} color="#11140b" renderOrder={36} />
        <Dash position={[0.24, 0.08, 0.09]} scale={[0.24, 0.055, 1]} rotation={-0.08} color="#14200a" />
      </group>
    );
  }

  const leftScale: [number, number, number] = [0.18, 0.2, 1];
  const rightScale: [number, number, number] = [0.16, 0.19, 1];
  const leftY = 0.11;
  const rightY = 0.09;

  return (
    <group>
      <Oval position={[-0.28, leftY, 0.09]} scale={leftScale} color="#fff9df" opacity={0.94} renderOrder={35} />
      <Oval position={[0.24, rightY, 0.09]} scale={rightScale} color="#fff9df" opacity={0.94} renderOrder={35} />
      <Oval position={[-0.24, leftY - 0.01, 0.1]} scale={[0.06, 0.075, 1]} color="#11140b" renderOrder={36} />
      <Oval position={[0.27, rightY - 0.01, 0.1]} scale={[0.055, 0.07, 1]} color="#11140b" renderOrder={36} />
    </group>
  );
}

function ExpressionBrow({ type }: { type: "soft" | "wide" | "squint" | "tense" | "raised" }) {
  const leftRotation = type === "raised" ? 0.46 : type === "tense" ? -0.36 : -0.12;
  const rightRotation = type === "raised" ? -0.12 : type === "tense" ? 0.42 : 0.1;
  const leftY = type === "raised" ? 0.39 : 0.31;
  const rightY = type === "raised" ? 0.25 : 0.29;

  return (
    <group>
      <Dash position={[-0.29, leftY, 0.11]} scale={[0.38, 0.07, 1]} rotation={leftRotation} color="#231b10" />
      <Dash position={[0.24, rightY, 0.11]} scale={[0.34, 0.065, 1]} rotation={rightRotation} color="#231b10" />
    </group>
  );
}

function ExpressionMouth({ type }: { type: "grin" | "open" | "laugh" | "clench" | "smirk" }) {
  if (type === "open") {
    return (
      <group>
        <Oval position={[0.16, -0.34, 0.09]} scale={[0.19, 0.22, 1]} color="#171006" renderOrder={35} />
        <Oval position={[0.18, -0.39, 0.1]} scale={[0.105, 0.052, 1]} color="#ef4f63" renderOrder={36} />
      </group>
    );
  }

  if (type === "clench") {
    return (
      <group>
        <Dash position={[0.14, -0.34, 0.09]} scale={[0.4, 0.11, 1]} rotation={-0.04} color="#2a140d" />
        <Dash position={[0.14, -0.33, 0.1]} scale={[0.3, 0.036, 1]} rotation={-0.04} color="#fff9df" />
      </group>
    );
  }

  if (type === "laugh") {
    return (
      <group>
        <Oval position={[0.1, -0.34, 0.09]} scale={[0.36, 0.17, 1]} color="#24120d" renderOrder={35} />
        <Oval position={[0.2, -0.39, 0.1]} scale={[0.16, 0.07, 1]} color="#f26072" renderOrder={36} />
      </group>
    );
  }

  if (type === "smirk") {
    return <Dash position={[0.12, -0.33, 0.09]} scale={[0.38, 0.06, 1]} rotation={-0.18} color="#24120d" />;
  }

  return (
    <group>
      <Dash position={[0.12, -0.34, 0.09]} scale={[0.42, 0.07, 1]} rotation={-0.05} color="#27140e" />
      <Dash position={[0.15, -0.37, 0.1]} scale={[0.25, 0.032, 1]} rotation={-0.05} color="#ef4f63" opacity={0.76} />
    </group>
  );
}

function ReactionFace({ id }: { id: OgreReactionId }) {
  return (
    <group>
      <Oval position={facePoint(2.45, 1.92, 0.86)} scale={faceScale(0.82, 0.54)} color="#8cc82c" opacity={0.24} renderOrder={26} />
      <Oval position={facePoint(2.34, 1.81, 0.87)} scale={faceScale(0.52, 0.32)} color="#6fab20" opacity={0.16} renderOrder={27} />
      {id === "joy" ? <JoyFace /> : null}
      {id === "surprise" ? <SurpriseFace /> : null}
      {id === "tickle" ? <TickleFace /> : null}
      {id === "startle" ? <StartleFace /> : null}
    </group>
  );
}

function JoyFace() {
  return (
    <group>
      <ArcDots center={facePoint(2.22, 2.06, 0.91)} radius={faceLength(0.16)} start={0.18 * Math.PI} end={0.86 * Math.PI} color="#152109" size={faceLength(0.03)} />
      <ArcDots center={facePoint(2.57, 2.01, 0.91)} radius={faceLength(0.13)} start={0.16 * Math.PI} end={0.86 * Math.PI} color="#152109" size={faceLength(0.026)} />
      <Oval position={facePoint(2.56, 1.7, 0.91)} scale={faceScale(0.34, 0.18)} color="#27140e" renderOrder={30} />
      <Oval position={facePoint(2.58, 1.65, 0.92)} scale={faceScale(0.22, 0.08)} color="#ef4f63" renderOrder={31} />
      <Dash position={facePoint(2.02, 2.26, 0.92)} scale={faceScale(0.2, 0.035)} rotation={0.42} color="#fff08a" />
      <Dash position={facePoint(2.84, 2.17, 0.92)} scale={faceScale(0.2, 0.035)} rotation={-0.38} color="#fff08a" />
    </group>
  );
}

function SurpriseFace() {
  return (
    <group>
      <Oval position={facePoint(2.2, 2.07, 0.91)} scale={faceScale(0.18, 0.21)} color="#fff9df" renderOrder={30} />
      <Oval position={facePoint(2.2, 2.06, 0.92)} scale={faceScale(0.07, 0.09)} color="#11140b" renderOrder={31} />
      <Oval position={facePoint(2.56, 2.02, 0.91)} scale={faceScale(0.16, 0.19)} color="#fff9df" renderOrder={30} />
      <Oval position={facePoint(2.56, 2.01, 0.92)} scale={faceScale(0.06, 0.08)} color="#11140b" renderOrder={31} />
      <Oval position={facePoint(2.49, 1.66, 0.91)} scale={faceScale(0.2, 0.24)} color="#171006" renderOrder={30} />
      <Dash position={facePoint(2.16, 2.29, 0.92)} scale={faceScale(0.24, 0.04)} rotation={0.22} color="#231b10" />
      <Dash position={facePoint(2.6, 2.22, 0.92)} scale={faceScale(0.22, 0.04)} rotation={-0.28} color="#231b10" />
    </group>
  );
}

function TickleFace() {
  return (
    <group>
      <ArcDots center={facePoint(2.2, 2.05, 0.91)} radius={faceLength(0.15)} start={1.14 * Math.PI} end={1.84 * Math.PI} color="#152109" size={faceLength(0.028)} />
      <ArcDots center={facePoint(2.56, 2, 0.91)} radius={faceLength(0.13)} start={1.14 * Math.PI} end={1.84 * Math.PI} color="#152109" size={faceLength(0.025)} />
      <Oval position={facePoint(2.5, 1.68, 0.91)} scale={faceScale(0.3, 0.14)} color="#22130c" renderOrder={30} />
      <Oval position={facePoint(2.58, 1.63, 0.92)} scale={faceScale(0.12, 0.18)} color="#f26072" renderOrder={31} />
      <Oval position={facePoint(2.08, 1.82, 0.91)} scale={faceScale(0.08, 0.045)} color="#ef3aa2" opacity={0.7} renderOrder={31} />
      <Oval position={facePoint(2.77, 1.76, 0.91)} scale={faceScale(0.07, 0.04)} color="#ef3aa2" opacity={0.7} renderOrder={31} />
    </group>
  );
}

function StartleFace() {
  return (
    <group>
      <Oval position={facePoint(2.19, 2.07, 0.91)} scale={faceScale(0.18, 0.22)} color="#fff9df" renderOrder={30} />
      <Oval position={facePoint(2.54, 2.02, 0.91)} scale={faceScale(0.16, 0.2)} color="#fff9df" renderOrder={30} />
      <Ring position={facePoint(2.2, 2.06, 0.92)} scale={faceScale(0.09, 0.09)} color="#1a170e" />
      <Ring position={facePoint(2.55, 2.01, 0.92)} scale={faceScale(0.08, 0.08)} color="#1a170e" />
      <Oval position={facePoint(2.5, 1.66, 0.91)} scale={faceScale(0.28, 0.12)} color="#24120d" renderOrder={30} />
      <Drop position={facePoint(2.86, 1.97, 0.92)} scale={faceScale(0.07, 0.13)} color="#8cfff0" />
      <Dash position={facePoint(2.08, 2.3, 0.92)} scale={faceScale(0.25, 0.04)} rotation={0.52} color="#231b10" />
      <Dash position={facePoint(2.62, 2.22, 0.92)} scale={faceScale(0.22, 0.04)} rotation={-0.54} color="#231b10" />
    </group>
  );
}

function facePoint(x: number, y: number, z: number): [number, number, number] {
  return [
    REACTION_FACE_TARGET.x + (x - REACTION_FACE_SOURCE.x) * REACTION_FACE_SCALE,
    REACTION_FACE_TARGET.y + (y - REACTION_FACE_SOURCE.y) * REACTION_FACE_SCALE,
    z,
  ];
}

function faceScale(x: number, y: number): [number, number, number] {
  return [x * REACTION_FACE_SCALE, y * REACTION_FACE_SCALE, 1];
}

function faceLength(value: number) {
  return value * REACTION_FACE_SCALE;
}

function ReactionBackMarks({ id, tick }: { id: OgreReactionId; tick: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const lastTickRef = useRef(tick);
  const startedRef = useRef(0);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    if (lastTickRef.current !== tick) {
      lastTickRef.current = tick;
      startedRef.current = clock.elapsedTime;
    }

    const age = clock.elapsedTime - startedRef.current;
    const opacity = age > 1.1 ? 0 : 1 - age / 1.1;
    group.visible = opacity > 0.02;
    group.scale.setScalar(1 + Math.sin(Math.min(age / 0.55, 1) * Math.PI) * 0.08);
  });

  const color = id === "joy" ? "#fff08a" : id === "surprise" ? "#38e8d1" : id === "tickle" ? "#ef3aa2" : "#ff8b20";
  const marks = [
    { x: 0.95, y: 1.78, r: 0.72 },
    { x: 1.28, y: 1.6, r: -0.58 },
    { x: 1.6, y: 1.42, r: 0.44 },
    { x: 1.88, y: 1.22, r: -0.32 },
  ];

  return (
    <group ref={groupRef}>
      {marks.map((mark, index) => (
        <Dash key={`${id}-${index}`} position={[mark.x, mark.y, 0.88]} scale={[0.28 - index * 0.025, 0.04, 1]} rotation={mark.r} color={color} opacity={0.82} />
      ))}
    </group>
  );
}

function Oval({
  position,
  scale,
  color,
  opacity = 1,
  renderOrder = 29,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity?: number;
  renderOrder?: number;
}) {
  return (
    <mesh position={position} scale={scale} renderOrder={renderOrder}>
      <circleGeometry args={[1, 28]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Dash({
  position,
  scale,
  rotation,
  color,
  opacity = 1,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: number;
  color: string;
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation={[0, 0, rotation]} scale={scale} renderOrder={33}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Ring({ position, scale, color }: { position: [number, number, number]; scale: [number, number, number]; color: string }) {
  return (
    <mesh position={position} scale={scale} renderOrder={32}>
      <ringGeometry args={[0.52, 1, 28]} />
      <meshBasicMaterial color={color} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Drop({ position, scale, color }: { position: [number, number, number]; scale: [number, number, number]; color: string }) {
  return (
    <group position={position} rotation={[0, 0, -0.22]} scale={scale}>
      <mesh position={[0, -0.2, 0]} renderOrder={33}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color={color} transparent opacity={0.86} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 4]} scale={[0.74, 0.74, 1]} renderOrder={33}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.86} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ArcDots({
  center,
  radius,
  start,
  end,
  color,
  size,
}: {
  center: [number, number, number];
  radius: number;
  start: number;
  end: number;
  color: string;
  size: number;
}) {
  const dots = Array.from({ length: 7 }, (_, index) => start + ((end - start) * index) / 6);

  return (
    <group>
      {dots.map((angle, index) => (
        <Oval
          key={`${center[0]}-${center[1]}-${index}`}
          position={[center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius, center[2]]}
          scale={[size, size, 1]}
          color={color}
          renderOrder={32}
        />
      ))}
    </group>
  );
}

function RaisedBumperRails() {
  const bottom = BUMPER_BOTTOM_Y;
  const top = SHOT_BOUNDS.top;
  const left = SHOT_BOUNDS.left;
  const right = SHOT_BOUNDS.right;

  return (
    <group>
      <BumperSegment from={{ x: left, y: bottom, z: BUMPER_Z }} to={{ x: left, y: top, z: BUMPER_Z }} lipSide={-1} studOffset={0} />
      <BumperSegment from={{ x: right, y: bottom, z: BUMPER_Z }} to={{ x: right, y: top, z: BUMPER_Z }} lipSide={1} studOffset={2} />
      <BumperSegment from={{ x: left, y: top, z: BUMPER_Z }} to={{ x: right, y: top, z: BUMPER_Z }} lipSide={-1} studOffset={4} />
    </group>
  );
}

function BumperSegment({ from, to, lipSide, studOffset }: { from: Vec3; to: Vec3; lipSide: -1 | 1; studOffset: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const studCount = Math.max(3, Math.floor(length / 0.32) + 1);
  const studs = Array.from({ length: studCount }, (_, index) => -length / 2 + (length / Math.max(1, studCount - 1)) * index);

  return (
    <group position={[(from.x + to.x) / 2, (from.y + to.y) / 2, from.z]} rotation={[0, 0, angle]}>
      <mesh position={[0.035, -0.035, -0.012]} scale={[length + BUMPER_WIDTH * 0.6, BUMPER_WIDTH * 1.7, 1]} renderOrder={12}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#142108" transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh scale={[length, BUMPER_WIDTH, 1]} renderOrder={13}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#5b224f" />
      </mesh>
      <mesh position={[-length / 2, 0, 0]} scale={[BUMPER_WIDTH / 2, BUMPER_WIDTH / 2, 1]} renderOrder={13}>
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial color="#5b224f" />
      </mesh>
      <mesh position={[length / 2, 0, 0]} scale={[BUMPER_WIDTH / 2, BUMPER_WIDTH / 2, 1]} renderOrder={13}>
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial color="#5b224f" />
      </mesh>
      <mesh position={[0, lipSide * BUMPER_WIDTH * 0.2, 0.012]} scale={[length * 0.96, BUMPER_WIDTH * 0.18, 1]} renderOrder={14}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#f6d45b" transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[0, -lipSide * BUMPER_WIDTH * 0.18, 0.014]} scale={[length * 0.86, BUMPER_WIDTH * 0.22, 1]} renderOrder={14}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#bff24a" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {studs.map((x, index) => (
        <BumperStud key={`${studOffset}-${index}`} x={x} index={index + studOffset} />
      ))}
    </group>
  );
}

function BumperStud({ x, index }: { x: number; index: number }) {
  const colors = ["#bff24a", "#ef3aa2", "#ffd22c", "#38e8d1"];
  const color = colors[index % colors.length];
  const size = 0.043 + (index % 3) * 0.007;

  return (
    <group position={[x, 0, 0.024]}>
      <mesh scale={[size * 1.65, size * 1.65, 1]} renderOrder={15}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color="#26360d" transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh scale={[size, size, 1]} renderOrder={16}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color={color} depthWrite={false} />
      </mesh>
      <mesh position={[-size * 0.22, size * 0.24, 0.002]} scale={[size * 0.28, size * 0.28, 1]} renderOrder={17}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial color="#fff6cf" transparent opacity={0.86} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    camera.position.z = aspect < 0.8 ? 8.2 : aspect < 1.25 ? 7.8 : 7.4;
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

interface PlaneProps {
  url: string;
  position: [number, number, number];
  scale: [number, number, number];
  opacity: number;
}

function TexturedPlane({ url, position, scale, opacity }: PlaneProps) {
  const texture = useLoader(THREE.TextureLoader, url);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh position={position} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent={opacity < 1 || texture.source.data} opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

interface BubbleProps {
  slot: BoardSlot;
  colorId: BubbleColorId;
  popping: boolean;
}

const PimpleBubble = memo(function PimpleBubble({ slot, colorId, popping }: BubbleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const popStartedRef = useRef<number | null>(null);
  const wobbleSeed = (slot.row * 19 + slot.col * 7) * 0.13;

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    if (popping && popStartedRef.current === null) {
      popStartedRef.current = clock.elapsedTime;
    }

    if (!popping) {
      popStartedRef.current = null;
    }

    const popAge = popStartedRef.current === null ? 0 : clock.elapsedTime - popStartedRef.current;
    const popProgress = popping ? THREE.MathUtils.clamp(popAge / 0.42, 0, 1) : 0;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.1 + wobbleSeed) * 0.012;
    const popScale = popping ? 1 + Math.sin(popProgress * Math.PI) * 0.6 - popProgress * 0.24 : 1;
    group.scale.setScalar(slot.radius * pulse * popScale);
    group.rotation.z = Math.sin(clock.elapsedTime * 0.8 + wobbleSeed) * 0.018;
  });

  return (
    <group ref={groupRef} position={[slot.x, slot.y, BOARD_Z]} renderOrder={popping ? 80 : 20 + slot.row}>
      <PimpleDisc colorId={colorId} />
      {popping ? <PopBurst seedKey={slot.id} /> : null}
    </group>
  );
});

function PopBurst({ seedKey }: { seedKey: string }) {
  const droplets = useMemo(() => makeGooDroplets(seedKey), [seedKey]);

  return (
    <group position={[0, 0, 0.08]}>
      <HealingPatch />
      <PopShockRing />
      {droplets.map((droplet, index) => (
        <GooDroplet key={`${seedKey}-${index}`} droplet={droplet} />
      ))}
    </group>
  );
}

interface GooDropletSpec {
  angle: number;
  color: string;
  delay: number;
  distance: number;
  size: number;
  stretch: number;
}

function GooDroplet({ droplet }: { droplet: GooDropletSpec }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const startedRef = useRef<number | null>(null);

  useFrame(({ clock }) => {
    startedRef.current ??= clock.elapsedTime;
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) {
      return;
    }

    const age = clock.elapsedTime - startedRef.current - droplet.delay;
    const progress = THREE.MathUtils.clamp(age / 0.78, 0, 1);
    const ease = 1 - (1 - progress) ** 3;
    const gravity = progress * progress * 0.42;
    const x = Math.cos(droplet.angle) * droplet.distance * ease;
    const y = Math.sin(droplet.angle) * droplet.distance * ease - gravity;

    mesh.position.set(x, y, 0.16 + progress * 0.04);
    mesh.rotation.z = droplet.angle;
    mesh.scale.set(droplet.size * droplet.stretch * (1 - progress * 0.24), droplet.size * (0.9 - progress * 0.38), 1);
    material.opacity = age < 0 ? 0 : Math.max(0, (1 - progress) ** 0.65);
  });

  return (
    <mesh ref={meshRef} renderOrder={92}>
      <circleGeometry args={[1, 14]} />
      <meshBasicMaterial ref={materialRef} color={droplet.color} transparent opacity={0} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

function HealingPatch() {
  const patchRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const startedRef = useRef<number | null>(null);

  useFrame(({ clock }) => {
    startedRef.current ??= clock.elapsedTime;
    const patch = patchRef.current;
    const material = materialRef.current;
    if (!patch || !material) {
      return;
    }

    const progress = THREE.MathUtils.clamp((clock.elapsedTime - startedRef.current) / 0.9, 0, 1);
    patch.scale.set(0.5 + progress * 1.05, 0.34 + progress * 0.72, 1);
    material.opacity = (1 - progress) * 0.5;
  });

  return (
    <mesh ref={patchRef} position={[0, 0, -0.02]} renderOrder={88}>
      <circleGeometry args={[1, 28]} />
      <meshBasicMaterial ref={materialRef} color="#8bd241" transparent opacity={0.5} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

function PopShockRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const startedRef = useRef<number | null>(null);

  useFrame(({ clock }) => {
    startedRef.current ??= clock.elapsedTime;
    const ring = ringRef.current;
    const material = materialRef.current;
    if (!ring || !material) {
      return;
    }

    const progress = THREE.MathUtils.clamp((clock.elapsedTime - startedRef.current) / 0.34, 0, 1);
    const scale = 0.45 + progress * 1.25;
    ring.scale.set(scale, scale, 1);
    material.opacity = (1 - progress) * 0.78;
  });

  return (
    <mesh ref={ringRef} position={[0, 0, 0.12]} renderOrder={91}>
      <ringGeometry args={[0.72, 1, 32]} />
      <meshBasicMaterial ref={materialRef} color="#fff08a" transparent opacity={0.78} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

function makeGooDroplets(seedKey: string) {
  const rng = seededRandom(hashString(seedKey));
  const count = 14 + Math.floor(rng() * 5);

  return Array.from({ length: count }, (): GooDropletSpec => ({
    angle: rng() * Math.PI * 2,
    color: GOO_COLORS[Math.floor(rng() * GOO_COLORS.length)],
    delay: rng() * 0.08,
    distance: 1.55 + rng() * 2.1,
    size: 0.16 + rng() * 0.12,
    stretch: 1 + rng() * 1.45,
  }));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  return () => {
    let next = (seed += 0x6d2b79f5);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function PimpleDisc({ colorId }: { colorId: BubbleColorId }) {
  const texture = useLoader(THREE.TextureLoader, PIMPLE_SPRITES[colorId]);
  const color = colorDef(colorId);

  useEffect(() => {
    const trim = PIMPLE_SOURCE_TRIMS[colorId];
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(trim.size / PIMPLE_TEXTURE_SIZE, trim.size / PIMPLE_TEXTURE_SIZE);
    texture.offset.set(trim.x / PIMPLE_TEXTURE_SIZE, 1 - (trim.y + trim.size) / PIMPLE_TEXTURE_SIZE);
    texture.needsUpdate = true;
  }, [colorId, texture]);

  return (
    <group scale={[PIMPLE_SPRITE_SCALE, PIMPLE_SPRITE_SCALE, 1]}>
      <mesh>
        <circleGeometry args={[0.5, 64]} />
        <meshBasicMaterial color={color.hex} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <circleGeometry args={[0.5, 64]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.08} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface AimGuideProps {
  trace: TraceResult;
  colorId: BubbleColorId;
  visible: boolean;
}

function AimGuide({ trace, colorId, visible }: AimGuideProps) {
  const color = colorDef(colorId);
  if (!visible) {
    return null;
  }

  const dots = samplePolyline(trace.path, 17);

  return (
    <group>
      {dots.map((point, index) => (
        <mesh key={`${point.x}-${point.y}-${index}`} position={[point.x, point.y, SHOT_Z + 0.04]} scale={0.022 + index * 0.0016}>
          <circleGeometry args={[1, 18]} />
          <meshBasicMaterial color={index === dots.length - 1 ? color.glow : color.hex} transparent opacity={0.78 - index * 0.024} depthTest={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function LauncherRig({ colorId }: { colorId: BubbleColorId }) {
  const pocket: Vec3 = { x: SHOOTER_POSITION.x, y: SHOOTER_POSITION.y, z: SHOT_Z + 0.01 };

  return (
    <group>
      <TexturedPlane url={launcherUrl} position={[0, -2.34, 0.4]} scale={[1.22, 0.81, 1]} opacity={1} />
      <group position={[pocket.x, pocket.y, pocket.z]} scale={BUBBLE_RADIUS * 1.08} renderOrder={50}>
        <PimpleDisc colorId={colorId} />
      </group>
      <SlingBand from={[-0.36, -2.05, SHOT_Z + 0.08]} to={[pocket.x - 0.08, pocket.y + 0.01, SHOT_Z + 0.08]} />
      <SlingBand from={[0.36, -2.05, SHOT_Z + 0.08]} to={[pocket.x + 0.08, pocket.y + 0.01, SHOT_Z + 0.08]} />
      <mesh position={[pocket.x, pocket.y + 0.04, SHOT_Z + 0.09]} scale={[0.27, 0.035, 1]} renderOrder={56}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#2a2115" transparent opacity={0.72} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SlingBand({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, from[2]]} rotation={[0, 0, angle]} scale={[length, 0.045, 1]} renderOrder={55}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#c89b47" depthTest={false} depthWrite={false} />
    </mesh>
  );
}

interface ProjectileProps {
  shot: ShotPlan;
  onDone: (shot: ShotPlan) => void;
}

function Projectile({ shot, onDone }: ProjectileProps) {
  const ref = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);

  const sampledPath = useMemo(() => buildPathSampler(shot.path), [shot.path]);

  useFrame((_, delta) => {
    if (!ref.current || doneRef.current) {
      return;
    }

    elapsedRef.current += delta;
    const duration = Math.max(0.32, sampledPath.totalLength * 0.1);
    const t = Math.min(1, elapsedRef.current / duration);
    const point = sampledPath.at(t);
    ref.current.position.set(point.x, point.y, SHOT_Z + 0.08);
    ref.current.scale.setScalar(BUBBLE_RADIUS * (1 + Math.sin(t * Math.PI) * 0.18));

    if (t >= 1) {
      doneRef.current = true;
      onDone(shot);
    }
  });

  return (
    <group ref={ref} position={[SHOT_START.x, SHOT_START.y, SHOT_Z]} renderOrder={60}>
      <PimpleDisc colorId={shot.color} />
    </group>
  );
}

const SHOT_START: Vec3 = { x: SHOOTER_POSITION.x, y: SHOOTER_POSITION.y, z: SHOT_Z };

function buildPathSampler(points: Vec3[]) {
  const safePoints = points.length > 1 ? points : [SHOT_START, { x: 0, y: 0, z: SHOT_Z }];
  const lengths: number[] = [0];
  let totalLength = 0;

  for (let i = 1; i < safePoints.length; i += 1) {
    totalLength += Math.hypot(safePoints[i].x - safePoints[i - 1].x, safePoints[i].y - safePoints[i - 1].y);
    lengths.push(totalLength);
  }

  return {
    totalLength,
    at(t: number): Vec3 {
      const targetDistance = t * totalLength;
      let segment = 1;
      while (segment < lengths.length - 1 && lengths[segment] < targetDistance) {
        segment += 1;
      }

      const from = safePoints[segment - 1];
      const to = safePoints[segment];
      const span = Math.max(0.0001, lengths[segment] - lengths[segment - 1]);
      const localT = (targetDistance - lengths[segment - 1]) / span;

      return {
        x: THREE.MathUtils.lerp(from.x, to.x, localT),
        y: THREE.MathUtils.lerp(from.y, to.y, localT),
        z: THREE.MathUtils.lerp(from.z, to.z, localT),
      };
    },
  };
}

function samplePolyline(points: Vec3[], count: number) {
  const sampler = buildPathSampler(points);

  if (sampler.totalLength <= 0 || count <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => sampler.at((index + 1) / count));
}

interface PointerPlaneProps {
  disabled: boolean;
  onAim: (target: Vec2) => void;
  onShoot: () => void;
}

function PointerPlane({ disabled, onAim, onShoot }: PointerPlaneProps) {
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onAim({ x: THREE.MathUtils.clamp(event.point.x, SHOT_BOUNDS.left, SHOT_BOUNDS.right), y: THREE.MathUtils.clamp(event.point.y, -1.92, SHOT_BOUNDS.top) });
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!disabled) {
      onShoot();
    }
  };

  return (
    <mesh position={[0, 0, 1.55]} onPointerMove={handlePointerMove} onClick={handleClick}>
      <planeGeometry args={[8.4, 4.8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
