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
import reactionBrowRaiseHeadUrl from "../../assets/characters/reactions/ogre-reaction-browRaise.png";
import reactionJoyHeadUrl from "../../assets/characters/reactions/ogre-reaction-joy.png";
import reactionStartleHeadUrl from "../../assets/characters/reactions/ogre-reaction-startle.png";
import reactionSurpriseHeadUrl from "../../assets/characters/reactions/ogre-reaction-surprise.png";
import reactionTickleHeadUrl from "../../assets/characters/reactions/ogre-reaction-tickle.png";
import ogreBodyNoHeadUrl from "../../assets/characters/rig/ogre-body-no-head.png";
import ogreShoulderOccluderUrl from "../../assets/characters/rig/ogre-shoulder-occluder.png";
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

const OGRE_REACTION_HEADS: Record<OgreReactionId, string> = {
  joy: reactionJoyHeadUrl,
  surprise: reactionSurpriseHeadUrl,
  tickle: reactionTickleHeadUrl,
  startle: reactionStartleHeadUrl,
  browRaise: reactionBrowRaiseHeadUrl,
};

const BUMPER_BOTTOM_Y = SHOOTER_POSITION.y - 0.2;
const BUMPER_WIDTH = 0.14;
const BUMPER_Z = BOARD_Z - 0.02;
const OGRE_PLANE_POSITION: [number, number, number] = [0.05, 0.02, -0.62];
const OGRE_PLANE_SCALE: [number, number, number] = [8.4, 5.6, 1];
const OGRE_SOURCE_SIZE = { width: 1536, height: 1024 };
const REACTION_HEAD_ORIGIN = { x: 816, y: -15 };
const REACTION_HEAD_SIZES: Record<OgreReactionId, { width: number; height: number }> = {
  joy: { width: 434, height: 525 },
  surprise: { width: 434, height: 525 },
  tickle: { width: 435, height: 525 },
  startle: { width: 434, height: 525 },
  browRaise: { width: 435, height: 525 },
};
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
      <OgreSprite reaction={reaction} />
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

function OgreSprite({ reaction }: { reaction: OgreReactionState }) {
  if (reaction.tick === 0) {
    return <TexturedPlane url={ogreUrl} position={OGRE_PLANE_POSITION} scale={OGRE_PLANE_SCALE} opacity={1} renderOrder={4} />;
  }

  const headSize = REACTION_HEAD_SIZES[reaction.id];
  const headScale = headPlaneScale(headSize);
  const headPosition = headPlanePosition(headSize);

  return (
    <group>
      <TexturedPlane url={ogreBodyNoHeadUrl} position={OGRE_PLANE_POSITION} scale={OGRE_PLANE_SCALE} opacity={1} renderOrder={4} />
      <TexturedPlane url={OGRE_REACTION_HEADS[reaction.id]} position={headPosition} scale={headScale} opacity={1} renderOrder={5} />
      <TexturedPlane url={ogreShoulderOccluderUrl} position={[OGRE_PLANE_POSITION[0], OGRE_PLANE_POSITION[1], -0.54]} scale={OGRE_PLANE_SCALE} opacity={1} renderOrder={6} />
    </group>
  );
}

function headPlanePosition(headSize: { width: number; height: number }): [number, number, number] {
  const centerX = REACTION_HEAD_ORIGIN.x + headSize.width / 2;
  const centerY = REACTION_HEAD_ORIGIN.y + headSize.height / 2;

  return [
    OGRE_PLANE_POSITION[0] + (centerX / OGRE_SOURCE_SIZE.width - 0.5) * OGRE_PLANE_SCALE[0],
    OGRE_PLANE_POSITION[1] + (0.5 - centerY / OGRE_SOURCE_SIZE.height) * OGRE_PLANE_SCALE[1],
    -0.58,
  ];
}

function headPlaneScale(headSize: { width: number; height: number }): [number, number, number] {
  return [(headSize.width / OGRE_SOURCE_SIZE.width) * OGRE_PLANE_SCALE[0], (headSize.height / OGRE_SOURCE_SIZE.height) * OGRE_PLANE_SCALE[1], 1];
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
  renderOrder?: number;
}

function TexturedPlane({ url, position, scale, opacity, renderOrder = 0 }: PlaneProps) {
  const texture = useLoader(THREE.TextureLoader, url);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh position={position} scale={scale} renderOrder={renderOrder}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent={opacity < 1 || texture.source.data} opacity={opacity} depthWrite={false} toneMapped={false} />
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
