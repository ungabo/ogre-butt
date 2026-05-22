export type BubbleColorId = "red" | "blue" | "gold" | "violet" | "teal" | "orange";
export type OgreReactionId = "joy" | "surprise" | "tickle" | "startle" | "browRaise";

export interface OgreReactionState {
  id: OgreReactionId;
  tick: number;
}

export interface BubbleColorDef {
  id: BubbleColorId;
  label: string;
  hex: string;
  dark: string;
  glow: string;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 extends Vec2 {
  z: number;
}

export interface BoardSlot extends Vec3 {
  id: string;
  row: number;
  col: number;
  radius: number;
  anchor: boolean;
  neighborIds: string[];
  bubble: BubbleColorId | null;
}

export interface ShotPlan {
  id: number;
  color: BubbleColorId;
  path: Vec3[];
  targetSlotId: string | null;
  targetSlot: BoardSlot | null;
}

export interface TraceResult {
  path: Vec3[];
  targetSlotId: string | null;
  hitSlotId: string | null;
  targetSlot: BoardSlot | null;
}

export interface PopResult {
  matchingIds: string[];
  detachedIds: string[];
}

export const BUBBLE_COLORS: BubbleColorDef[] = [
  { id: "red", label: "Rash Red", hex: "#ff3b42", dark: "#8d1117", glow: "#ff8b8e" },
  { id: "blue", label: "Bruise Blue", hex: "#1597ff", dark: "#064b8c", glow: "#86d8ff" },
  { id: "gold", label: "Sickly Gold", hex: "#ffd22c", dark: "#8e6a00", glow: "#fff08a" },
  { id: "violet", label: "Violet Bump", hex: "#bb41ff", dark: "#5e148c", glow: "#efb4ff" },
  { id: "teal", label: "Whitehead", hex: "#fff7dc", dark: "#9f8f65", glow: "#ffffff" },
  { id: "orange", label: "Ooze Orange", hex: "#ff8b20", dark: "#8d3e00", glow: "#ffc266" },
];

export const OGRE_REACTIONS: OgreReactionId[] = ["joy", "surprise", "tickle", "startle", "browRaise"];

export function colorDef(id: BubbleColorId): BubbleColorDef {
  return BUBBLE_COLORS.find((color) => color.id === id) ?? BUBBLE_COLORS[0];
}
