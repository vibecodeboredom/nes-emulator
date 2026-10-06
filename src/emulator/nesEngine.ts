import { NES } from 'jsnes';
import { AudioPlayer } from './audioPlayer';
import { NES_WIDTH, NES_HEIGHT, DEFAULT_KEY_MAP } from './constants';
import {
  WorldLevelInfo,
  LevelDataReplaceResult,
  PowerupType,
  WarpResult,
  LiveLevelCorruptResult,
  LevelMergeResult,
  SpawnAheadResult,
} from '../types';

export interface NesEngineCallbacks {
  onFpsUpdate?: (fps: number) => void;
  onError?: (err: Error) => void;
  onStatusChange?: (status: 'running' | 'paused' | 'stopped') => void;
  onQuickSave?: () => void;
  onQuickLoad?: () => void;
  onQuickCorrupt?: () => void;
  onQuickGarbageCorrupt?: () => void;
  onQuickInfJump?: () => void;
  onQuickReset?: () => void;
  onQuickMergeLevelData?: () => void;
  onQuickSpawnFlag?: () => void;
  onQuickSpawnHammer?: () => void;
  onQuickRandomWarp?: () => void;
  onWorldLevelChange?: (info: WorldLevelInfo) => void;
  onAutoEnemyScrambleTick?: (result: LiveLevelCorruptResult) => void;
  onAutoStreamRandomizeTick?: (result: LiveLevelCorruptResult) => void;
  onSpeedChange?: (speed: number) => void;
}

export class NesEngine {
  private nes: any = null;
  private audio: AudioPlayer;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private buf32: Uint32Array | null = null;
  private romBuffer: Uint8Array | null = null;
  private originalRomBuffer: Uint8Array | null = null;

  private isRunning = false;
  private isPaused = false;
  private animationFrameId: number | null = null;

  private lastFrameTime = 0;
  private lastLoopTime = 0;
  private frameAccumulator = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;
  private emulationSpeed = 1.0;

  private infiniteHealth = false;
  private infiniteJump = false;
  private autoEnemyScramble = false;
  private autoEnemyScrambleSpeed = 2.0; // Interval in seconds (e.g. 0.5s to 5.0s)
  private autoEnemyScrambleIntensity = 5;
  private autoEnemyScrambleFrameCounter = 0;
  private autoStreamRandomize = false;
  private autoStreamRandomizeSpeed = 2.0; // Interval in seconds (e.g. 0.05s to 5.0s)
  private autoStreamRandomizeIntensity = 5;
  private autoStreamRandomizeFrameCounter = 0;
  private currentPowerup: PowerupType | null = null;
  private currentRomId: string = 'smb1';
  private inMemorySaveStates = new Map<string, any>();
  private lastReportedWorld = -999;
  private lastReportedLevel = -999;

  private callbacks: NesEngineCallbacks = {};
  private activeKeys = new Set<string>();

  // Track gamepad previous state to avoid redundant calls
  private prevGamepadButtons: Record<number, boolean> = {};

  constructor(callbacks: NesEngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.audio = new AudioPlayer();
  }

