import { NES } from 'jsnes';
import { AudioPlayer } from './audioPlayer';
import { NES_WIDTH, NES_HEIGHT, DEFAULT_KEY_MAP } from './constants';
import {
  WorldLevelInfo,
  LevelDataReplaceResult,
  PowerupType,
  WarpResult,
  LiveLevelCorruptResult,
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
  onWorldLevelChange?: (info: WorldLevelInfo) => void;
  onAutoEnemyScrambleTick?: (result: LiveLevelCorruptResult) => void;
}

export class NesEngine {
  private nes: any = null;
  private audio: AudioPlayer;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private buf32: Uint32Array | null = null;
  private romBuffer: Uint8Array | null = null;

  private isRunning = false;
  private isPaused = false;
  private animationFrameId: number | null = null;

  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;

  private infiniteHealth = false;
  private infiniteJump = false;
  private autoEnemyScramble = false;
  private autoEnemyScrambleSpeed = 2.0; // Interval in seconds (e.g. 0.5s to 5.0s)
  private autoEnemyScrambleIntensity = 5;
  private autoEnemyScrambleFrameCounter = 0;
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
    if (!this.nes) return;
    this.nes.reset();
    this.audio.clearBuffer();
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

  public corruptGarbage(bitCount: number = 80): number {
    if (!this.nes) return 0;
    let modifiedBits = 0;

    // Changes 80 random bits across NES memory (PPU VRAM tiles/nametables, Sprite OAM, and safe CPU RAM)
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

  private loop = (currentTime: number): void => {
    if (!this.isRunning || this.isPaused) return;

    // Check gamepads
    this.pollGamepads();

    // Run emulator frame
    try {
      if (this.infiniteHealth || this.infiniteJump) {
        this.applyCheats();
      }

      this.nes.frame();

      if (this.infiniteHealth || this.infiniteJump) {
        this.applyCheats();
      }

      this.renderCanvas();

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
    // Jump: ' (Quote)
    if (e.key === "'" || e.key === '"') {
      return { player: 1, button: 0 }; // NES A
    }
    // Run: ; (Semicolon)
    if (e.key === ';' || e.key === ':') {
      return { player: 1, button: 1 }; // NES B
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

    // Hotkey: Garbage Corruption (KeyH or h/H) - changes 30 bits into random things
    if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      this.callbacks.onQuickGarbageCorrupt?.();
      return;
    }

    // Hotkey: Infinite Jump (KeyJ or j/J) - triggers upward mid-air jump boost
    if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      this.triggerInfiniteJump();
      this.callbacks.onQuickInfJump?.();
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
