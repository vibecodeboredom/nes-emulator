export const NES_WIDTH = 256;
export const NES_HEIGHT = 240;

export const NES_BUTTONS = {
  A: 0,
  B: 1,
  SELECT: 2,
  START: 3,
  UP: 4,
  DOWN: 5,
  LEFT: 6,
  RIGHT: 7,
  TURBO_A: 8,
  TURBO_B: 9,
} as const;

export const DEFAULT_KEY_MAP: Record<string, { player: number; button: number }> = {
  // Arrow keys for D-Pad
  ArrowUp: { player: 1, button: NES_BUTTONS.UP },
  ArrowDown: { player: 1, button: NES_BUTTONS.DOWN },
  ArrowLeft: { player: 1, button: NES_BUTTONS.LEFT },
  ArrowRight: { player: 1, button: NES_BUTTONS.RIGHT },

  // WASD alternative
  KeyW: { player: 1, button: NES_BUTTONS.UP },
  KeyS: { player: 1, button: NES_BUTTONS.DOWN },
  KeyA: { player: 1, button: NES_BUTTONS.LEFT },
  KeyD: { player: 1, button: NES_BUTTONS.RIGHT },

  // Primary Action Buttons (Jump: ; and Run: L)
  Semicolon: { player: 1, button: NES_BUTTONS.A }, // Jump
  KeyL: { player: 1, button: NES_BUTTONS.B },      // Run

  // Alternative / Classic Action Buttons
  KeyX: { player: 1, button: NES_BUTTONS.A },
  KeyZ: { player: 1, button: NES_BUTTONS.B },
  KeyY: { player: 1, button: NES_BUTTONS.B }, // QWERTZ / German keyboards

  // Turbo Buttons
  KeyC: { player: 1, button: NES_BUTTONS.TURBO_B },
  KeyV: { player: 1, button: NES_BUTTONS.TURBO_A },

  // Start & Select
  Enter: { player: 1, button: NES_BUTTONS.START },
  ShiftRight: { player: 1, button: NES_BUTTONS.SELECT },
  ShiftLeft: { player: 1, button: NES_BUTTONS.SELECT },
  Space: { player: 1, button: NES_BUTTONS.SELECT },
};
