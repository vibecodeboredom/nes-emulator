import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NesEngine } from './emulator/nesEngine';
import { RomInfo, EmulatorStatus, SaveStateData, WorldLevelInfo, PowerupType } from './types';
import {
  SUPER_MARIO_BROS_BASE64,
  MARIO_BROS_CLASSIC_BASE64,
  base64ToUint8Array,
} from './emulator/defaultRoms';
import { ScreenDisplay } from './components/ScreenDisplay';
import { ControlsBar } from './components/ControlsBar';
import { GameSelector } from './components/GameSelector';
import { VirtualGamepad } from './components/VirtualGamepad';
import { KeybindingsModal } from './components/KeybindingsModal';
import { LiveWorldChanger } from './components/LiveWorldChanger';
import { Disc, Info, CheckCircle2 } from 'lucide-react';

const PRELOADED_ROMS: RomInfo[] = [
  {
    id: 'smb1',
    title: 'Super Mario Bros.',
    subtitle: 'World 1-1 to 8-4',
    releaseYear: 1985,
    url: '/roms/super-mario-bros.nes',
  },
  {
    id: 'mb1',
    title: 'Mario Bros.',
    subtitle: 'Classic Arcade Port',
    releaseYear: 1983,
    url: '/roms/mario-bros.nes',
  },
  {
    id: 'famidash',
    title: 'Fami Dash',
    subtitle: 'Geometry Dash NES',
    releaseYear: 2024,
    url: '/roms/famidash.nes',
  },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<NesEngine | null>(null);

  const [currentRom, setCurrentRom] = useState<RomInfo>(PRELOADED_ROMS[0]);
  const [status, setStatus] = useState<EmulatorStatus>('loading');
  const [fps, setFps] = useState(60);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVirtualGamepad, setShowVirtualGamepad] = useState(true);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasSaveState, setHasSaveState] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [infiniteHealth, setInfiniteHealth] = useState(false);
  const [infiniteJump, setInfiniteJump] = useState(false);
  const [autoEnemyScramble, setAutoEnemyScramble] = useState(false);
  const [autoEnemyScrambleSpeed, setAutoEnemyScrambleSpeed] = useState(2.0);
  const [currentPowerup, setCurrentPowerup] = useState<PowerupType>('small');
  const [corruptionPower, setCorruptionPower] = useState(5);
  const [worldLevelInfo, setWorldLevelInfo] = useState<WorldLevelInfo | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // Check saved state for current ROM in engine memory and localStorage
  const refreshSaveStateInfo = useCallback((romId: string) => {
    if (engineRef.current?.hasInMemorySave(romId)) {
      setHasSaveState(true);
      return;
    }
    try {
      const stored = localStorage.getItem(`nes_save_${romId}`);
      if (stored) {
        const parsed: SaveStateData = JSON.parse(stored);
        setHasSaveState(true);
        setLastSavedTime(new Date(parsed.timestamp).toLocaleTimeString());
      } else {
        setHasSaveState(false);
        setLastSavedTime(null);
      }
    } catch {
      setHasSaveState(false);
      setLastSavedTime(null);
    }
  }, []);

  // Handlers ref to keep callbacks always updated for hotkeys
  const handlersRef = useRef<{
    save: () => void;
    load: () => void;
    corrupt: () => void;
    garbageCorrupt: () => void;
    infJump: () => void;
  }>({
    save: () => {},
    load: () => {},
    corrupt: () => {},
    garbageCorrupt: () => {},
    infJump: () => {},
  });

  // Initialize engine once
  useEffect(() => {
    const engine = new NesEngine({
      onFpsUpdate: (newFps) => setFps(newFps),
      onError: (err) => {
        console.error('NES Runtime Error:', err);
        showToast(`Emulator error: ${err.message}`);
      },
      onStatusChange: (newStatus) => {
        if (newStatus === 'running') setStatus('running');
        else if (newStatus === 'paused') setStatus('paused');
        else if (newStatus === 'stopped') setStatus('unloaded');
      },
      onQuickSave: () => handlersRef.current.save(),
      onQuickLoad: () => handlersRef.current.load(),
      onQuickCorrupt: () => handlersRef.current.corrupt(),
      onQuickGarbageCorrupt: () => handlersRef.current.garbageCorrupt(),
      onQuickInfJump: () => handlersRef.current.infJump(),
      onWorldLevelChange: (info) => {
        setWorldLevelInfo(info);
        if (engineRef.current) {
          const power = engineRef.current.getPowerup();
          setCurrentPowerup(power);
        }
      },
    });

    engineRef.current = engine;

    if (canvasRef.current) {
      engine.attachCanvas(canvasRef.current);
    }

    // Load initial game
    loadGameRom(PRELOADED_ROMS[0]);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Re-attach canvas if fullscreen or layout changes
  useEffect(() => {
    if (canvasRef.current && engineRef.current) {
      engineRef.current.attachCanvas(canvasRef.current);
    }
  }, [isFullscreen]);

  const loadGameRom = async (rom: RomInfo) => {
    if (!engineRef.current) return;
    setStatus('loading');
    setCurrentRom(rom);
    refreshSaveStateInfo(rom.id);

    try {
      let romBuffer: Uint8Array;

      // Use embedded instant base64 for built-in ROMs to guarantee 0-latency offline loading
      if (rom.id === 'smb1') {
        romBuffer = base64ToUint8Array(SUPER_MARIO_BROS_BASE64);
      } else if (rom.id === 'mb1') {
        romBuffer = base64ToUint8Array(MARIO_BROS_CLASSIC_BASE64);
      } else if (rom.id === 'famidash') {
        try {
          const url = rom.url
            ? rom.url.startsWith('/')
              ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${rom.url}`
              : rom.url
            : '/roms/famidash.nes';
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuf = await response.arrayBuffer();
          romBuffer = new Uint8Array(arrayBuf);
        } catch {
          const { FAMIDASH_BASE64 } = await import('./emulator/famidashRom');
          romBuffer = base64ToUint8Array(FAMIDASH_BASE64);
        }
      } else if (rom.url) {
        const url = rom.url.startsWith('/')
          ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${rom.url}`
          : rom.url;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} loading ROM`);
        const arrayBuf = await response.arrayBuffer();
        romBuffer = new Uint8Array(arrayBuf);
      } else {
        throw new Error('ROM source unavailable');
      }

      await engineRef.current.loadRom(romBuffer, rom.id);
      if (infiniteHealth) {
        engineRef.current.setInfiniteHealth(true);
      }
      showToast(`Loaded: ${rom.title}`);
    } catch (err) {
      console.error('Failed to load ROM:', err);
      setStatus('error');
      showToast(`Failed to load ${rom.title}`);
    }
  };

  const handleCustomFileSelected = async (file: File) => {
    if (!engineRef.current) return;
    try {
      setStatus('loading');
      const arrayBuf = await file.arrayBuffer();
      const customRomInfo: RomInfo = {
        id: `custom_${Date.now()}`,
        title: file.name.replace(/\.nes$/i, ''),
        subtitle: 'Custom Cartridge',
        releaseYear: new Date().getFullYear(),
        isCustom: true,
      };

      setCurrentRom(customRomInfo);
      refreshSaveStateInfo(customRomInfo.id);

      await engineRef.current.loadRom(arrayBuf, customRomInfo.id);
      showToast(`Loaded Custom ROM: ${customRomInfo.title}`);
    } catch (err) {
      console.error('Failed to load custom ROM:', err);
      setStatus('error');
      showToast('Invalid or corrupt NES ROM file');
    }
  };

  const handleTogglePlay = () => {
    if (!engineRef.current) return;
    const isNowPaused = engineRef.current.togglePause();
    if (isNowPaused) {
      showToast('Game Paused');
    } else {
      showToast('Game Resumed');
    }
  };

  const handleReset = () => {
    if (!engineRef.current) return;
    engineRef.current.reset();
    showToast('NES Console Reset');
  };

  const handleToggleMute = () => {
    if (!engineRef.current) return;
    const player = engineRef.current.getAudioPlayer();
    const nextMuted = !isMuted;
    player.setMuted(nextMuted);
    setIsMuted(nextMuted);
    showToast(nextMuted ? 'Audio Muted' : 'Audio Unmuted');
  };

  const handleVolumeChange = (newVol: number) => {
    if (!engineRef.current) return;
    const player = engineRef.current.getAudioPlayer();
    player.setVolume(newVol);
    setVolume(newVol);
    if (isMuted && newVol > 0) {
      player.setMuted(false);
      setIsMuted(false);
    }
  };

  const handleToggleScanlines = () => {
    setScanlinesEnabled((prev) => !prev);
    showToast(!scanlinesEnabled ? 'CRT Scanlines Enabled' : 'CRT Scanlines Disabled');
  };

  const handleToggleInfiniteHealth = useCallback(() => {
    const nextVal = !infiniteHealth;
    setInfiniteHealth(nextVal);
    engineRef.current?.setInfiniteHealth(nextVal);
    showToast(
      nextVal
        ? 'Infinite Health & Lives: ENABLED (Invincibility + 99 Lives)'
        : 'Infinite Health & Lives: DISABLED'
    );
  }, [infiniteHealth, showToast]);

  const handleSaveState = useCallback(() => {
    if (!engineRef.current) return;
    try {
      // 1. Save in memory within the NES engine (deep clone)
      const stateObj = engineRef.current.saveState(currentRom.id);
      if (!stateObj) {
        showToast('Unable to capture save state');
        return;
      }

      const timestamp = Date.now();
      // 2. Persist to localStorage for cross-session continuity
      try {
        const saveData: SaveStateData = {
          romId: currentRom.id,
          romTitle: currentRom.title,
          timestamp,
          state: stateObj,
        };
        localStorage.setItem(`nes_save_${currentRom.id}`, JSON.stringify(saveData));
      } catch (storageErr) {
        console.warn('LocalStorage save failed, relying on in-memory quicksave:', storageErr);
      }

      setHasSaveState(true);
      setLastSavedTime(new Date(timestamp).toLocaleTimeString());
      showToast('State Saved! [F5]');
    } catch (err) {
      console.error('Failed to save state:', err);
      showToast('Failed to save state');
    }
  }, [currentRom, showToast]);

  const handleLoadState = useCallback(() => {
    if (!engineRef.current) return;
    try {
      // 1. Try engine memory first (allows loading the SAME save repeatedly with structuredClone)
      let success = engineRef.current.loadState(undefined, currentRom.id);

      // 2. Fall back to localStorage if not yet cached in memory (e.g. after page reload)
      if (!success) {
        const raw = localStorage.getItem(`nes_save_${currentRom.id}`);
        if (raw) {
          const parsed: SaveStateData = JSON.parse(raw);
          success = engineRef.current.loadState(parsed.state, currentRom.id);
        }
      }

      if (success) {
        showToast('State Loaded! [F8]');
      } else {
        showToast('No saved state found for this game');
      }
    } catch (err) {
      console.error('Failed to load state:', err);
      showToast('Error restoring saved state');
    }
  }, [currentRom, showToast]);

  const handleToggleInfiniteJump = useCallback(() => {
    const nextVal = !infiniteJump;
    setInfiniteJump(nextVal);
    engineRef.current?.setInfiniteJump(nextVal);
    showToast(
      nextVal
        ? 'Infinite Jump: ENABLED (Jump mid-air anywhere! Hotkey: J)'
        : 'Infinite Jump: DISABLED'
    );
  }, [infiniteJump, showToast]);

  const handleTriggerInfiniteJump = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.triggerInfiniteJump();
    showToast('Air Jump Boost! [J]');
  }, [showToast]);

  const handleChangePowerup = useCallback(
    (powerup: PowerupType) => {
      if (!engineRef.current) return;
      setCurrentPowerup(powerup);
      const success = engineRef.current.setPowerup(powerup);
      if (success) {
        const labels: Record<PowerupType, string> = {
          small: 'Small Mario (Mini / Regular)',
          super: 'Super Mario (Big / Mushroom)',
          fire: 'Fire Mario (Fireball Ability)',
          star: 'Starman Mario (Invincible + Rainbow Flashing)',
        };
        showToast(`Powerup Changed: ${labels[powerup]}`);
      }
    },
    [showToast]
  );

  const handleWarp = useCallback(
    (world: number, level: number) => {
      if (!engineRef.current) return;
      const res = engineRef.current.warpToLevel(world, level);
      if (res.success) {
        showToast(res.message);
      } else {
        showToast('Warp failed: Game not loaded');
      }
    },
    [showToast]
  );

  const handleCorruptLiveLevel = useCallback(
    (mode: 'stream' | 'screen' | 'enemies' | 'full', intensity: number) => {
      if (!engineRef.current) return;
      const res = engineRef.current.corruptLiveLevel(mode, intensity);
      if (res.success) {
        showToast(res.message);
      } else {
        showToast('Live corruption failed');
      }
    },
    [showToast]
  );

  const handleToggleAutoEnemyScramble = useCallback(
    (enabled: boolean) => {
      setAutoEnemyScramble(enabled);
      if (engineRef.current) {
        engineRef.current.setAutoEnemyScramble(enabled, autoEnemyScrambleSpeed, 5);
      }
      showToast(
        enabled
          ? `Auto Enemy Scramble ON (${autoEnemyScrambleSpeed}s interval)`
          : 'Auto Enemy Scramble OFF'
      );
    },
    [autoEnemyScrambleSpeed, showToast]
  );

  const handleChangeAutoEnemyScrambleSpeed = useCallback(
    (speed: number) => {
      const rounded = speed < 0.1 ? Math.round(speed * 100) / 100 : Math.round(speed * 10) / 10;
      setAutoEnemyScrambleSpeed(rounded);
      if (engineRef.current) {
        engineRef.current.setAutoEnemyScramble(autoEnemyScramble, rounded, 5);
      }
      if (autoEnemyScramble) {
        showToast(`Auto Enemy Scramble Interval: ${rounded}s`);
      }
    },
    [autoEnemyScramble, showToast]
  );

  const handleCorrupt = useCallback(() => {
    if (!engineRef.current) return;
    const modified = engineRef.current.corrupt(corruptionPower);
    showToast(`Glitch Triggered! (${modified} bytes scrambled)`);
  }, [corruptionPower, showToast]);

  const handleCorruptGarbage = useCallback(() => {
    if (!engineRef.current) return;
    const modified = engineRef.current.corruptGarbage(80);
    showToast(`Garbage Corruption! [H] (${modified} bits randomized)`);
  }, [showToast]);

  const handleReplaceLevelData = useCallback(
    (world: number, level: number) => {
      if (!engineRef.current) return;
      const res = engineRef.current.replaceLevelData(world, level);
      if (res.success) {
        showToast(`Level Data Replaced: World ${world}-${level} (${res.areaType}, ${res.areaPtr})!`);
      } else {
        showToast('Level data replacement failed: Game not loaded');
      }
    },
    [showToast]
  );

  // Keep hotkey callbacks current with active states
  useEffect(() => {
    handlersRef.current = {
      save: handleSaveState,
      load: handleLoadState,
      corrupt: handleCorrupt,
      garbageCorrupt: handleCorruptGarbage,
      infJump: handleTriggerInfiniteJump,
    };
  }, [handleSaveState, handleLoadState, handleCorrupt, handleCorruptGarbage, handleTriggerInfiniteJump]);

  const handleTakeScreenshot = () => {
    if (!engineRef.current) return;
    const dataUrl = engineRef.current.captureScreenshot();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `${currentRom.title.toLowerCase().replace(/\s+/g, '-')}-screenshot.png`;
    link.href = dataUrl;
    link.click();
    showToast('Screenshot Captured');
  };

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      const el = document.getElementById('nes-screen-container') || document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start p-3 sm:p-5 relative font-sans antialiased selection:bg-red-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed top-4 z-50 flex items-center gap-2 bg-zinc-900/95 border border-zinc-700 text-zinc-100 text-xs px-3.5 py-2 rounded-full shadow-2xl animate-fade-in backdrop-blur-md"
        >
          <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Console Container */}
      <div className="w-full max-w-[700px] flex flex-col gap-3.5 sm:gap-4 my-auto">
        {/* Minimalist Top Bar */}
        <header className="w-full flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.9)] animate-pulse" />
            <h1 className="text-sm font-black tracking-widest text-zinc-100 uppercase font-mono">
              NES EMULATOR
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="header-help-btn"
              type="button"
              onClick={() => setShowControlsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Controls</span>
            </button>
          </div>
        </header>

        {/* Game Cartridge Quick-Picker */}
        <GameSelector
          currentRomId={currentRom.id}
          romList={PRELOADED_ROMS}
          onSelectRom={(rom) => loadGameRom(rom)}
          onCustomFileSelected={handleCustomFileSelected}
        />

        {/* CRT Screen Display */}
        <ScreenDisplay
          canvasRef={canvasRef}
          status={status}
          scanlinesEnabled={scanlinesEnabled}
          isFullscreen={isFullscreen}
          fps={fps}
          currentGameTitle={currentRom.title}
          onTogglePause={handleTogglePlay}
          onToggleFullscreen={handleToggleFullscreen}
          onFileDrop={handleCustomFileSelected}
        />

        {/* Controls Bar */}
        <ControlsBar
          status={status}
          isMuted={isMuted}
          volume={volume}
          scanlinesEnabled={scanlinesEnabled}
          hasSaveState={hasSaveState}
          lastSavedTime={lastSavedTime}
          infiniteHealth={infiniteHealth}
          infiniteJump={infiniteJump}
          currentPowerup={currentPowerup}
          corruptionPower={corruptionPower}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          onToggleMute={handleToggleMute}
          onVolumeChange={handleVolumeChange}
          onToggleScanlines={handleToggleScanlines}
          onSaveState={handleSaveState}
          onLoadState={handleLoadState}
          onTakeScreenshot={handleTakeScreenshot}
          onToggleControlsModal={() => setShowControlsModal(true)}
          onToggleInfiniteHealth={handleToggleInfiniteHealth}
          onToggleInfiniteJump={handleToggleInfiniteJump}
          onTriggerInfiniteJump={handleTriggerInfiniteJump}
          onChangePowerup={handleChangePowerup}
          onChangeCorruptionPower={setCorruptionPower}
          onCorrupt={handleCorrupt}
          onCorruptGarbage={handleCorruptGarbage}
          showVirtualGamepad={showVirtualGamepad}
          onToggleVirtualGamepad={() => setShowVirtualGamepad((prev) => !prev)}
        />

        {/* Live Level Tools, Replacer, Warp & Live Level Corruptor */}
        <LiveWorldChanger
          currentInfo={worldLevelInfo}
          onReplaceLevelData={handleReplaceLevelData}
          onWarp={handleWarp}
          onCorruptLiveLevel={handleCorruptLiveLevel}
          autoEnemyScramble={autoEnemyScramble}
          autoEnemyScrambleSpeed={autoEnemyScrambleSpeed}
          onToggleAutoEnemyScramble={handleToggleAutoEnemyScramble}
          onChangeAutoEnemyScrambleSpeed={handleChangeAutoEnemyScrambleSpeed}
          disabled={status !== 'running' && status !== 'paused'}
        />

        {/* Tactile Virtual Gamepad */}
        {showVirtualGamepad && (
          <VirtualGamepad
            onButtonDown={(player, button) => engineRef.current?.buttonDown(player, button)}
            onButtonUp={(player, button) => engineRef.current?.buttonUp(player, button)}
          />
        )}
      </div>

      {/* Controller & Keyboard Guide Modal */}
      <KeybindingsModal
        isOpen={showControlsModal}
        onClose={() => setShowControlsModal(false)}
      />
    </main>
  );
}
