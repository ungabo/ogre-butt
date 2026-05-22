import { BUBBLE_COLORS, type BoardSlot, type BubbleColorId, type PopResult, type TraceResult, type Vec2, type Vec3 } from "./types";

export const SHOOTER_POSITION: Vec3 = { x: 0, y: -2.14, z: 0.52 };
export const BUBBLE_RADIUS = 0.145;
export const BOARD_Z = 0.72;
export const SHOT_Z = 1.04;

export const SHOT_BOUNDS = {
  left: -4.15,
  right: 4.15,
  top: 2.35,
};

const SLOT_X = BUBBLE_RADIUS * 2;
const SLOT_Y = SLOT_X * 0.8660254038;
const NEIGHBOR_TOUCH_DISTANCE = SLOT_X * 1.08;
const SHOT_COLLISION_RADIUS = BUBBLE_RADIUS * 2;
const TRACE_EPSILON = 0.0001;
const MAX_SHOT_BOUNCES = 8;
const SLOT_MATCH_DISTANCE = SLOT_X * 0.42;
const SLOT_OVERLAP_DISTANCE = SLOT_X * 0.92;
const GRID_ORIGIN_X = -0.44;
const ATTACHMENT_OFFSETS: Vec2[] = [
  { x: -SLOT_X, y: 0 },
  { x: SLOT_X, y: 0 },
  { x: -SLOT_X / 2, y: SLOT_Y },
  { x: SLOT_X / 2, y: SLOT_Y },
  { x: -SLOT_X / 2, y: -SLOT_Y },
  { x: SLOT_X / 2, y: -SLOT_Y },
];
const CHEEK_ROWS = [
  { count: 8, centerX: -0.44 },
  { count: 11, centerX: -0.44 },
  { count: 12, centerX: -0.42 },
  { count: 13, centerX: -0.42 },
  { count: 13, centerX: -0.48 },
  { count: 12, centerX: -0.56 },
  { count: 11, centerX: -0.68 },
  { count: 9, centerX: -0.78 },
  { count: 6, centerX: -0.88 },
] as const;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distance2D(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function shotPoint(point: Vec2): Vec3 {
  return { x: point.x, y: point.y, z: SHOT_Z };
}

function randomColor(rng: () => number): BubbleColorId {
  return BUBBLE_COLORS[Math.floor(rng() * BUBBLE_COLORS.length)].id;
}

export function createInitialBoard(seed = 7): BoardSlot[] {
  const rng = mulberry32(seed);
  const slots: BoardSlot[] = [];

  for (let row = 0; row < CHEEK_ROWS.length; row += 1) {
    const { count: cols, centerX } = CHEEK_ROWS[row];
    const y = 0.82 - row * SLOT_Y;
    const firstX = snapRowFirstX(centerX - ((cols - 1) / 2) * SLOT_X, row);

    for (let col = 0; col < cols; col += 1) {
      const x = firstX + col * SLOT_X;
      const id = `slot-${row}-${col}`;

      slots.push({
        id,
        row,
        col,
        x,
        y,
        z: BOARD_Z,
        radius: BUBBLE_RADIUS,
        anchor: row <= 1,
        neighborIds: [],
        bubble: null,
      });
    }
  }

  assignNeighborLinks(slots);

  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  const sorted = [...slots].sort((a, b) => b.y - a.y || a.x - b.x);

  for (const slot of sorted) {
    if (slot.row >= 7) {
      continue;
    }

    const filledNeighbors = slot.neighborIds
      .map((id) => byId.get(id))
      .filter((neighbor): neighbor is BoardSlot => Boolean(neighbor?.bubble));

    if (filledNeighbors.length > 0 && rng() < 0.58) {
      slot.bubble = filledNeighbors[Math.floor(rng() * filledNeighbors.length)].bubble;
    } else {
      slot.bubble = randomColor(rng);
    }
  }

  return slots;
}

export function countOccupied(slots: BoardSlot[]) {
  return slots.reduce((total, slot) => total + (slot.bubble ? 1 : 0), 0);
}

export function choosePlayableColor(slots: BoardSlot[]): BubbleColorId {
  const colorsOnBoard = BUBBLE_COLORS.map((color) => color.id).filter((color) => slots.some((slot) => slot.bubble === color));
  const pool = colorsOnBoard.length > 0 ? colorsOnBoard : BUBBLE_COLORS.map((color) => color.id);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function traceShot(slots: BoardSlot[], aimTarget: Vec2): TraceResult {
  const occupied = slots.filter((slot) => slot.bubble);
  const empty = slots.filter((slot) => !slot.bubble);

  let direction = normalize({
    x: aimTarget.x - SHOOTER_POSITION.x,
    y: aimTarget.y - SHOOTER_POSITION.y,
  });

  if (direction.y <= TRACE_EPSILON) {
    direction = normalize({ x: direction.x, y: TRACE_EPSILON });
  }

  let origin: Vec2 = { x: SHOOTER_POSITION.x, y: SHOOTER_POSITION.y };
  const path: Vec3[] = [shotPoint(origin)];
  let hitSlot: BoardSlot | null = null;
  let impactPoint = shotPoint(origin);

  for (let bounce = 0; bounce <= MAX_SHOT_BOUNCES; bounce += 1) {
    const collision = firstShotCollision(origin, direction, occupied);

    if (collision.type === "bubble") {
      hitSlot = collision.slot;
      impactPoint = shotPoint(collision.point);
      path.push(impactPoint);
      break;
    }

    if (collision.type === "top") {
      impactPoint = shotPoint(collision.point);
      break;
    }

    path.push(shotPoint(collision.point));
    direction = { x: -direction.x, y: direction.y };
    origin = {
      x: collision.point.x + direction.x * TRACE_EPSILON,
      y: collision.point.y + direction.y * TRACE_EPSILON,
    };
  }

  const targetSlot = hitSlot ? findAttachmentSlot(slots, hitSlot, impactPoint) : nearestEmptySlot(empty, impactPoint);
  if (targetSlot && !hitSlot) {
    path.push(shotPoint(targetSlot));
  }

  return {
    path,
    targetSlotId: targetSlot?.id ?? null,
    hitSlotId: hitSlot?.id ?? null,
    targetSlot,
  };
}

type ShotCollision =
  | { type: "bubble"; distance: number; point: Vec2; slot: BoardSlot }
  | { type: "wall"; distance: number; point: Vec2 }
  | { type: "top"; distance: number; point: Vec2 };

function firstShotCollision(origin: Vec2, direction: Vec2, occupied: BoardSlot[]): ShotCollision {
  const wallDistance = nextWallDistance(origin, direction);
  const topDistance = direction.y > TRACE_EPSILON ? (SHOT_BOUNDS.top - origin.y) / direction.y : Number.POSITIVE_INFINITY;

  let nearestBubble: ShotCollision | null = null;

  for (const slot of occupied) {
    const distance = rayCircleDistance(origin, direction, slot, SHOT_COLLISION_RADIUS);

    if (distance === null || distance >= wallDistance || distance >= topDistance) {
      continue;
    }

    if (!nearestBubble || distance < nearestBubble.distance) {
      nearestBubble = {
        type: "bubble",
        distance,
        point: rayPoint(origin, direction, distance),
        slot,
      };
    }
  }

  if (nearestBubble) {
    return nearestBubble;
  }

  if (wallDistance < topDistance) {
    return {
      type: "wall",
      distance: wallDistance,
      point: rayPoint(origin, direction, wallDistance),
    };
  }

  return {
    type: "top",
    distance: topDistance,
    point: rayPoint(origin, direction, topDistance),
  };
}

function nextWallDistance(origin: Vec2, direction: Vec2) {
  if (direction.x < -TRACE_EPSILON) {
    return (SHOT_BOUNDS.left - origin.x) / direction.x;
  }

  if (direction.x > TRACE_EPSILON) {
    return (SHOT_BOUNDS.right - origin.x) / direction.x;
  }

  return Number.POSITIVE_INFINITY;
}

function rayCircleDistance(origin: Vec2, direction: Vec2, circle: Vec2, radius: number) {
  const offsetX = origin.x - circle.x;
  const offsetY = origin.y - circle.y;
  const alongRay = offsetX * direction.x + offsetY * direction.y;
  const outside = offsetX * offsetX + offsetY * offsetY - radius * radius;
  const discriminant = alongRay * alongRay - outside;

  if (discriminant < 0) {
    return null;
  }

  const distance = -alongRay - Math.sqrt(discriminant);
  return distance > TRACE_EPSILON ? distance : null;
}

function rayPoint(origin: Vec2, direction: Vec2, distance: number): Vec2 {
  return {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
  };
}

function findAttachmentSlot(slots: BoardSlot[], hitSlot: BoardSlot, impactPoint: Vec3): BoardSlot | null {
  const occupied = slots.filter((slot) => slot.bubble);
  const candidates = ATTACHMENT_OFFSETS.map((offset) => makeCandidateSlot(hitSlot, offset)).sort((a, b) => distance2D(a, impactPoint) - distance2D(b, impactPoint));

  for (const candidate of candidates) {
    const existing = findSlotAt(slots, candidate);
    if (existing) {
      if (!existing.bubble) {
        return existing;
      }
      continue;
    }

    const overlapsOccupied = occupied.some((slot) => slot.id !== hitSlot.id && distance2D(slot, candidate) < SLOT_OVERLAP_DISTANCE);
    if (!overlapsOccupied) {
      return candidate;
    }
  }

  return null;
}

function nearestEmptySlot(slots: BoardSlot[], point: Vec3) {
  return [...slots].sort((a, b) => distance2D(a, point) - distance2D(b, point))[0] ?? null;
}

export function placeBubble(slots: BoardSlot[], targetSlot: BoardSlot, color: BubbleColorId): BoardSlot[] {
  const hasTarget = slots.some((slot) => slot.id === targetSlot.id);
  const next = hasTarget
    ? slots.map((slot) => (slot.id === targetSlot.id ? { ...slot, bubble: color } : { ...slot }))
    : [...slots.map((slot) => ({ ...slot })), { ...targetSlot, bubble: color }];

  assignNeighborLinks(next);
  return next;
}

export function removeBubbles(slots: BoardSlot[], ids: Iterable<string>): BoardSlot[] {
  const removeIds = new Set(ids);
  return slots.map((slot) => (removeIds.has(slot.id) ? { ...slot, bubble: null } : { ...slot }));
}

export function resolvePops(slots: BoardSlot[], startSlotId: string): PopResult {
  const cluster = matchingCluster(slots, startSlotId);
  if (cluster.length < 3) {
    return { matchingIds: [], detachedIds: [] };
  }

  const afterMatch = removeBubbles(slots, cluster);
  const detached = detachedClusters(afterMatch);
  return { matchingIds: cluster, detachedIds: detached };
}

function matchingCluster(slots: BoardSlot[], startSlotId: string): string[] {
  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  const start = byId.get(startSlotId);
  if (!start?.bubble) {
    return [];
  }

  const queue = [start.id];
  const visited = new Set<string>([start.id]);

  while (queue.length > 0) {
    const current = byId.get(queue.shift() ?? "");
    if (!current) {
      continue;
    }

    for (const neighborId of current.neighborIds) {
      const neighbor = byId.get(neighborId);
      if (!neighbor?.bubble || neighbor.bubble !== start.bubble || visited.has(neighborId)) {
        continue;
      }

      visited.add(neighborId);
      queue.push(neighborId);
    }
  }

  return [...visited];
}

function detachedClusters(slots: BoardSlot[]): string[] {
  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  const occupied = slots.filter((slot) => slot.bubble);
  const anchors = occupied.filter((slot) => slot.anchor);

  if (anchors.length === 0) {
    return occupied.map((slot) => slot.id);
  }

  const connected = new Set<string>();
  const queue = anchors.map((slot) => slot.id);
  for (const id of queue) {
    connected.add(id);
  }

  while (queue.length > 0) {
    const current = byId.get(queue.shift() ?? "");
    if (!current) {
      continue;
    }

    for (const neighborId of current.neighborIds) {
      const neighbor = byId.get(neighborId);
      if (!neighbor?.bubble || connected.has(neighborId)) {
        continue;
      }

      connected.add(neighborId);
      queue.push(neighborId);
    }
  }

  return occupied.filter((slot) => !connected.has(slot.id)).map((slot) => slot.id);
}

function assignNeighborLinks(slots: BoardSlot[]) {
  for (const slot of slots) {
    slot.neighborIds = [];
  }

  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i];
      const b = slots[j];
      if (distance2D(a, b) < NEIGHBOR_TOUCH_DISTANCE) {
        a.neighborIds.push(b.id);
        b.neighborIds.push(a.id);
      }
    }
  }
}

function makeCandidateSlot(hitSlot: BoardSlot, offset: Vec2): BoardSlot {
  const x = hitSlot.x + offset.x;
  const y = hitSlot.y + offset.y;

  return {
    id: `slot-extra-${Math.round(x * 1000)}-${Math.round(y * 1000)}`,
    row: Math.round((0.82 - y) / SLOT_Y),
    col: Math.round(x / SLOT_X),
    x,
    y,
    z: BOARD_Z,
    radius: BUBBLE_RADIUS,
    anchor: false,
    neighborIds: [],
    bubble: null,
  };
}

function findSlotAt(slots: BoardSlot[], point: Vec2) {
  return slots.find((slot) => distance2D(slot, point) < SLOT_MATCH_DISTANCE) ?? null;
}

function snapRowFirstX(rawFirstX: number, row: number) {
  const desiredPhase = row % 2 === 0 ? SLOT_X / 2 : 0;
  const currentPhase = positiveModulo(rawFirstX - GRID_ORIGIN_X, SLOT_X);
  let delta = desiredPhase - currentPhase;

  if (delta > SLOT_X / 2) {
    delta -= SLOT_X;
  }

  if (delta < -SLOT_X / 2) {
    delta += SLOT_X;
  }

  return rawFirstX + delta;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