  public attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) return;

    this.imageData = this.ctx.createImageData(NES_WIDTH, NES_HEIGHT);
    const buf = new ArrayBuffer(this.imageData.data.length);
    this.buf32 = new Uint32Array(buf);

    // Fill with black initial screen
    for (let i = 0; i < this.buf32.length; i++) {
      this.buf32[i] = 0xff000000;
    }
    new Uint8ClampedArray(buf).forEach((v, idx) => {
      this.imageData!.data[idx] = v;
    });
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  public async loadRom(romData: Uint8Array | ArrayBuffer, romId?: string): Promise<void> {
    this.stop();
    this.currentRomId = romId || 'smb1';
    await this.audio.init();

    const data = romData instanceof Uint8Array ? romData : new Uint8Array(romData);
    this.romBuffer = data;
    this.originalRomBuffer = new Uint8Array(data);

    this.nes = new NES({
      onFrame: (frameBuffer: Uint32Array) => {
        if (!this.buf32) return;
        for (let i = 0; i < frameBuffer.length; i++) {
          this.buf32[i] = 0xff000000 | frameBuffer[i];
        }
      },
      onAudioSample: this.audio.writeSample,
      sampleRate: this.audio.getSampleRate(),
    });

    try {
      this.nes.loadROM(data);
      this.start();
    } catch (err) {
      console.error('Failed to load ROM:', err);
      if (this.callbacks.onError) {
        this.callbacks.onError(err as Error);
      }
      throw err;
    }
  }

  public start(): void {
    if (!this.nes) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.lastLoopTime = 0;
    this.frameAccumulator = 0;
    this.fpsTimer = performance.now();
    this.frameCount = 0;
    this.audio.resume();

    this.bindEvents();
    this.loop(performance.now());
    this.callbacks.onStatusChange?.('running');
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.isPaused = true;
    this.lastLoopTime = 0;
    this.frameAccumulator = 0;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.callbacks.onStatusChange?.('paused');
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.lastLoopTime = 0;
    this.frameAccumulator = 0;
    this.audio.resume();
    this.loop(performance.now());
    this.callbacks.onStatusChange?.('running');
  }

  public togglePause(): boolean {
    if (this.isPaused) {
      this.resume();
      return false;
    } else {
      this.pause();
      return true;
    }
  }

  public reset(): void {
    if (this.originalRomBuffer) {
      this.reloadRom().catch((err) => {
        console.error('Failed to reload ROM on reset:', err);
        if (this.nes) {
          this.nes.reset();
          this.audio.clearBuffer();
        }
      });
    } else if (this.nes) {
      this.nes.reset();
      this.audio.clearBuffer();
    }
  }

  public hasOriginalRom(): boolean {
    return !!this.originalRomBuffer;
  }

  public async reloadRom(): Promise<boolean> {
    if (!this.originalRomBuffer) {
      if (this.romBuffer) {
        this.originalRomBuffer = new Uint8Array(this.romBuffer);
      } else {
        return false;
      }
    }
    const cleanData = new Uint8Array(this.originalRomBuffer);
    await this.loadRom(cleanData, this.currentRomId);
    return true;
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.unbindEvents();
    this.audio.clearBuffer();
    this.callbacks.onStatusChange?.('stopped');
  }

  public getAudioPlayer(): AudioPlayer {
    return this.audio;
  }

  /**
   * Configures the Speedhack emulation speed multiplier
   * @param speed speed multiplier (0.1x to 10.0x; 1.0x is authentic 60 FPS normal speed)
   */
  public setSpeed(speed: number): void {
    if (typeof speed !== 'number' || isNaN(speed)) return;
    const clamped = Math.max(0.1, Math.min(10.0, speed));
    const rounded = Math.round(clamped * 100) / 100;
    this.emulationSpeed = rounded;
    this.audio.setPlaybackSpeed(rounded);
    this.callbacks.onSpeedChange?.(rounded);
  }

  public getSpeed(): number {
    return this.emulationSpeed;
  }

  public buttonDown(player: number, button: number): void {
    if (this.nes && this.nes.controllers[player]) {
      this.nes.controllers[player].buttonDown(button);
    }
  }

  public buttonUp(player: number, button: number): void {
    if (this.nes && this.nes.controllers[player]) {
      this.nes.controllers[player].buttonUp(button);
    }
  }

  public setInfiniteHealth(enabled: boolean): void {
    this.infiniteHealth = enabled;
    if (enabled) {
      this.applyCheats();
    }
  }

  public getInfiniteHealth(): boolean {
    return this.infiniteHealth;
  }

  public setInfiniteJump(enabled: boolean): void {
    this.infiniteJump = enabled;
    if (this.nes?.cpu?.mem) {
      const mem = this.nes.cpu.mem;
      if (enabled) {
        // SMB1 Game Genie AOAUIG: multi-jump / air-jump patch at $B48D (0x10 instead of 0xF0)
        mem[0xB48D] = 0x10;
      } else {
        mem[0xB48D] = 0xF0;
      }
    }
  }

  public getInfiniteJump(): boolean {
    return this.infiniteJump;
  }

  /**
   * Instantly triggers an upward mid-air jump boost for Mario in Super Mario Bros.
   * Can be pressed repeatedly or held to fly across levels!
   */
  public triggerInfiniteJump(): boolean {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) return false;

    // For Fami Dash and general games, pulse controller 1 Button A (Jump / Flap / Boost)
    if (this.currentRomId !== 'smb1') {
      this.buttonDown(1, 0); // 0 = A Button in jsnes
      setTimeout(() => {
        this.buttonUp(1, 0);
      }, 120);
      return true;
    }

    const mem = this.nes.cpu.mem;

    // Direct mid-air jump impulse in SMB1
    mem[0x001D] = 1; // Jumping state
    mem[0x009F] = 252; // Upward velocity (-4 px/frame in two's complement)
    mem[0x0433] = 0x20; // Upward jump movement force
    mem[0x0782] = 0x20; // Trigger SMB1 jump audio sound effect

    // Ensure air-jump ROM patch is also enabled
    if (mem[0xB48D] !== 0x10) {
      mem[0xB48D] = 0x10;
    }

    if (this.isPaused) {
      try {
        this.nes.frame();
        this.renderCanvas();
      } catch {
        // ignore
      }
    }
    return true;
  }

  /**
   * Configures automatic enemy scramble spawns mid-game.
   * @param enabled whether automatic recurring enemy scrambling is active
   * @param speedSeconds interval between scrambles in seconds (e.g. 0.5s to 5.0s)
   * @param intensity corruption intensity level (1 to 10)
   */
  public setAutoEnemyScramble(enabled: boolean, speedSeconds?: number, intensity?: number): void {
    this.autoEnemyScramble = enabled;
    if (typeof speedSeconds === 'number' && !isNaN(speedSeconds)) {
      this.autoEnemyScrambleSpeed = Math.max(0.01, Math.min(10, speedSeconds));
    }
    if (typeof intensity === 'number' && !isNaN(intensity)) {
      this.autoEnemyScrambleIntensity = Math.max(1, Math.min(10, intensity));
    }
    this.autoEnemyScrambleFrameCounter = 0;
  }

  public getAutoEnemyScramble(): { enabled: boolean; speedSeconds: number; intensity: number } {
    return {
      enabled: this.autoEnemyScramble,
      speedSeconds: this.autoEnemyScrambleSpeed,
      intensity: this.autoEnemyScrambleIntensity,
    };
  }

  /**
   * Configures automatic recurring randomization of the level stream ($E7, $E8) and upcoming terrain.
   * @param enabled whether automatic recurring level stream randomization is active
   * @param speedSeconds interval between randomizations in seconds (e.g. 0.05s to 5.0s)
   * @param intensity corruption intensity level (1 to 10)
   */
  public setAutoStreamRandomize(enabled: boolean, speedSeconds?: number, intensity?: number): void {
    this.autoStreamRandomize = enabled;
    if (typeof speedSeconds === 'number' && !isNaN(speedSeconds)) {
      this.autoStreamRandomizeSpeed = Math.max(0.01, Math.min(10, speedSeconds));
    }
    if (typeof intensity === 'number' && !isNaN(intensity)) {
      this.autoStreamRandomizeIntensity = Math.max(1, Math.min(10, intensity));
    }
    this.autoStreamRandomizeFrameCounter = 0;
  }

  public getAutoStreamRandomize(): { enabled: boolean; speedSeconds: number; intensity: number } {
    return {
      enabled: this.autoStreamRandomize,
      speedSeconds: this.autoStreamRandomizeSpeed,
      intensity: this.autoStreamRandomizeIntensity,
    };
  }

  /**
   * Switches Mario's powerup state mid-game in Super Mario Bros.
   * Supports: Small Mario, Super Mario (growth), Fire Mario (fireballs), and Starman (invincible)
   */
  public setPowerup(powerup: PowerupType): boolean {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) return false;
    const mem = this.nes.cpu.mem;
    this.currentPowerup = powerup;

    // In SMB1: if level is loading or on title screen, safely record preference and return
    if (this.currentRomId === 'smb1' && (mem[0x0770] !== 1 || mem[0x0772] !== 3)) {
      return true;
    }

    if (powerup === 'small') {
      mem[0x0756] = 0; // PlayerStatus = Small
      mem[0x0754] = 1; // PlayerSize = Small
      mem[0x079F] = 0; // Clear star power if active
    } else if (powerup === 'super') {
      mem[0x0756] = 1; // PlayerStatus = Super
      mem[0x0754] = 0; // PlayerSize = Big
      mem[0x079F] = 0;
      mem[0x0782] = 0x0B; // Powerup chime
    } else if (powerup === 'fire') {
      mem[0x0756] = 2; // PlayerStatus = Fire
      mem[0x0754] = 0; // PlayerSize = Big
      mem[0x079F] = 0;
      mem[0x0782] = 0x0B; // Powerup chime
    } else if (powerup === 'star') {
      mem[0x079F] = 0x35; // Invincible Starman countdown timer
      if (mem[0x0756] === 0) {
        mem[0x0756] = 1; // Grow to at least Super so Mario doesn't clip
        mem[0x0754] = 0;
      }
      mem[0x0782] = 0x0B; // Powerup sound
    }

    if (this.isPaused) {
      try {
        this.nes.frame();
        this.renderCanvas();
      } catch {
        // ignore
      }
    }
    return true;
  }

  public getPowerup(): PowerupType {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) return this.currentPowerup || 'small';
    const mem = this.nes.cpu.mem;
    if (mem[0x079F] > 0) return 'star';
    const status = mem[0x0756];
    if (status === 2) return 'fire';
    if (status === 1) return 'super';
    return 'small';
  }

  public applyCheats(): void {
    if (!this.nes) return;
    const mem = this.nes.cpu?.mem;
    if (!mem) return;

    if (this.infiniteHealth) {
      if (this.currentRomId === 'smb1') {
        // Super Mario Bros. (SMB1):
        // Only apply in-game (OperMode === 1) to prevent title screen interference
        if (mem[0x0770] === 1) {
          // 0x075A: Remaining lives counter -> lock at 99 (never game over)
          mem[0x075A] = 99;

          // During active gameplay (OperMode_Task 3 = game engine, PlayerState 8 = normal playing Mario):
          // Maintain post-hit injury invulnerability timer (0x079E) so Mario is completely invincible to enemies
          // Note: We never touch 0x071E (area loading countdown timer) or 0x000E (player state machine),
          // ensuring level loads, pipe transitions, and pit respawns complete 100% cleanly!
          if (mem[0x0772] === 3 && mem[0x000E] === 8) {
            if (mem[0x079E] < 6) {
              mem[0x079E] = 20;
            }
          }

          // If star powerup was selected, keep star invincibility active during gameplay
          if (this.currentPowerup === 'star' && mem[0x0772] === 3) {
            mem[0x079F] = Math.max(mem[0x079F], 0x25);
          }
        }
      } else {
        // Mario Bros. (1983 Arcade Port) & others:
        // 0x0048: Player 1 lives -> lock at 99
        mem[0x0048] = 99;
        // 0x0049: Player 2 lives -> lock at 99
        mem[0x0049] = 99;
      }
    }

    if (this.infiniteJump) {
      // Game Genie code AOAUIG: multi-jump / air-jump condition at $B48D
      if (mem[0xB48D] !== 0x10) {
        mem[0xB48D] = 0x10;
      }
    }
  }

  public saveState(key: string = 'default'): any {
    if (!this.nes || typeof this.nes.toJSON !== 'function') return null;
    const rawState = this.nes.toJSON();
    // Deep clone so running frames NEVER mutate the stored save snapshot
    const cloned =
      typeof structuredClone === 'function'
        ? structuredClone(rawState)
        : JSON.parse(JSON.stringify(rawState));
    this.inMemorySaveStates.set(key, cloned);
    return cloned;
  }

  public loadState(stateData?: any, key: string = 'default'): boolean {
    if (!this.nes || typeof this.nes.fromJSON !== 'function') return false;
    const targetState = stateData || this.inMemorySaveStates.get(key);
    if (!targetState) return false;

    try {
      // Always pass a FRESH deep clone to fromJSON so repeated loads can happen infinitely
      const cloneToApply =
        typeof structuredClone === 'function'
          ? structuredClone(targetState)
          : JSON.parse(JSON.stringify(targetState));

      this.nes.fromJSON(cloneToApply);
      this.audio.clearBuffer();

      if (this.infiniteHealth) {
        this.applyCheats();
      }

      // Instantly render one frame so the canvas displays the restored state immediately
      this.nes.frame();
      this.renderCanvas();
      return true;
    } catch (err) {
      console.error('Failed to load state:', err);
      return false;
    }
  }

  public hasInMemorySave(key: string = 'default'): boolean {
    return this.inMemorySaveStates.has(key);
  }

  public corrupt(power: number = 5): number {
    if (!this.nes) return 0;
    const p = Math.max(1, Math.min(10, power));
    let modifiedBytes = 0;

    // 1. Corrupt PPU VRAM (pattern tables 0x0000-0x1FFF, nametables 0x2000-0x2FFF, palettes 0x3F00-0x3F1F)
    if (this.nes.ppu && this.nes.ppu.vramMem) {
      const vram = this.nes.ppu.vramMem;
      const vramMods = Math.floor(p * 18);
      for (let i = 0; i < vramMods; i++) {
        const addr = Math.floor(Math.random() * 0x3000);
        const choice = Math.random();
        if (choice < 0.35) {
          vram[addr] = (vram[addr] ^ 0xFF) & 0xFF; // Invert bits
        } else if (choice < 0.7) {
          vram[addr] = (vram[addr] + Math.floor(Math.random() * 64) - 32) & 0xFF; // Shift tile
        } else {
          vram[addr] = Math.floor(Math.random() * 256); // Random byte
        }
        modifiedBytes++;
      }
    }

    // 2. Corrupt Sprite OAM (256 bytes)
    if (this.nes.ppu && this.nes.ppu.spriteMem) {
      const oam = this.nes.ppu.spriteMem;
      const oamMods = Math.floor(p * 8);
      for (let i = 0; i < oamMods; i++) {
        const addr = Math.floor(Math.random() * 256);
        oam[addr] = (oam[addr] ^ Math.floor(Math.random() * 256)) & 0xFF;
        modifiedBytes++;
      }
    }

    // 3. Corrupt safe CPU RAM regions (0x0200 to 0x06FF: object coordinates, tile buffers, physics)
    if (this.nes.cpu && this.nes.cpu.mem) {
      const mem = this.nes.cpu.mem;
      const ramMods = Math.floor(p * 6);
      for (let i = 0; i < ramMods; i++) {
        const addr = 0x0200 + Math.floor(Math.random() * 0x0500);
        mem[addr] = (mem[addr] ^ 0xAA) & 0xFF;
        modifiedBytes++;
      }
    }

    // Force frame update to display corruption instantly
    try {
      this.renderCanvas();
    } catch {
      // ignore
    }

    return modifiedBytes;
  }

  public corruptGarbage(powerOrBits: number = 5): number {
    if (!this.nes) return 0;
    let modifiedBits = 0;

    // Intensity 1..10
    const p = Math.max(1, Math.min(10, Math.round(powerOrBits <= 10 ? powerOrBits : powerOrBits / 20)));

    // Scale bit count dynamically with power (Power 1..10 maps to 25..250 bits),
    // or use explicit bit count if > 10 is passed
    const bitCount = powerOrBits > 10 ? Math.round(powerOrBits) : p * 25;

    // 1. Changes random bits across NES memory (PPU VRAM tiles/nametables, Sprite OAM, and safe CPU RAM)
    for (let i = 0; i < bitCount; i++) {
      const region = Math.random();
      const bitPosition = Math.floor(Math.random() * 8); // 0 to 7
      const randomBitValue = Math.random() < 0.5 ? 0 : 1;

      if (region < 0.55 && this.nes.ppu && this.nes.ppu.vramMem) {
        // VRAM (pattern tables 0x0000-0x1FFF and nametables 0x2000-0x2FFF)
        const addr = Math.floor(Math.random() * 0x3000);
        if (randomBitValue === 1) {
          this.nes.ppu.vramMem[addr] |= (1 << bitPosition);
        } else {
          this.nes.ppu.vramMem[addr] &= ~(1 << bitPosition);
        }
        // If modified within pattern tables, sync tile pixel cache if present
        if (addr < 0x2000 && typeof this.nes.ppu.patternWrite === 'function') {
          this.nes.ppu.patternWrite(addr, this.nes.ppu.vramMem[addr]);
        }
        modifiedBits++;
      } else if (region < 0.8 && this.nes.ppu && this.nes.ppu.spriteMem) {
        // Sprite OAM (0..255)
        const addr = Math.floor(Math.random() * 256);
        if (randomBitValue === 1) {
          this.nes.ppu.spriteMem[addr] |= (1 << bitPosition);
        } else {
          this.nes.ppu.spriteMem[addr] &= ~(1 << bitPosition);
        }
        modifiedBits++;
      } else if (this.nes.cpu && this.nes.cpu.mem) {
        // Safe CPU RAM (0x0200 - 0x07FF: game world state, object variables, buffers)
        const addr = 0x0200 + Math.floor(Math.random() * 0x0600);
        if (randomBitValue === 1) {
          this.nes.cpu.mem[addr] |= (1 << bitPosition);
        } else {
          this.nes.cpu.mem[addr] &= ~(1 << bitPosition);
        }
        modifiedBits++;
      }
    }

    // 2. ALSO UNLEASH THE POWER OF THE GLITCH THINGS WITH THE GARBAGE:
    // Scale authentic glitch mutations proportional to the Garbage Power level:
    // A. Sprite OAM Glitch Mutation (Sprites flicker, glitch offsets & attributes)
    if (this.nes.ppu && this.nes.ppu.spriteMem) {
      const oam = this.nes.ppu.spriteMem;
      const oamGlitchCount = Math.floor(p * 3);
      for (let i = 0; i < oamGlitchCount; i++) {
        const spriteIdx = Math.floor(Math.random() * 64) * 4;
        oam[spriteIdx + 1] = (oam[spriteIdx + 1] ^ Math.floor(Math.random() * 256)) & 0xFF;
        oam[spriteIdx + 2] = (oam[spriteIdx + 2] ^ Math.floor(Math.random() * 0xE3)) & 0xFF;
        modifiedBits++;
      }
    }

    // B. Visible Nametable Tile Glitches (Inverts or randomizes blocks on active screen)
    if (this.nes.ppu && this.nes.ppu.vramMem) {
      const vram = this.nes.ppu.vramMem;
      const tileGlitchCount = Math.floor(p * 4);
      for (let i = 0; i < tileGlitchCount; i++) {
        const addr = 0x2000 + Math.floor(Math.random() * 0x0800);
        vram[addr] = Math.random() < 0.5 ? (vram[addr] ^ 0xFF) & 0xFF : Math.floor(Math.random() * 256);
        modifiedBits++;
      }
    }

    // C. If SMB1 & in active gameplay: mutate upcoming stream & enemy glitch
    if (this.currentRomId === 'smb1' && this.nes.cpu && this.nes.cpu.mem) {
      const mem = this.nes.cpu.mem;
      if (mem[0x0770] === 1 && mem[0x0772] === 3) {
        // Scramble upcoming level stream objects with glitch garbage objects
        const areaPtr = (mem[0xE8] << 8) | mem[0xE7];
        if (areaPtr >= 0x8000 && areaPtr < 0xFF00) {
          const streamGlitchCount = Math.min(8, Math.floor(p * 1.5));
          for (let i = 0; i < streamGlitchCount; i += 2) {
            mem[areaPtr + i] = Math.floor(Math.random() * 256);
            mem[areaPtr + i + 1] = Math.floor(Math.random() * 256);
            modifiedBits += 2;
          }
        }
        // Mutate an active enemy into a surprise glitch enemy
        const enemyPool = [0x00, 0x01, 0x02, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0D, 0x0E, 0x10];
        for (let slot = 0; slot < 5; slot++) {
          if (mem[0x000F + slot] !== 0 && Math.random() < 0.5) {
            mem[0x0016 + slot] = enemyPool[Math.floor(Math.random() * enemyPool.length)];
            modifiedBits++;
            break;
          }
        }
      }
    }

    // Force frame update to display garbage immediately
    try {
      this.renderCanvas();
    } catch {
      // ignore
    }

    return modifiedBits;
  }

  public captureScreenshot(): string | null {
    if (!this.canvas) return null;
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Directly replaces the SMB1 level data in memory, ROM pointer tables,
   * zero-page execution registers, and level byte buffers.
   * Instead of resetting the game engine or "putting you in the level" via OperMode switch,
   * this directly substitutes the level data (objects, terrain tokens, enemies, and area style)
   * while preserving Mario's live position, active gameplay, lives, and state!
   */
  public replaceLevelData(worldInput: number, levelInput: number = 1): LevelDataReplaceResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return {
        success: false,
        targetWorld: worldInput,
        targetLevel: levelInput,
        rawWorld: 0,
        rawLevel: 0,
        areaType: 'Unknown',
        areaPtr: '0x0000',
        enemyPtr: '0x0000',
        bytesReplaced: 0,
        message: 'Emulator memory not initialized',
      };
    }

    const mem = this.nes.cpu.mem;

    // Convert requested world into 8-bit NES value (0..255)
    let rawWorld: number;
    if (worldInput === 36) {
      rawWorld = 36;
    } else if (worldInput > 0) {
      rawWorld = (worldInput - 1) & 0xFF;
    } else {
      rawWorld = worldInput & 0xFF;
    }

    // Convert requested level into 8-bit NES value (0..255)
    let rawLevel: number;
    if (levelInput > 0) {
      rawLevel = (levelInput - 1) & 0xFF;
    } else {
      rawLevel = levelInput & 0xFF;
    }

    // 1. Resolve Target Level Data from SMB1 ROM tables:
    // WorldAddrOffsets at 0x9CB4
    // AreaAddrOffsets at 0x9CBC
    const worldOffset = mem[0x9CB4 + (rawWorld & 0xFF)] || 0;
    const targetAreaPointer = mem[0x9CBC + ((worldOffset + (rawLevel & 0xFF)) & 0xFF)] || 0x25;

    const targetAreaType = (targetAreaPointer >> 5) & 0x03; // 0=Water, 1=Overworld, 2=Underground, 3=Castle
    const targetAreaDataOffset = targetAreaPointer & 0x1F;

    const enemyBase = mem[0x9CE0 + targetAreaType] || 0;
    const enemyIndex = (enemyBase + targetAreaDataOffset) & 0xFF;
    const enemyLow = mem[0x9CE4 + enemyIndex];
    const enemyHigh = mem[0x9D06 + enemyIndex];
    const targetEnemyPtr = ((enemyHigh << 8) | enemyLow) & 0xFFFF;

    const areaBase = mem[0x9D28 + targetAreaType] || 0;
    const areaIndex = (areaBase + targetAreaDataOffset) & 0xFF;
    const areaLow = mem[0x9D2C + areaIndex];
    const areaHigh = mem[0x9D4E + areaIndex];
    const targetAreaPtr = ((areaHigh << 8) | areaLow) & 0xFFFF;

    // 2. Identify Current Level's active data and pointers:
    const currentWorld = mem[0x075F] & 0xFF;
    const currentArea = mem[0x0760] & 0xFF;
    const curWorldOffset = mem[0x9CB4 + currentWorld] || 0;
    const curAreaOffsetIdx = 0x9CBC + ((curWorldOffset + currentArea) & 0xFF);

    const curAreaType = mem[0x074E] & 0x03;
    const curAreaDataOffset = mem[0x074F] & 0x1F;
    const curEnemyBase = mem[0x9CE0 + curAreaType] || 0;
    const curEnemyIndex = (curEnemyBase + curAreaDataOffset) & 0xFF;
    const curAreaBase = mem[0x9D28 + curAreaType] || 0;
    const curAreaIndex = (curAreaBase + curAreaDataOffset) & 0xFF;

    const curAreaPtr = ((mem[0x9D4E + curAreaIndex] << 8) | mem[0x9D2C + curAreaIndex]) & 0xFFFF;
    const curEnemyPtr = ((mem[0x9D06 + curEnemyIndex] << 8) | mem[0x9CE4 + curEnemyIndex]) & 0xFFFF;

    // 3. Directly update active Zero-page level parsing registers:
    // $E7/$E8 points to level object data (after 2-byte header)
    mem[0xE7] = (targetAreaPtr + 2) & 0xFF;
    mem[0xE8] = ((targetAreaPtr + 2) >> 8) & 0xFF;
    // $E9/$EA points to enemy data
    mem[0xE9] = targetEnemyPtr & 0xFF;
    mem[0xEA] = (targetEnemyPtr >> 8) & 0xFF;
    mem[0x074E] = targetAreaType;
    mem[0x074F] = targetAreaDataOffset;
    mem[0x0750] = targetAreaPointer;

    // 4. Update the ROM AreaAddrOffsets table for the active slot & 1-1:
    if (curAreaOffsetIdx >= 0x9CBC && curAreaOffsetIdx < 0x9CE4) {
      mem[curAreaOffsetIdx] = targetAreaPointer;
    }
    // If at start/title, ensure 1-1 (index 0 at 0x9CBC) is set to target
    if (currentWorld === 0 && currentArea === 0) {
      mem[0x9CBC] = targetAreaPointer;
    }

    // 5. Update ROM AreaDataAddr & EnemyDataAddr tables:
    mem[0x9D2C + curAreaIndex] = targetAreaPtr & 0xFF;
    mem[0x9D4E + curAreaIndex] = (targetAreaPtr >> 8) & 0xFF;
    mem[0x9CE4 + curEnemyIndex] = targetEnemyPtr & 0xFF;
    mem[0x9D06 + curEnemyIndex] = (targetEnemyPtr >> 8) & 0xFF;

    // 6. Directly copy raw level object data bytes into current area data buffer
    let bytesReplaced = 0;
    if (curAreaPtr >= 0x8000 && targetAreaPtr >= 0x8000 && curAreaPtr !== targetAreaPtr) {
      let k = 0;
      while (k < 256) {
        const b = mem[targetAreaPtr + k];
        mem[curAreaPtr + k] = b;
        bytesReplaced++;
        if (b === 0xFD) break; // Level object terminator in SMB1
        k++;
      }
    }

    // 7. Directly copy raw enemy data bytes into current enemy buffer
    if (curEnemyPtr >= 0x8000 && targetEnemyPtr >= 0x8000 && curEnemyPtr !== targetEnemyPtr) {
      let m = 0;
      while (m < 128) {
        const b = mem[targetEnemyPtr + m];
        mem[curEnemyPtr + m] = b;
        bytesReplaced++;
        if (b === 0xFF) break; // Enemy list terminator in SMB1
        m++;
      }
    }

    const typeNames = ['Water', 'Overworld', 'Underground', 'Castle'];
    const areaTypeName = typeNames[targetAreaType] || 'Custom';

    const info = this.getCurrentWorldAndLevel();
    if (info && this.callbacks.onWorldLevelChange) {
      this.lastReportedWorld = info.rawWorld;
      this.lastReportedLevel = info.rawLevel;
      this.callbacks.onWorldLevelChange(info);
    }

    return {
      success: true,
      targetWorld: worldInput,
      targetLevel: levelInput,
      rawWorld,
      rawLevel,
      areaType: areaTypeName,
      areaPtr: '0x' + targetAreaPtr.toString(16).toUpperCase(),
      enemyPtr: '0x' + targetEnemyPtr.toString(16).toUpperCase(),
      bytesReplaced,
      message: `Replaced level data with World ${worldInput}-${levelInput} (${areaTypeName}) directly!`,
    };
  }

  /**
   * Helper to resolve SMB1 ROM pointers for any given World and Level
   */
  public getLevelPointers(worldInput: number, levelInput: number = 1): {
    rawWorld: number;
    rawLevel: number;
    areaPointer: number;
    areaType: number;
    areaTypeName: string;
    areaDataOffset: number;
    areaPtr: number;
    enemyPtr: number;
  } | null {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) return null;
    const mem = this.nes.cpu.mem;

    let rawWorld: number;
    if (worldInput === 36) rawWorld = 36;
    else if (worldInput > 0) rawWorld = (worldInput - 1) & 0xFF;
    else rawWorld = worldInput & 0xFF;

    let rawLevel: number;
    if (levelInput > 0) rawLevel = (levelInput - 1) & 0xFF;
    else rawLevel = levelInput & 0xFF;

    const worldOffset = mem[0x9CB4 + (rawWorld & 0xFF)] || 0;
    const areaPointer = mem[0x9CBC + ((worldOffset + (rawLevel & 0xFF)) & 0xFF)] || 0x25;
    const areaType = (areaPointer >> 5) & 0x03;
    const areaDataOffset = areaPointer & 0x1F;

    const enemyBase = mem[0x9CE0 + areaType] || 0;
    const enemyIndex = (enemyBase + areaDataOffset) & 0xFF;
    const enemyLow = mem[0x9CE4 + enemyIndex];
    const enemyHigh = mem[0x9D06 + enemyIndex];
    const enemyPtr = ((enemyHigh << 8) | enemyLow) & 0xFFFF;

    const areaBase = mem[0x9D28 + areaType] || 0;
    const areaIndex = (areaBase + areaDataOffset) & 0xFF;
    const areaLow = mem[0x9D2C + areaIndex];
    const areaHigh = mem[0x9D4E + areaIndex];
    const areaPtr = ((areaHigh << 8) | areaLow) & 0xFFFF;

    const typeNames = ['Water', 'Overworld', 'Underground', 'Castle'];
    const areaTypeName = typeNames[areaType] || 'Unknown';

    return {
      rawWorld,
      rawLevel,
      areaPointer,
      areaType,
      areaTypeName,
      areaDataOffset,
      areaPtr,
      enemyPtr,
    };
  }

  private mergeRotationIndex = 0;
  private readonly MERGE_PAIRS = [
    { a: { w: 1, l: 1 }, b: { w: 8, l: 4 }, name: 'Overworld + Bowser Castle' },
    { a: { w: 1, l: 2 }, b: { w: 2, l: 2 }, name: 'Underground + Coral Sea' },
    { a: { w: 4, l: 1 }, b: { w: 8, l: 3 }, name: 'Lakitu Clouds + Hammer Bro Fortress' },
    { a: { w: 3, l: 1 }, b: { w: 7, l: 4 }, name: 'Night Bridges + Castle Maze' },
    { a: { w: 2, l: 1 }, b: { w: 1, l: 4 }, name: 'Desert Pyramids + Fiery Dungeon' },
    { a: { w: 6, l: 3 }, b: { w: 8, l: 2 }, name: 'High Sky Trees + Paratroopa Run' },
    { a: { w: 1, l: 1 }, b: { w: 36, l: 1 }, name: 'Mushroom Kingdom + Minus World Void' },
  ];

  /**
   * Quick-merge method triggered by Keybind [M]:
   * Intelligently selects current level as Level A and a contrasting/exciting level as Level B,
   * then merges both level data streams simultaneously!
   */
  public quickMergeLevel(): LevelMergeResult {
    let curW = 1;
    let curL = 1;
    if (this.currentRomId === 'smb1' && this.nes?.cpu?.mem) {
      const mem = this.nes.cpu.mem;
      const rawW = mem[0x075F];
      const rawL = mem[0x0760];
      if (rawW <= 7) curW = rawW + 1;
      else if (rawW === 36) curW = 36;
      if (rawL <= 7) curL = rawL + 1;
    }

    const pair = this.MERGE_PAIRS[this.mergeRotationIndex % this.MERGE_PAIRS.length];
    this.mergeRotationIndex++;

    let targetB = pair.b;
    if (curW === targetB.w && curL === targetB.l) {
      targetB = pair.a;
    }

    return this.mergeLevelData(curW, curL, targetB.w, targetB.l, 'interleave');
  }

  /**
   * Merges two complete level datas at the same time!
   * Combines object streams, enemy lists, and live collision/Nametable blocks from Level A and Level B
   * into the active stage memory simultaneously while the game is running.
   */
  public mergeLevelData(
    worldInputA: number = 1,
    levelInputA: number = 1,
    worldInputB: number = 8,
    levelInputB: number = 4,
    mode: 'interleave' | 'overlay' | 'chaos' = 'interleave'
  ): LevelMergeResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return {
        success: false,
        levelA: { world: worldInputA, level: levelInputA, name: `World ${worldInputA}-${levelInputA}` },
        levelB: { world: worldInputB, level: levelInputB, name: `World ${worldInputB}-${levelInputB}` },
        objectsMerged: 0,
        enemiesMerged: 0,
        tilesMerged: 0,
        areaTypeA: 'Unknown',
        areaTypeB: 'Unknown',
        message: 'Emulator memory not initialized',
      };
    }

    const mem = this.nes.cpu.mem;

    // Handle generic NES games (non-SMB1)
    if (this.currentRomId !== 'smb1') {
      let tilesMerged = 0;
      const nt0 = this.nes.ppu?.nameTable?.[0];
      const nt1 = this.nes.ppu?.nameTable?.[1];
      if (nt0 && nt1 && nt0.tile && nt1.tile) {
        for (let i = 0; i < 960; i += 2) {
          nt0.tile[i] = nt1.tile[i];
          tilesMerged++;
        }
      }
      try {
        this.renderCanvas();
      } catch {
        // ignore
      }
      return {
        success: true,
        levelA: { world: 1, level: 1, name: 'Nametable 0' },
        levelB: { world: 1, level: 2, name: 'Nametable 1' },
        objectsMerged: 0,
        enemiesMerged: 0,
        tilesMerged,
        areaTypeA: 'Layer A',
        areaTypeB: 'Layer B',
        message: `Merged screen level buffers (${tilesMerged} tiles interlaced)!`,
      };
    }

    // SMB1 Level Data Merging
    const ptrA = this.getLevelPointers(worldInputA, levelInputA);
    const ptrB = this.getLevelPointers(worldInputB, levelInputB);

    if (!ptrA || !ptrB) {
      return {
        success: false,
        levelA: { world: worldInputA, level: levelInputA, name: `World ${worldInputA}-${levelInputA}` },
        levelB: { world: worldInputB, level: levelInputB, name: `World ${worldInputB}-${levelInputB}` },
        objectsMerged: 0,
        enemiesMerged: 0,
        tilesMerged: 0,
        areaTypeA: 'Unknown',
        areaTypeB: 'Unknown',
        message: 'Could not resolve ROM level addresses',
      };
    }

    // 1. Extract raw 2-byte object chunks from Level A
    const objsA: { b0: number; b1: number }[] = [];
    let curA = ptrA.areaPtr + 2;
    while (curA < ptrA.areaPtr + 260 && mem[curA] !== 0xFD && mem[curA] !== 0xFE) {
      objsA.push({ b0: mem[curA], b1: mem[curA + 1] });
      curA += 2;
    }

    // 2. Extract raw 2-byte object chunks from Level B
    const objsB: { b0: number; b1: number }[] = [];
    let curB = ptrB.areaPtr + 2;
    while (curB < ptrB.areaPtr + 260 && mem[curB] !== 0xFD && mem[curB] !== 0xFE) {
      objsB.push({ b0: mem[curB], b1: mem[curB + 1] });
      curB += 2;
    }

    // 3. Extract 2-byte enemy chunks from Level A
    const enemiesA: { b0: number; b1: number }[] = [];
    let eA = ptrA.enemyPtr;
    while (eA < ptrA.enemyPtr + 140 && mem[eA] !== 0xFF) {
      enemiesA.push({ b0: mem[eA], b1: mem[eA + 1] });
      eA += 2;
    }

    // 4. Extract 2-byte enemy chunks from Level B
    const enemiesB: { b0: number; b1: number }[] = [];
    let eB = ptrB.enemyPtr;
    while (eB < ptrB.enemyPtr + 140 && mem[eB] !== 0xFF) {
      enemiesB.push({ b0: mem[eB], b1: mem[eB + 1] });
      eB += 2;
    }

    // 5. Merge Object streams according to selected mode
    const mergedObjs: { b0: number; b1: number }[] = [];
    const maxObj = Math.max(objsA.length, objsB.length);

    for (let k = 0; k < maxObj; k++) {
      if (k < objsA.length) {
        mergedObjs.push({ ...objsA[k] });
      }
      if (k < objsB.length) {
        let b0 = objsB[k].b0;
        let b1 = objsB[k].b1;
        if (mode === 'chaos') {
          // Chaos mode: slightly alter object coordinates for surreal fusion
          b0 = (b0 + ((k % 3) << 4)) & 0xFF;
        }
        mergedObjs.push({ b0, b1 });
      }
      // Keep within safe level buffer bounds (max 80 objects = 160 bytes)
      if (mergedObjs.length >= 75) break;
    }

    // 6. Merge Enemy streams
    const mergedEnemies: { b0: number; b1: number }[] = [];
    const maxE = Math.max(enemiesA.length, enemiesB.length);
    for (let k = 0; k < maxE; k++) {
      if (k < enemiesA.length) mergedEnemies.push({ ...enemiesA[k] });
      if (k < enemiesB.length) mergedEnemies.push({ ...enemiesB[k] });
      if (mergedEnemies.length >= 35) break;
    }

    // 7. Identify active current level memory pointers:
    const currentWorld = mem[0x075F] & 0xFF;
    const currentArea = mem[0x0760] & 0xFF;
    const curAreaType = mem[0x074E] & 0x03;
    const curAreaDataOffset = mem[0x074F] & 0x1F;
    const curEnemyBase = mem[0x9CE0 + curAreaType] || 0;
    const curEnemyIndex = (curEnemyBase + curAreaDataOffset) & 0xFF;
    const curAreaBase = mem[0x9D28 + curAreaType] || 0;
    const curAreaIndex = (curAreaBase + curAreaDataOffset) & 0xFF;

    const curAreaPtr = ((mem[0x9D4E + curAreaIndex] << 8) | mem[0x9D2C + curAreaIndex]) & 0xFFFF;
    const curEnemyPtr = ((mem[0x9D06 + curEnemyIndex] << 8) | mem[0x9CE4 + curEnemyIndex]) & 0xFFFF;

    // Use current area pointer if valid, otherwise fallback to ptrA's buffer
    const targetAreaDest = (curAreaPtr >= 0x8000 && curAreaPtr < 0xFF00) ? curAreaPtr : ptrA.areaPtr;
    const targetEnemyDest = (curEnemyPtr >= 0x8000 && curEnemyPtr < 0xFF00) ? curEnemyPtr : ptrA.enemyPtr;

    // 8. Write merged object data to active buffer:
    let writePos = targetAreaDest + 2;
    for (const obj of mergedObjs) {
      mem[writePos++] = obj.b0;
      mem[writePos++] = obj.b1;
    }
    mem[writePos] = 0xFD; // Safe SMB1 level object stream terminator

    // 9. Write merged enemy data to active buffer:
    let eWritePos = targetEnemyDest;
    for (const enemy of mergedEnemies) {
      mem[eWritePos++] = enemy.b0;
      mem[eWritePos++] = enemy.b1;
    }
    mem[eWritePos] = 0xFF; // Safe SMB1 enemy list terminator

    // 10. Update active zero-page parser registers:
    mem[0xE7] = (targetAreaDest + 2) & 0xFF;
    mem[0xE8] = ((targetAreaDest + 2) >> 8) & 0xFF;
    mem[0xE9] = targetEnemyDest & 0xFF;
    mem[0xEA] = (targetEnemyDest >> 8) & 0xFF;

    // 11. Instant Live Visual Merging on Screen:
    let tilesMerged = 0;
    if (mem[0x0770] === 1 && mem[0x0772] === 3) {
      // Mario is in active gameplay!
      // Stamp characteristic structures of Level B directly ahead on screen
      const stampRes = this.corruptLiveLevel('screen', 4, true);
      tilesMerged = stampRes.tilesModified;

      // Morph active on-screen enemy into Level B's signature enemy
      const signaturePools: Record<number, number[]> = {
        0: [0x07, 0x08, 0x0B], // Water: Blooper, Bullet Bill, Cheep Cheep
        1: [0x00, 0x01, 0x06, 0x03], // Overworld: Koopa, Goomba, Flying Koopa
        2: [0x02, 0x00, 0x06], // Underground: Buzzy Beetle, Koopa, Goomba
        3: [0x0D, 0x05, 0x02], // Castle: Bowser, Hammer Bro, Buzzy Beetle
      };
      const pool = signaturePools[ptrB.areaType] || [0x0D, 0x05, 0x07];
      for (let slot = 0; slot < 5; slot++) {
        if (mem[0x000F + slot] !== 0) {
          mem[0x0016 + slot] = pool[Math.floor(Math.random() * pool.length)];
          break;
        }
      }

      try {
        this.nes.frame();
        this.renderCanvas();
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      levelA: { world: worldInputA, level: levelInputA, name: `World ${worldInputA}-${levelInputA}` },
      levelB: { world: worldInputB, level: levelInputB, name: `World ${worldInputB}-${levelInputB}` },
      objectsMerged: mergedObjs.length,
      enemiesMerged: mergedEnemies.length,
      tilesMerged,
      areaTypeA: ptrA.areaTypeName,
      areaTypeB: ptrB.areaTypeName,
      message: `Merged World ${worldInputA}-${levelInputA} (${ptrA.areaTypeName}) + World ${worldInputB}-${levelInputB} (${ptrB.areaTypeName}): ${mergedObjs.length} objects & ${mergedEnemies.length} enemies fused!`,
    };
  }

  /**
   * Directly stamps a 2x2 NES block (4 8x8 tiles) into PPU NameTable and SMB1 collision RAM
   */
  public stampBlock(
    ntIdx: number,
    bCol: number,
    bRow: number,
    tiles: number[],
    attrib: number = 8,
    metatile: number = 0
  ): void {
    if (!this.nes?.ppu?.nameTable?.[ntIdx]) return;
    const nt = this.nes.ppu.nameTable[ntIdx];
    const vram = this.nes.ppu.vramMem;
    const mem = this.nes?.cpu?.mem;

    const tCol = (bCol * 2) & 0x1F;
    const tRow = (bRow * 2) & 0x1F;

    const idxTL = tRow * 32 + tCol;
    const idxTR = tRow * 32 + tCol + 1;
    const idxBL = (tRow + 1) * 32 + tCol;
    const idxBR = (tRow + 1) * 32 + tCol + 1;

    if (nt.tile) {
      nt.tile[idxTL] = tiles[0];
      nt.tile[idxTR] = tiles[1];
      nt.tile[idxBL] = tiles[2];
      nt.tile[idxBR] = tiles[3];
    }

    if (nt.attrib) {
      nt.attrib[idxTL] = attrib;
      nt.attrib[idxTR] = attrib;
      nt.attrib[idxBL] = attrib;
      nt.attrib[idxBR] = attrib;
    }

    if (typeof this.nes.ppu.nameTableWrite === 'function') {
      this.nes.ppu.nameTableWrite(ntIdx, idxTL, tiles[0]);
      this.nes.ppu.nameTableWrite(ntIdx, idxTR, tiles[1]);
      this.nes.ppu.nameTableWrite(ntIdx, idxBL, tiles[2]);
      this.nes.ppu.nameTableWrite(ntIdx, idxBR, tiles[3]);
    }

    if (vram) {
      const vramBase = ntIdx === 0 ? 0x2000 : 0x2400;
      vram[vramBase + tRow * 32 + tCol] = tiles[0];
      vram[vramBase + tRow * 32 + tCol + 1] = tiles[1];
      vram[vramBase + (tRow + 1) * 32 + tCol] = tiles[2];
      vram[vramBase + (tRow + 1) * 32 + tCol + 1] = tiles[3];
    }

    if (this.currentRomId === 'smb1' && mem) {
      const ramBase = ntIdx === 0 ? 0x0500 : 0x05D0;
      const metaRow = bRow - 2;
      if (metaRow >= 0 && metaRow < 13 && bCol >= 0 && bCol < 16) {
        mem[ramBase + bCol * 13 + metaRow] = metatile;
      }
    }
  }

  /**
   * Spawns an authentic end-of-level Flagpole with flag 5 blocks in front of Mario!
   * Mario can run into it to trigger the flagpole slide and victory sequence!
   */
  public spawnFlagAhead(blocksAhead: number = 5): SpawnAheadResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return { success: false, type: 'flag', col: 0, row: 0, message: 'Game not running' };
    }

    const mem = this.nes.cpu.mem;
    const marioX = mem[0x0086] || 40;
    const marioCol = Math.max(0, Math.min(15, Math.floor(marioX / 16)));
    const activeNt = (mem[0x071A] >> 0) & 1;

    let targetCol = marioCol + blocksAhead;
    let targetNt = activeNt;
    if (targetCol >= 16) {
      targetNt = 1 - activeNt;
      targetCol = targetCol - 16;
    }

    // Flagpole structure from row 2 (top ball) down to row 11 (solid base block):
    // 1. Top Ball at row 2
    this.stampBlock(targetNt, targetCol, 2, [0x24, 0x24, 0x25, 0x26], 8, 0x24);

    // 2. Green/white flag hanging on the left of pole at rows 3 & 4
    if (targetCol > 0) {
      this.stampBlock(targetNt, targetCol - 1, 3, [0x27, 0x28, 0x27, 0x28], 8, 0x00);
      this.stampBlock(targetNt, targetCol - 1, 4, [0x27, 0x28, 0x27, 0x28], 8, 0x00);
    }

    // 3. Flagpole shaft from row 3 down to row 10 (8 blocks tall)
    for (let r = 3; r <= 10; r++) {
      this.stampBlock(targetNt, targetCol, r, [0x25, 0x26, 0x25, 0x26], 8, 0x25);
    }

    // 4. Solid pedestal base at row 11
    this.stampBlock(targetNt, targetCol, 11, [97, 98, 99, 100], 4, 0x60);

    // 5. Update level stream pointer object if in active gameplay
    const areaPtr = (mem[0xE8] << 8) | mem[0xE7];
    if (areaPtr >= 0x8000 && areaPtr < 0xFF00) {
      mem[areaPtr] = (2 << 4) | (targetCol & 0x0F);
      mem[areaPtr + 1] = 0x0B; // SMB1 Flagpole object ID
    }

    try {
      this.renderCanvas();
    } catch {}

    return {
      success: true,
      type: 'flag',
      col: targetCol,
      row: 11,
      message: `Flagpole spawned 5 blocks in front of Mario (Column ${targetCol})! Run into it to finish the level!`,
    };
  }

  /**
   * Spawns a Hammer Bro throwing hammers & a flying Hammer projectile 5 blocks in front of Mario!
   */
  public spawnHammerAhead(blocksAhead: number = 5): SpawnAheadResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return { success: false, type: 'hammer', col: 0, row: 0, message: 'Game not running' };
    }

    const mem = this.nes.cpu.mem;
    const marioX = mem[0x0086] || 40;
    const marioY = mem[0x00CE] || 176;
    const marioPage = mem[0x006D] || 0;
    const marioCol = Math.max(0, Math.min(15, Math.floor(marioX / 16)));
    const activeNt = (mem[0x071A] >> 0) & 1;

    let targetCol = marioCol + blocksAhead;
    let targetNt = activeNt;
    if (targetCol >= 16) {
      targetNt = 1 - activeNt;
      targetCol = targetCol - 16;
    }

    // 1. Calculate world pixel coordinate 5 blocks ahead (80px)
    const targetPixelX = (marioX + blocksAhead * 16) % 256;
    const targetPage = marioPage + Math.floor((marioX + blocksAhead * 16) / 256);
    const targetPixelY = Math.max(80, Math.min(176, marioY - 16));

    // 2. Spawn Hammer Bro in active enemy RAM (Enemy ID 0x05)
    let slot = 0;
    for (let s = 0; s < 5; s++) {
      if (mem[0x000F + s] === 0) {
        slot = s;
        break;
      }
    }

    mem[0x000F + slot] = 1; // Active enemy
    mem[0x0016 + slot] = 0x05; // Hammer Bro
    mem[0x0087 + slot] = targetPixelX; // X pos
    mem[0x006E + slot] = targetPage; // Page
    mem[0x00CF + slot] = targetPixelY; // Y pos
    mem[0x0034 + slot] = 2; // Facing left (towards Mario)
    mem[0x0420 + slot] = 10; // Prime hammer throw timer

    // 3. Stamp an authentic Hammer Bro hammer item / question block in the air ahead of Mario
    const hammerTile = 0x29; // SMB1 hammer sprite tile
    this.stampBlock(targetNt, targetCol, 8, [hammerTile, hammerTile, hammerTile, hammerTile], 8, 0xC1);

    // Also place a breakable brick / powerup block underneath Hammer Bro
    this.stampBlock(targetNt, targetCol, 10, [69, 69, 71, 71], 4, 0x51);

    // 4. Activate hammer projectile in slot $002A
    mem[0x002A] = 1; // Hammer projectile active
    mem[0x002B] = targetPixelX;
    mem[0x002C] = Math.max(40, targetPixelY - 24);

    try {
      this.renderCanvas();
    } catch {}

    return {
      success: true,
      type: 'hammer',
      col: targetCol,
      row: 8,
      message: `Hammer Bro & flying Hammer spawned 5 blocks in front of Mario (Column ${targetCol})!`,
    };
  }

  /**
   * Spawns either a Flagpole or Hammer Bro 5 blocks in front of Mario
   */
  public spawnEntityAhead(type: 'flag' | 'hammer', blocksAhead: number = 5): SpawnAheadResult {
    if (type === 'flag') {
      return this.spawnFlagAhead(blocksAhead);
    } else {
      return this.spawnHammerAhead(blocksAhead);
    }
  }

  /**
   * Official in-game Warp: Transitions cleanly to any World and Level in SMB1.
   * Loads the area tilemaps, music, palettes, and Mario's starting position with lives screen.
   */
  public warpToLevel(worldInput: number, levelInput: number = 1): WarpResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return {
        success: false,
        world: worldInput,
        level: levelInput,
        rawWorld: 0,
        rawLevel: 0,
        message: 'Emulator memory not initialized',
      };
    }

    const mem = this.nes.cpu.mem;

    let rawWorld: number;
    if (worldInput === 36) {
      rawWorld = 36;
    } else if (worldInput > 0) {
      rawWorld = (worldInput - 1) & 0xFF;
    } else {
      rawWorld = worldInput & 0xFF;
    }

    let rawLevel: number;
    if (levelInput > 0) {
      rawLevel = (levelInput - 1) & 0xFF;
    } else {
      rawLevel = levelInput & 0xFF;
    }

    // Set SMB1 world and level registers
    mem[0x075F] = rawWorld; // WorldNumber (0-indexed)
    mem[0x075C] = rawLevel; // LevelNumber (0-indexed)
    mem[0x0760] = rawLevel; // AreaNumber
    mem[0x076A] = rawWorld; // Secondary World Counter
    mem[0x0770] = 1;        // OperMode = Game Mode (1)
    mem[0x0772] = 0;        // OperMode_Task = 0 (Triggers official stage loading & lives screen transition)
    mem[0x0773] = 0;        // Reset screen timer
    mem[0x000E] = 0;        // Reset player state (prevents stuck falling/jumping)

    // Ensure lives counter is healthy so player can play immediately
    if (mem[0x075A] < 3) {
      mem[0x075A] = 3;
    }

    // If paused, unpause/step frame to kick off transition
    if (this.isPaused) {
      try {
        this.nes.frame();
        this.renderCanvas();
      } catch {
        // ignore
      }
    }

    const info = this.getCurrentWorldAndLevel();
    if (info && this.callbacks.onWorldLevelChange) {
      this.lastReportedWorld = info.rawWorld;
      this.lastReportedLevel = info.rawLevel;
      this.callbacks.onWorldLevelChange(info);
    }

    const dispW = worldInput === 36 ? '-1 (Minus World)' : `${worldInput}`;
    return {
      success: true,
      world: worldInput,
      level: levelInput,
      rawWorld,
      rawLevel,
      message: `Warped cleanly to World ${dispW}-${levelInput}! Loading stage...`,
    };
  }

  /**
   * Warps to a random level in SMB1 (Worlds 1-1 to 8-4, plus chance of Minus World & secret levels).
   * Ensures the new target level is different from the current level.
   */
  public warpToRandomLevel(): WarpResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return {
        success: false,
        world: 1,
        level: 1,
        rawWorld: 0,
        rawLevel: 0,
        message: 'Game not running',
      };
    }

    const current = this.getCurrentWorldAndLevel();
    const curW = current ? current.world : 1;
    const curL = current ? current.level : 1;

    // Standard worlds: 1 to 8, levels 1 to 4
    // Glitch/Secret worlds: 36 (Minus World), 9, 10, 0
    const GLITCH_WORLDS = [36, 9, 10, 0, 64];

    let targetW = 1;
    let targetL = 1;
    let attempts = 0;

    do {
      attempts++;
      const isGlitch = Math.random() < 0.12; // 12% chance for secret/glitch world
      if (isGlitch) {
        targetW = GLITCH_WORLDS[Math.floor(Math.random() * GLITCH_WORLDS.length)];
        targetL = 1;
      } else {
        targetW = 1 + Math.floor(Math.random() * 8);
        targetL = 1 + Math.floor(Math.random() * 4);
      }
    } while (attempts < 10 && targetW === curW && targetL === curL);

    return this.warpToLevel(targetW, targetL);
  }

  /**
   * Live Level Corruptor / Randomizer:
   * Dynamically constructs levels out of random objects, metatiles, and enemies mid-game!
   * - 'stream': scrambles upcoming level object data ($E7,$E8) so Mario encounters random mystery structures as he walks
   * - 'screen': scrambles the visible RAM metatiles ($0500) and PPU nametables ($2060) so you see random blocks immediately
   * - 'enemies': scrambles the enemy spawn list ($E9,$EA) to inject surprise Bowser, Hammer Bros, Bloopers, etc.
   * - 'full': combines all three for a complete surreal glitched level mid-game!
   */
  public corruptLiveLevel(
    mode: 'stream' | 'screen' | 'enemies' | 'full' = 'stream',
    intensity: number = 5,
    silent: boolean = false
  ): LiveLevelCorruptResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return {
        success: false,
        mode,
        objectsModified: 0,
        tilesModified: 0,
        enemiesModified: 0,
        message: 'Emulator memory not initialized',
      };
    }

    const mem = this.nes.cpu.mem;
    const vram = this.nes.ppu?.vramMem;

    // Guard: Never corrupt during level loading, title screen, or area transitions in SMB1
    if (this.currentRomId === 'smb1') {
      if (mem[0x0770] !== 1 || mem[0x0772] !== 3) {
        return {
          success: false,
          mode,
          objectsModified: 0,
          tilesModified: 0,
          enemiesModified: 0,
          message: 'Level is currently loading. Wait until gameplay starts.',
        };
      }
    }

    let objectsModified = 0;
    let tilesModified = 0;
    let enemiesModified = 0;

    const p = Math.max(1, Math.min(10, intensity));

    // 1. Corrupt upcoming Level Object Data Stream (pointed to by $E7, $E8)
    if (mode === 'stream' || mode === 'full') {
      const areaPtr = (mem[0xE8] << 8) | mem[0xE7];
      if (areaPtr >= 0x8000 && areaPtr < 0xFF00) {
        const count = Math.min(120, Math.floor(p * 12));
        for (let i = 0; i < count; i += 2) {
          const y = Math.floor(Math.random() * 11);
          const x = Math.floor(Math.random() * 16);
          mem[areaPtr + i] = (y << 4) | x;

          // Length (0..3) << 5 | Object Type (0..23)
          // Includes pipes, staircases, ? blocks, bricks, platforms, castle walls, springs, coral
          const len = Math.floor(Math.random() * 4);
          const objType = Math.floor(Math.random() * 24);
          mem[areaPtr + i + 1] = (len << 5) | objType;
          objectsModified += 2;
        }
        // Safe terminator further along
        mem[areaPtr + count] = 0xFD;
      }
    }

    // 2. Visible Screen & Block Corruptor:
    // Directly stamps recognizable 2x2 NES blocks (bricks, ? blocks, hard stone pyramids,
    // pipes, coins, springboards) into JSNES PPU NameTables (NT0 & NT1) and SMB1 collision RAM ($0500)
    // so you see the new blocks on screen IMMEDIATELY without waiting for screen scroll!
    if (mode === 'screen' || mode === 'full' || mode === 'stream') {
      // Authentic NES SMB1 2x2 block definitions (4 8x8 tiles: TL, TR, BL, BR + NES palette attribute)
      const BLOCK_PALETTE = [
        // 1. Glowing Question Mark Block with Coin ($C0)
        { name: 'QuestionCoin', tiles: [87, 88, 89, 90], attrib: 8, metatile: 0xC0 },
        // 2. Alternate Question Mark Block with Powerup ($C1)
        { name: 'QuestionPowerup', tiles: [83, 84, 85, 86], attrib: 8, metatile: 0xC1 },
        // 3. Classic Breakable Brick Block ($51)
        { name: 'Brick', tiles: [69, 69, 71, 71], attrib: 4, metatile: 0x51 },
        // 4. Solid Hard / Stair Pyramid Stone Block ($60)
        { name: 'HardStone', tiles: [97, 98, 99, 100], attrib: 4, metatile: 0x60 },
        // 5. Castle Dungeon Stone Block ($61)
        { name: 'CastleBrick', tiles: [104, 105, 106, 107], attrib: 12, metatile: 0x61 },
        // 6. Used / Empty Hit Brown Block ($52)
        { name: 'UsedBlock', tiles: [115, 116, 117, 118], attrib: 4, metatile: 0x52 },
        // 7. Ground Grass / Dirt Block ($54)
        { name: 'Ground', tiles: [180, 181, 182, 183], attrib: 4, metatile: 0x54 },
        // 8. Floating Gold Coin ($C2)
        { name: 'Coin', tiles: [36, 114, 36, 115], attrib: 8, metatile: 0xC2 },
        // 9. Springboard Trampoline ($53)
        { name: 'Springboard', tiles: [103, 103, 105, 105], attrib: 8, metatile: 0x53 },
        // 10. Pipe Top ($12)
        { name: 'PipeTop', tiles: [142, 143, 144, 145], attrib: 8, metatile: 0x12 },
        // 11. Pipe Body ($14)
        { name: 'PipeBody', tiles: [146, 147, 148, 149], attrib: 8, metatile: 0x14 },
      ];

      // Identify active NameTable being rendered (curNt: 0 or 1 in horizontal mirroring)
      const activeNt = (this.nes.ppu?.curNt || 0) % 2;
      const targetNametables = [activeNt, (activeNt + 1) % 2];

      // Locate Mario's position on screen (if SMB1)
      let marioCol = 3;
      let marioRow = 10;
      if (this.currentRomId === 'smb1') {
        const mx = mem[0x0086] || 40;
        const my = mem[0x00CE] || 176;
        marioCol = Math.max(0, Math.min(15, Math.floor(mx / 16)));
        marioRow = Math.max(3, Math.min(11, Math.floor(my / 16)));
      }

      // Helper function to stamp a 2x2 block directly into JSNES PPU NameTable and RAM collision
      const stamp2x2Block = (
        ntIdx: number,
        bCol: number,
        bRow: number,
        blockDef: (typeof BLOCK_PALETTE)[0]
      ) => {
        if (bCol < 0 || bCol >= 16 || bRow < 2 || bRow > 12) return;
        const tCol = bCol * 2;
        const tRow = bRow * 2; // Rows 4..25 in 8x8 tiles (protects rows 0..3 HUD!)

        const nt = this.nes.ppu?.nameTable?.[ntIdx];
        if (nt && nt.tile) {
          const idxTL = tRow * 32 + tCol;
          const idxTR = tRow * 32 + tCol + 1;
          const idxBL = (tRow + 1) * 32 + tCol;
          const idxBR = (tRow + 1) * 32 + tCol + 1;

          // Directly modify JSNES active render buffer
          nt.tile[idxTL] = blockDef.tiles[0];
          nt.tile[idxTR] = blockDef.tiles[1];
          nt.tile[idxBL] = blockDef.tiles[2];
          nt.tile[idxBR] = blockDef.tiles[3];

          // Apply authentic NES palette colors
          if (nt.attrib) {
            nt.attrib[idxTL] = blockDef.attrib;
            nt.attrib[idxTR] = blockDef.attrib;
            nt.attrib[idxBL] = blockDef.attrib;
            nt.attrib[idxBR] = blockDef.attrib;
          }

          // Trigger PPU internal write callback if present
          if (typeof this.nes.ppu.nameTableWrite === 'function') {
            this.nes.ppu.nameTableWrite(ntIdx, idxTL, blockDef.tiles[0]);
            this.nes.ppu.nameTableWrite(ntIdx, idxTR, blockDef.tiles[1]);
            this.nes.ppu.nameTableWrite(ntIdx, idxBL, blockDef.tiles[2]);
            this.nes.ppu.nameTableWrite(ntIdx, idxBR, blockDef.tiles[3]);
          }

          tilesModified += 4;
        }

        // Sync VRAM memory as well
        if (vram) {
          const vramBase = ntIdx === 0 ? 0x2000 : 0x2400;
          vram[vramBase + tRow * 32 + tCol] = blockDef.tiles[0];
          vram[vramBase + tRow * 32 + tCol + 1] = blockDef.tiles[1];
          vram[vramBase + (tRow + 1) * 32 + tCol] = blockDef.tiles[2];
          vram[vramBase + (tRow + 1) * 32 + tCol + 1] = blockDef.tiles[3];
        }

        // Update SMB1 physical collision & metatile RAM ($0500..$069F)
        if (this.currentRomId === 'smb1') {
          const ramBase = ntIdx === 0 ? 0x0500 : 0x05D0;
          const metaRow = bRow - 2; // Maps blockRow 2..12 to 0..10
          if (metaRow >= 0 && metaRow < 13) {
            mem[ramBase + bCol * 13 + metaRow] = blockDef.metatile;
          }
        }
      };

      // 2A. Spawn structures directly in front of and above Mario so they are guaranteed visible:
      // A mystery cluster of ? blocks, breakable bricks and floating coins
      const leadCol = Math.min(12, marioCol + 2);
      const bridgeLen = Math.min(6, 2 + Math.floor(p / 2));
      const bridgeRow = Math.max(3, marioRow - 3);

      for (let i = 0; i < bridgeLen; i++) {
        const blk = BLOCK_PALETTE[(i + Math.floor(Math.random() * 3)) % BLOCK_PALETTE.length];
        stamp2x2Block(activeNt, leadCol + i, bridgeRow, blk);
      }

      // 2B. Spawn a mini-staircase or pyramid right ahead
      if (p >= 3) {
        const stairCol = Math.min(13, leadCol + bridgeLen + 1);
        const stairHeight = Math.min(4, Math.floor(p / 2.5));
        for (let step = 0; step < stairHeight; step++) {
          const stoneBlock = BLOCK_PALETTE[3]; // HardStone
          for (let h = 0; h <= step; h++) {
            stamp2x2Block(activeNt, stairCol + step, 11 - h, stoneBlock);
          }
        }
      }

      // 2C. Scatter random visible blocks across the screen based on intensity
      const totalScatter = mode === 'stream' ? Math.floor(p * 2) : Math.floor(p * 5) + 6;
      for (let s = 0; s < totalScatter; s++) {
        const targetNt = targetNametables[Math.floor(Math.random() * targetNametables.length)];
        const randCol = Math.floor(Math.random() * 16);
        const randRow = 3 + Math.floor(Math.random() * 9); // blockRows 3..11 (above ground, below HUD)

        // Don't spawn directly on Mario's exact coordinates to avoid trapping him inside solid blocks
        if (targetNt === activeNt && Math.abs(randCol - marioCol) <= 1 && Math.abs(randRow - marioRow) <= 1) {
          continue;
        }

        const randBlock = BLOCK_PALETTE[Math.floor(Math.random() * BLOCK_PALETTE.length)];
        stamp2x2Block(targetNt, randCol, randRow, randBlock);
      }

      // 2D. Also support generic NES games (Fami Dash, etc.) by corrupting visible tiles
      if (this.currentRomId !== 'smb1') {
        const genMods = Math.floor(p * 15);
        for (let g = 0; g < genMods; g++) {
          const ntIdx = targetNametables[g % targetNametables.length];
          const nt = this.nes.ppu?.nameTable?.[ntIdx];
          if (nt && nt.tile) {
            const tAddr = 32 * 4 + Math.floor(Math.random() * (1024 - 32 * 6));
            nt.tile[tAddr] = Math.floor(Math.random() * 256);
            tilesModified++;
          }
        }
      }
    }

    // 3. Corrupt Enemy Stream ($E9, $EA) & Live Enemies:
    if (mode === 'enemies' || mode === 'full') {
      const enemyPtr = (mem[0xEA] << 8) | mem[0xE9];
      if (enemyPtr >= 0x8000 && enemyPtr < 0xFF00) {
        const enemyCount = Math.min(40, Math.floor(p * 4));
        for (let i = 0; i < enemyCount; i += 2) {
          // If we reach the natural level enemy terminator ($FF), do not overwrite it or advance past it!
          if (mem[enemyPtr + i] === 0xFF) break;
          // Enemy IDs: Koopa, Buzzy, Goomba, Bowser, Lakitu, Hammer Bro, Blooper, Cheep Cheep
          const enemyPool = [0x00, 0x01, 0x02, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0D, 0x0E, 0x10];
          const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
          // Only replace enemy ID (lower 4 bits of 2nd byte) to preserve coordinate boundaries
          mem[enemyPtr + i + 1] = (mem[enemyPtr + i + 1] & 0xF0) | (enemyId & 0x0F);
          enemiesModified += 2;
        }
      }

      // Also mutate any currently active enemies on screen so they morph immediately
      if (this.currentRomId === 'smb1') {
        const enemyPool = [0x00, 0x01, 0x02, 0x03, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0D, 0x0E, 0x10];
        let morphedAny = false;
        for (let slot = 0; slot < 5; slot++) {
          if (mem[0x000F + slot] !== 0 && mem[0x001E + slot] === 0) {
            mem[0x0016 + slot] = enemyPool[Math.floor(Math.random() * enemyPool.length)];
            enemiesModified++;
            morphedAny = true;
          }
        }

        // If no active enemies are alive on screen and game is running, spawn a surprise enemy ahead of Mario
        if (!morphedAny && mem[0x0770] === 1 && mem[0x0772] === 3) {
          const mx = mem[0x0086] || 40;
          const my = mem[0x00CE] || 176;
          const chosenEnemy = enemyPool[Math.floor(Math.random() * enemyPool.length)];
          mem[0x000F] = 1; // active flag
          mem[0x0016] = chosenEnemy; // Enemy ID
          mem[0x001E] = 0; // alive state
          mem[0x0087] = (mx + 80 + Math.floor(Math.random() * 60)) % 256;
          mem[0x00CF] = Math.min(192, Math.max(96, my));
          enemiesModified++;
        }
      }
    }

    // Safety checks: ensure at least 3 lives
    if (mem[0x075A] < 3 && mem[0x0770] === 1) mem[0x075A] = 3;

    // Force frame update and render canvas immediately so new blocks are visible with zero delay (when manual)
    if (!silent) {
      try {
        this.nes.frame();
        this.renderCanvas();
      } catch {
        // ignore
      }
    }

    const modeLabels: Record<string, string> = {
      stream: 'Upcoming Stream Randomizer',
      screen: 'Current Screen Scramble',
      enemies: 'Enemy Spawner Scramble',
      full: 'Full Chaos Metamorphosis',
    };

    return {
      success: true,
      mode,
      objectsModified,
      tilesModified,
      enemiesModified,
      message: `${modeLabels[mode] || 'Live Level Corrupted'}: ${objectsModified} objects, ${tilesModified} tiles, ${enemiesModified} enemies randomized!`,
    };
  }

  /**
   * Compatibility alias for warpToLevel
   */
  public changeWorldAndLevel(worldInput: number, levelInput: number = 1): {
    success: boolean;
    world: number;
    level: number;
    rawWorld: number;
    rawLevel: number;
  } {
    const res = this.warpToLevel(worldInput, levelInput);
    return {
      success: res.success,
      world: res.world,
      level: res.level,
      rawWorld: res.rawWorld,
      rawLevel: res.rawLevel,
    };
  }

  public getCurrentWorldAndLevel(): WorldLevelInfo | null {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) return null;
    // World and level registers at 0x075F and 0x0760 are specific to Super Mario Bros.
    if (this.currentRomId !== 'smb1') return null;
    const mem = this.nes.cpu.mem;
    const rawWorld = mem[0x075F];
    const rawLevel = mem[0x0760];

    // Calculate human-friendly display
    let displayWorld: string;
    let worldNum: number;
    if (rawWorld === 36) {
      displayWorld = '-1 (Minus World)';
      worldNum = -1;
    } else if (rawWorld <= 7) {
      worldNum = rawWorld + 1;
      displayWorld = `${worldNum}`;
    } else if (rawWorld > 127) {
      // Negative signed representation (e.g. 255 -> -1, 254 -> -2)
      worldNum = rawWorld - 256;
      displayWorld = `${worldNum}`;
    } else {
      worldNum = rawWorld + 1;
      displayWorld = `${worldNum} (Glitch)`;
    }

    let displayLevel: string;
    let levelNum: number;
    if (rawLevel <= 7) {
      levelNum = rawLevel + 1;
      displayLevel = `${levelNum}`;
    } else if (rawLevel > 127) {
      levelNum = rawLevel - 256;
      displayLevel = `${levelNum}`;
    } else {
      levelNum = rawLevel + 1;
      displayLevel = `${levelNum}`;
    }

    const areaTypeVal = mem[0x074E] & 0x03;
    const typeNames = ['Water', 'Overworld', 'Underground', 'Castle'];
    const areaType = typeNames[areaTypeVal] || 'Overworld';
    const areaPtrVal = ((mem[0xE8] << 8) | mem[0xE7]) & 0xFFFF;
    const enemyPtrVal = ((mem[0xEA] << 8) | mem[0xE9]) & 0xFFFF;
    const areaPointerHex = '0x' + (mem[0x0750] || 0).toString(16).padStart(2, '0').toUpperCase();

    return {
      world: worldNum,
      level: levelNum,
      rawWorld,
      rawLevel,
      displayWorld,
      displayLevel,
      areaType,
      areaPtr: '0x' + areaPtrVal.toString(16).toUpperCase(),
      enemyPtr: '0x' + enemyPtrVal.toString(16).toUpperCase(),
      areaPointerHex,
    };
  }

  /**
   * Dedicated non-destructive auto enemy scramble runner:
   * Only mutates active enemies on-screen in RAM without touching PRG-ROM or level loaders.
   * Completely safe against level loading hangs or area transition glitches.
   */
  public runAutoEnemyScrambleTick(): LiveLevelCorruptResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return {
        success: false,
        mode: 'enemies',
        objectsModified: 0,
        tilesModified: 0,
        enemiesModified: 0,
        message: 'Emulator memory not initialized',
      };
    }

    const mem = this.nes.cpu.mem;

    // Safety Gate: ONLY run during active gameplay!
    // In SMB1:
    // mem[0x0770] === 1: Game Mode (not title screen 0 or ending 2)
    // mem[0x0772] === 3: Active Gameplay (not loading screen 0/1/2)
    // mem[0x000E] === 8: Normal Mario playing (not dead 6/11 or pipe transit)
    if (this.currentRomId === 'smb1') {
      if (mem[0x0770] !== 1 || mem[0x0772] !== 3 || mem[0x000E] !== 8) {
        return {
          success: false,
          mode: 'enemies',
          objectsModified: 0,
          tilesModified: 0,
          enemiesModified: 0,
          message: 'Game is loading or transitioning - safely waiting for active gameplay',
        };
      }
    }

    let enemiesModified = 0;
    const enemyPool = [
      0x00, // Green Koopa
      0x01, // Red Koopa (patrols)
      0x02, // Buzzy Beetle (fire-proof)
      0x03, // Red Flying Koopa
      0x04, // Green Jumping Koopa
      0x05, // Hammer Bro (throws hammers)
      0x06, // Goomba
      0x07, // Blooper (flying squid)
      0x08, // Bullet Bill
      0x09, // Green Flying Koopa
      0x0D, // Bowser
      0x0E, // Lakitu
      0x10, // Spiny
    ];

    if (this.currentRomId === 'smb1') {
      // 1. Morph currently active live enemies on screen in RAM slots
      let activeCount = 0;
      for (let slot = 0; slot < 5; slot++) {
        if (mem[0x000F + slot] !== 0 && mem[0x001E + slot] === 0) {
          mem[0x0016 + slot] = enemyPool[Math.floor(Math.random() * enemyPool.length)];
          enemiesModified++;
          activeCount++;
        }
      }

      // 2. If fewer than 2 active enemies on screen, safely spawn a surprise enemy in an empty RAM slot ahead of Mario
      if (activeCount < 2) {
        for (let slot = 0; slot < 5; slot++) {
          if (mem[0x000F + slot] === 0) {
            const mx = mem[0x0086] || 40;
            const my = mem[0x00CE] || 176;
            const chosenEnemy = enemyPool[Math.floor(Math.random() * enemyPool.length)];
            mem[0x000F + slot] = 1; // active flag
            mem[0x0016 + slot] = chosenEnemy; // Enemy ID
            mem[0x001E + slot] = 0; // alive state
            mem[0x0087 + slot] = (mx + 80 + Math.floor(Math.random() * 50)) % 256;
            mem[0x00CF + slot] = Math.min(192, Math.max(96, my));
            enemiesModified++;
            break;
          }
        }
      }
    }

    return {
      success: enemiesModified > 0,
      mode: 'enemies',
      objectsModified: 0,
      tilesModified: 0,
      enemiesModified,
      message: `Scrambled ${enemiesModified} live enemies!`,
    };
  }

  /**
   * Dedicated safe auto level stream randomizer runner:
   * Randomizes upcoming terrain stream ($E7,$E8) and upcoming path blocks
   * only during active gameplay without causing hangs or resets.
   */
  public runAutoStreamRandomizeTick(): LiveLevelCorruptResult {
    if (!this.nes || !this.nes.cpu || !this.nes.cpu.mem) {
      return {
        success: false,
        mode: 'stream',
        objectsModified: 0,
        tilesModified: 0,
        enemiesModified: 0,
        message: 'Emulator memory not initialized',
      };
    }

    const mem = this.nes.cpu.mem;
    if (this.currentRomId === 'smb1') {
      if (mem[0x0770] !== 1 || mem[0x0772] !== 3 || mem[0x000E] !== 8) {
        return {
          success: false,
          mode: 'stream',
          objectsModified: 0,
          tilesModified: 0,
          enemiesModified: 0,
          message: 'Game is loading or transitioning - safely waiting for active gameplay',
        };
      }
    }

    return this.corruptLiveLevel('stream', this.autoStreamRandomizeIntensity, true);
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning || this.isPaused) return;

    // Check gamepads
    this.pollGamepads();

    // Delta-time based frame accumulation for silky smooth arbitrary emulation speed (Speedhack)
    const delta = this.lastLoopTime > 0
      ? Math.min(100, Math.max(0, currentTime - this.lastLoopTime))
      : (1000 / 60);
    this.lastLoopTime = currentTime;

    // Target frames based on delta and emulation speed
    this.frameAccumulator += (delta / (1000 / 60)) * this.emulationSpeed;
    if (this.frameAccumulator > 10) {
      this.frameAccumulator = 10;
    }

    const framesToRun = Math.floor(this.frameAccumulator);
    this.frameAccumulator -= framesToRun;

    // Run emulator frame(s)
    try {
      for (let f = 0; f < framesToRun; f++) {
        if (this.infiniteHealth || this.infiniteJump) {
          this.applyCheats();
        }

        this.nes.frame();

        if (this.infiniteHealth || this.infiniteJump) {
          this.applyCheats();
        }

        this.frameCount++;

        // Auto Enemy Scramble check
        if (this.autoEnemyScramble) {
          this.autoEnemyScrambleFrameCounter++;
          const targetFrames = Math.max(1, Math.round(this.autoEnemyScrambleSpeed * 60));
          if (this.autoEnemyScrambleFrameCounter >= targetFrames) {
            this.autoEnemyScrambleFrameCounter = 0;
            try {
              const res = this.runAutoEnemyScrambleTick();
              if (res && res.enemiesModified > 0) {
                this.callbacks.onAutoEnemyScrambleTick?.(res);
              }
            } catch (e) {
              console.error('Auto enemy scramble tick error:', e);
            }
          }
        }

        // Auto Level Stream Randomize check
        if (this.autoStreamRandomize) {
          this.autoStreamRandomizeFrameCounter++;
          const targetFrames = Math.max(1, Math.round(this.autoStreamRandomizeSpeed * 60));
          if (this.autoStreamRandomizeFrameCounter >= targetFrames) {
            this.autoStreamRandomizeFrameCounter = 0;
            try {
              const res = this.runAutoStreamRandomizeTick();
              if (res && res.success && (res.objectsModified > 0 || res.tilesModified > 0)) {
                this.callbacks.onAutoStreamRandomizeTick?.(res);
              }
            } catch (e) {
              console.error('Auto stream randomize tick error:', e);
            }
          }
        }

        // Check for live world/level changes every 30 frames (twice a second)
        if (this.frameCount % 30 === 0 && this.callbacks.onWorldLevelChange) {
          const info = this.getCurrentWorldAndLevel();
          if (
            info &&
            (info.rawWorld !== this.lastReportedWorld || info.rawLevel !== this.lastReportedLevel)
          ) {
            this.lastReportedWorld = info.rawWorld;
            this.lastReportedLevel = info.rawLevel;
            this.callbacks.onWorldLevelChange(info);
          }
        }
      }

      if (framesToRun > 0) {
        this.renderCanvas();
      }

      const now = performance.now();
      if (now - this.fpsTimer >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
        this.frameCount = 0;
        this.fpsTimer = now;
        this.callbacks.onFpsUpdate?.(this.currentFps);
      }
    } catch (err) {
      console.error('Emulator crash during frame execution:', err);
      this.pause();
      this.callbacks.onError?.(err as Error);
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private renderCanvas(): void {
    if (!this.ctx || !this.imageData || !this.buf32) return;
    const data = this.imageData.data;
    const buf8 = new Uint8ClampedArray(this.buf32.buffer);
    data.set(buf8);
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  private pollGamepads(): void {
    if (typeof navigator.getGamepads !== 'function') return;
    const gamepads = navigator.getGamepads();
    const pad = gamepads[0];
    if (!pad) return;

    const checkButton = (index: number, nesBtn: number) => {
      const pressed = pad.buttons[index]?.pressed || false;
      const key = nesBtn;
      if (pressed !== this.prevGamepadButtons[key]) {
        if (pressed) {
          this.buttonDown(1, nesBtn);
        } else {
          this.buttonUp(1, nesBtn);
        }
        this.prevGamepadButtons[key] = pressed;
      }
    };

    // Standard Gamepad mapping:
    // 0: A -> NES A
    // 1: B -> NES B (or 2: X -> NES B)
    // 8: Back/Select -> NES Select
    // 9: Start -> NES Start
    // 12: D-Up, 13: D-Down, 14: D-Left, 15: D-Right
    checkButton(0, 0); // A
    checkButton(1, 1); // B
    checkButton(2, 1); // X (alternative B)
    checkButton(8, 2); // Select
    checkButton(9, 3); // Start
    checkButton(12, 4); // Up
    checkButton(13, 5); // Down
    checkButton(14, 6); // Left
    checkButton(15, 7); // Right

    // Also support Left Analog Stick
    if (pad.axes.length >= 2) {
      const axisX = pad.axes[0];
      const axisY = pad.axes[1];
      const leftPressed = axisX < -0.4;
      const rightPressed = axisX > 0.4;
      const upPressed = axisY < -0.4;
      const downPressed = axisY > 0.4;

      if (leftPressed !== this.prevGamepadButtons[106]) {
        if (leftPressed) this.buttonDown(1, 6);
        else this.buttonUp(1, 6);
        this.prevGamepadButtons[106] = leftPressed;
      }
      if (rightPressed !== this.prevGamepadButtons[107]) {
        if (rightPressed) this.buttonDown(1, 7);
        else this.buttonUp(1, 7);
        this.prevGamepadButtons[107] = rightPressed;
      }
      if (upPressed !== this.prevGamepadButtons[104]) {
        if (upPressed) this.buttonDown(1, 4);
        else this.buttonUp(1, 4);
        this.prevGamepadButtons[104] = upPressed;
      }
      if (downPressed !== this.prevGamepadButtons[105]) {
        if (downPressed) this.buttonDown(1, 5);
        else this.buttonUp(1, 5);
        this.prevGamepadButtons[105] = downPressed;
      }
    }
  }

  private resolveKeyMapping(e: KeyboardEvent): { player: number; button: number } | null {
    // Exact code mapping from DEFAULT_KEY_MAP
    if (DEFAULT_KEY_MAP[e.code]) {
      return DEFAULT_KEY_MAP[e.code];
    }

    // Direct key fallback for robust cross-browser / cross-layout support:
    // Jump: ; (Semicolon)
    if (e.key === ';' || e.key === ':') {
      return { player: 1, button: 0 }; // NES A (Jump)
    }
    // Run: l / L
    if (e.key === 'l' || e.key === 'L') {
      return { player: 1, button: 1 }; // NES B (Run)
    }

    return null;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Avoid capturing inputs if user is typing in an input, textarea, or select
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
      return;
    }

    // Hotkey: Quick Save (F5 or [)
    if (e.code === 'F5' || e.code === 'BracketLeft' || e.key === '[') {
      e.preventDefault();
      this.callbacks.onQuickSave?.();
      return;
    }

    // Hotkey: Quick Load (F8 or ])
    if (e.code === 'F8' || e.code === 'BracketRight' || e.key === ']') {
      e.preventDefault();
      this.callbacks.onQuickLoad?.();
      return;
    }

    // Hotkey: Corrupt once (KeyG, F7, or Backquote `)
    if (e.code === 'KeyG' || e.code === 'F7' || e.code === 'Backquote' || e.key === '`') {
      e.preventDefault();
      this.callbacks.onQuickCorrupt?.();
      return;
    }

    // Hotkey: Garbage Corruption (KeyH or h/H) - changes bits and glitches things based on Power
    if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      this.callbacks.onQuickGarbageCorrupt?.();
      return;
    }

    // Hotkey: Quick Reset / Reload Game (KeyJ, j/J)
    if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      this.callbacks.onQuickReset?.();
      return;
    }

    // Hotkey: Infinite Jump (KeyK or k/K) - triggers upward mid-air jump boost
    if (e.code === 'KeyK' || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      this.triggerInfiniteJump();
      this.callbacks.onQuickInfJump?.();
      return;
    }

    // Hotkey: Level Data Merger (KeyM or m/M) - merges two level datas at the same time!
    if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      this.callbacks.onQuickMergeLevelData?.();
      return;
    }

    // Hotkey: Add Flag 5 blocks ahead (KeyF or f/F)
    if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      this.callbacks.onQuickSpawnFlag?.();
      return;
    }

    // Hotkey: Warp to a Random Level (KeyT, t/T)
    if (e.code === 'KeyT' || e.key === 't' || e.key === 'T') {
      e.preventDefault();
      this.callbacks.onQuickRandomWarp?.();
      return;
    }

    // Hotkey: Add Hammer 5 blocks ahead (KeyU or u/U)
    if (e.code === 'KeyU' || e.key === 'u' || e.key === 'U') {
      e.preventDefault();
      this.callbacks.onQuickSpawnHammer?.();
      return;
    }

    // Hotkey: Speedhack Faster (+, =, or NumpadAdd)
    if (e.key === '+' || e.key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      const current = this.emulationSpeed;
      const step = current >= 2.0 ? 0.5 : 0.25;
      const next = Math.min(5.0, Math.round((current + step) * 100) / 100);
      this.setSpeed(next);
      return;
    }

    // Hotkey: Speedhack Slower (-, _, or NumpadSubtract)
    if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      const current = this.emulationSpeed;
      const step = current > 2.0 ? 0.5 : 0.25;
      const next = Math.max(0.25, Math.round((current - step) * 100) / 100);
      this.setSpeed(next);
      return;
    }

    // Hotkey: Speedhack Reset to 1.0x Normal (\ or 0 or Numpad0)
    if (e.key === '\\' || e.code === 'Backslash' || e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
      e.preventDefault();
      this.setSpeed(1.0);
      return;
    }

    const mapping = this.resolveKeyMapping(e);
    if (mapping) {
      e.preventDefault();
      const trackingKey = e.code || e.key;
      if (!this.activeKeys.has(trackingKey)) {
        this.activeKeys.add(trackingKey);
        this.buttonDown(mapping.player, mapping.button);
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const trackingKey = e.code || e.key;
    const mapping = this.resolveKeyMapping(e);
    if (mapping) {
      e.preventDefault();
      this.activeKeys.delete(trackingKey);
      this.buttonUp(mapping.player, mapping.button);
    }
  };

  private bindEvents(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
    }
  }

  private unbindEvents(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    }
    this.activeKeys.clear();
  }

  public destroy(): void {
    this.stop();
    this.audio.destroy();
    this.nes = null;
    this.canvas = null;
    this.ctx = null;
  }

}
