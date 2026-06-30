export interface Track {
  id: string;
  name: string;
  description: string;
  genre: string;
  bpm: number;
  primaryColor: string; // Tailwind color e.g. "cyan-500"
  secondaryColor: string; // e.g. "pink-500"
  shadowColor: string; // e.g. "shadow-cyan-500/50"
  tags: string[];
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export interface SnakeSkin {
  id: string;
  name: string;
  headClass: string;
  bodyClass: string;
  glowColor: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}
