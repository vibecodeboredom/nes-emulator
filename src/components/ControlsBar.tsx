import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  Tv,
  Save,
  Download,
  Keyboard,
  Gamepad2,
  Zap,
  Shield,
  Sliders,
  Shuffle,
  ChevronsUp,
  ArrowUp,
  Sparkles,
} from 'lucide-react';
import { EmulatorStatus, PowerupType } from '../types';

interface ControlsBarProps {
  status: EmulatorStatus;
  isMuted: boolean;
  volume: number;
  scanlinesEnabled: boolean;
  hasSaveState: boolean;
  lastSavedTime: string | null;
  infiniteHealth: boolean;
  infiniteJump: boolean;
  currentPowerup: PowerupType;
  corruptionPower: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleScanlines: () => void;
  onSaveState: () => void;
  onLoadState: () => void;
  onTakeScreenshot: () => void;
  onToggleControlsModal: () => void;
  onToggleInfiniteHealth: () => void;
  onToggleInfiniteJump: () => void;
  onTriggerInfiniteJump: () => void;
  onChangePowerup: (powerup: PowerupType) => void;
  onChangeCorruptionPower: (pwr: number) => void;
  onCorrupt: () => void;
  onCorruptGarbage: () => void;
  showVirtualGamepad: boolean;
  onToggleVirtualGamepad: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  status,
  isMuted,
  volume,
  scanlinesEnabled,
  hasSaveState,
  lastSavedTime,
  infiniteHealth,
  infiniteJump,
  currentPowerup,
  corruptionPower,
  onTogglePlay,
  onReset,
  onToggleMute,
  onVolumeChange,
  onToggleScanlines,
  onSaveState,
  onLoadState,
  onTakeScreenshot,
  onToggleControlsModal,
  onToggleInfiniteHealth,
  onToggleInfiniteJump,
  onTriggerInfiniteJump,
  onChangePowerup,
  onChangeCorruptionPower,
  onCorrupt,
  onCorruptGarbage,
  showVirtualGamepad,
  onToggleVirtualGamepad,
}) => {
  return (
    <div
      id="nes-controls-bar"
      className="w-full max-w-[700px] mx-auto bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 shadow-lg flex flex-col gap-2.5 text-zinc-300"
    >
      {/* Primary Row: Playback, Audio, Savestating, Corruptor, Cheats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-toggle-play"
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
              status === 'paused'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
            }`}
            title={status === 'paused' ? 'Resume Emulation' : 'Pause Emulation'}
          >
            {status === 'paused' ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            id="btn-reset-nes"
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-900/80 rounded-lg transition-colors shadow-xs"
            title="Reset NES Console (Restart)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Audio Volume Controls */}
        <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800/80 rounded-lg px-2.5 py-1">
          <button
            id="btn-mute-toggle"
            type="button"
            onClick={onToggleMute}
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <input
            id="audio-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-14 sm:w-18 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
          <span className="text-[10px] font-mono text-zinc-400 w-6 text-right">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>

        {/* Cheats: Infinite Health */}
        <button
          id="btn-infinite-health"
          type="button"
          onClick={onToggleInfiniteHealth}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-xs ${
            infiniteHealth
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
              : 'bg-zinc-800/90 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 border-zinc-700'
          }`}
          title={
            infiniteHealth
              ? 'Infinite Health & Lives: Active (Star Power + 99 Lives)'
              : 'Enable Infinite Health & 99 Lives'
          }
        >
          <Shield
            className={`w-3.5 h-3.5 ${
              infiniteHealth ? 'text-emerald-400 fill-emerald-400/20' : 'text-zinc-400'
            }`}
          />
          <span>Inf Health</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
              infiniteHealth ? 'bg-emerald-800 text-white' : 'bg-zinc-700 text-zinc-400'
            }`}
          >
            {infiniteHealth ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Cheats: Infinite Jump Button */}
        <div className="flex items-center rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-800/90 shadow-xs">
          <button
            id="btn-infinite-jump"
            type="button"
            onClick={onToggleInfiniteJump}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              infiniteJump
                ? 'bg-sky-950/90 text-sky-300 ring-1 ring-sky-500/40 shadow-[0_0_10px_rgba(14,165,233,0.25)]'
                : 'hover:bg-zinc-750 text-zinc-300 hover:text-white'
            }`}
            title={
              infiniteJump
                ? 'Infinite Jump: Active (Press Jump/Space/A anywhere in mid-air to jump repeatedly! Hotkey: J)'
                : 'Enable Infinite Jump (Jump repeatedly in mid-air & moon jump! Hotkey: J)'
            }
          >
            <ChevronsUp
              className={`w-3.5 h-3.5 ${
                infiniteJump ? 'text-sky-400 stroke-[2.5]' : 'text-zinc-400'
              }`}
            />
            <span>Inf Jump</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                infiniteJump ? 'bg-sky-700 text-white' : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {infiniteJump ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Instant Jump Boost Button */}
          <button
            id="btn-trigger-inf-jump"
            type="button"
            onClick={onTriggerInfiniteJump}
            className="px-2 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white transition-colors border-l border-zinc-700/80 flex items-center gap-1 cursor-pointer"
            title="Instant Jump Boost: Propel Mario upward mid-air right now! (Hotkey: J)"
          >
            <ArrowUp className="w-3 h-3 stroke-[3]" />
            <span className="text-[10px] font-mono hidden sm:inline">Boost</span>
          </button>
        </div>

        {/* Mario Powerup Changer */}
        <div
          id="powerup-changer-group"
          className="flex items-center rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-800/90 shadow-xs p-0.5 gap-0.5"
        >
          <span className="text-[10px] font-mono font-bold text-zinc-400 px-1.5 hidden xl:inline">
            Powerup:
          </span>

          {/* Small Mario */}
          <button
            id="btn-powerup-small"
            type="button"
            onClick={() => onChangePowerup('small')}
            className={`flex items-center gap-1 px-1.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              currentPowerup === 'small'
                ? 'bg-zinc-700 text-white shadow-xs font-bold ring-1 ring-zinc-500'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750'
            }`}
            title="Small Mario: Change Mario's status to Small (Default size)"
          >
            <span className="text-xs">🔴</span>
            <span className="text-[10px] font-mono">Small</span>
          </button>

          {/* Super Mario */}
          <button
            id="btn-powerup-super"
            type="button"
            onClick={() => onChangePowerup('super')}
            className={`flex items-center gap-1 px-1.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              currentPowerup === 'super'
                ? 'bg-amber-950/90 text-amber-200 border border-amber-500/60 shadow-xs font-bold ring-1 ring-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750'
            }`}
            title="Super Mario: Grow into Big Mario with mushroom sound effect!"
          >
            <span className="text-xs">🍄</span>
            <span className="text-[10px] font-mono">Super</span>
          </button>

          {/* Fire Mario */}
          <button
            id="btn-powerup-fire"
            type="button"
            onClick={() => onChangePowerup('fire')}
            className={`flex items-center gap-1 px-1.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              currentPowerup === 'fire'
                ? 'bg-red-950/90 text-red-200 border border-red-500/60 shadow-xs font-bold ring-1 ring-red-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750'
            }`}
            title="Fire Mario: Gain fireball shooting ability (Fire Mario palette & white overalls)"
          >
            <span className="text-xs">🔥</span>
            <span className="text-[10px] font-mono">Fire</span>
          </button>

          {/* Starman */}
          <button
            id="btn-powerup-star"
            type="button"
            onClick={() => onChangePowerup('star')}
            className={`flex items-center gap-1 px-1.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              currentPowerup === 'star'
                ? 'bg-yellow-950/90 text-yellow-200 border border-yellow-400/70 shadow-xs font-bold ring-1 ring-yellow-400/50 animate-pulse'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750'
            }`}
            title="Starman: Invincible flashing Mario with Star Power invulnerability!"
          >
            <span className="text-xs">⭐</span>
            <span className="text-[10px] font-mono">Star</span>
          </button>
        </div>

        {/* Save & Load Options with Corruptor */}
        <div className="flex items-center gap-1.5 bg-zinc-950/70 border border-zinc-800/90 rounded-lg p-1">
          {/* Save Button */}
          <button
            id="btn-save-state"
            type="button"
            onClick={onSaveState}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/80 rounded-md transition-colors"
            title="Save State into memory & storage (Hotkey: F5 or [)"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Save</span>
            <span className="text-[9px] font-mono text-zinc-400 hidden sm:inline">[F5]</span>
          </button>

          {/* Load Button (Supports loading the exact same save multiple times) */}
          <button
            id="btn-load-state"
            type="button"
            onClick={onLoadState}
            disabled={!hasSaveState}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
              hasSaveState
                ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700/80 cursor-pointer'
                : 'bg-zinc-900/60 text-zinc-600 border-zinc-850 cursor-not-allowed'
            }`}
            title={
              hasSaveState
                ? `Load State repeatedly (Saved: ${lastSavedTime}) - Hotkey: F8 or ]`
                : 'No saved state available'
            }
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">Load</span>
            <span className="text-[9px] font-mono text-zinc-400 hidden sm:inline">[F8]</span>
          </button>

          <div className="w-[1px] h-5 bg-zinc-800 mx-0.5" />

          {/* Full Memory Corruptor Button */}
          <button
            id="btn-corrupt-nes"
            type="button"
            onClick={onCorrupt}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border border-purple-850 hover:border-purple-700 rounded-md transition-all shadow-xs active:scale-95"
            title="Glitch NES memory once (Hotkey: G, F7, or `)"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400 fill-purple-400/30 animate-pulse" />
            <span>Glitch</span>
            <span className="text-[9px] font-mono bg-purple-900/80 text-purple-300 px-1 rounded">
              [G]
            </span>
          </button>

          {/* Garbage Corruptor Button (Changes 80 bits into random things) */}
          <button
            id="btn-corrupt-garbage"
            type="button"
            onClick={onCorruptGarbage}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 border border-amber-850 hover:border-amber-700 rounded-md transition-all shadow-xs active:scale-95"
            title="Garbage Corruption (Hotkey: H) - Changes 80 random bits into random values across memory"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span>Garbage</span>
            <span className="text-[9px] font-mono bg-amber-900/80 text-amber-300 px-1 rounded">
              [H]
            </span>
          </button>

          {/* Corruption Power Control */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]"
            title={`Corruption Power: ${corruptionPower} / 10 (${
              corruptionPower <= 3 ? 'Mild Glitch' : corruptionPower <= 7 ? 'Classic Chaos' : 'Cosmic Glitch'
            })`}
          >
            <span className="text-zinc-400 font-mono text-[9px]">Pwr:</span>
            <input
              id="corruption-power-slider"
              type="range"
              min="1"
              max="10"
              step="1"
              value={corruptionPower}
              onChange={(e) => onChangeCorruptionPower(parseInt(e.target.value, 10))}
              className="w-10 sm:w-12 h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-purple-500"
            />
            <span className="font-mono font-bold text-purple-300 w-3 text-center">
              {corruptionPower}
            </span>
          </div>
        </div>

        {/* Tools: Screenshot, Scanlines, Controller toggle, Guide */}
        <div className="flex items-center gap-1">
          <button
            id="btn-screenshot"
            type="button"
            onClick={onTakeScreenshot}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
            title="Capture Screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            id="btn-toggle-scanlines"
            type="button"
            onClick={onToggleScanlines}
            className={`p-1.5 rounded-lg border transition-colors ${
              scanlinesEnabled
                ? 'bg-red-950/60 border-red-800 text-red-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-100'
            }`}
            title={scanlinesEnabled ? 'CRT Scanlines: ON' : 'CRT Scanlines: OFF'}
          >
            <Tv className="w-4 h-4" />
          </button>

          <button
            id="btn-toggle-virtual-gamepad"
            type="button"
            onClick={onToggleVirtualGamepad}
            className={`p-1.5 rounded-lg border transition-colors ${
              showVirtualGamepad
                ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-100'
            }`}
            title={showVirtualGamepad ? 'Hide On-Screen Controller' : 'Show On-Screen Controller'}
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          <button
            id="btn-open-keybindings"
            type="button"
            onClick={onToggleControlsModal}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
            title="View Keyboard & Controller Mappings"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
