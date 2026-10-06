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
  Gauge,
  Minus,
  Plus,
  FastForward,
  Clock,
  Flag,
  Hammer,
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
  emulationSpeed?: number;
  onChangeSpeed?: (speed: number) => void;
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
  onQuickMerge?: () => void;
  onSpawnFlag?: () => void;
  onSpawnHammer?: () => void;
  onRandomWarp?: () => void;
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
  emulationSpeed = 1.0,
  onChangeSpeed,
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
  onQuickMerge,
  onSpawnFlag,
  onSpawnHammer,
  onRandomWarp,
  showVirtualGamepad,
  onToggleVirtualGamepad,
}) => {
  return (
    <div
      id="nes-controls-bar"
      className="w-full max-w-[700px] mx-auto bg-white border border-zinc-200 rounded-xl p-3 shadow-md flex flex-col gap-2.5 text-zinc-800"
    >
      {/* Primary Row: Playback, Reset, AI Robot, Audio, Cheats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Playback & Reset Controls */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-toggle-play"
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer ${
              status === 'paused'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300'
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
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded-lg transition-colors shadow-xs cursor-pointer"
            title="Reload & Reset Game [J]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset [J]</span>
          </button>
        </div>

        {/* Audio Volume Controls */}
        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1">
          <button
            id="btn-mute-toggle"
            type="button"
            onClick={onToggleMute}
            className="text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-600" />
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
            className="w-14 sm:w-18 h-1.5 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-red-600"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
          <span className="text-[10px] font-mono text-zinc-600 w-6 text-right">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>

        {/* Cheats: Infinite Health */}
        <button
          id="btn-infinite-health"
          type="button"
          onClick={onToggleInfiniteHealth}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-xs cursor-pointer ${
            infiniteHealth
              ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/40 shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
          }`}
          title={
            infiniteHealth
              ? 'Infinite Health & Lives: Active (Star Power + 99 Lives)'
              : 'Enable Infinite Health & 99 Lives'
          }
        >
          <Shield
            className={`w-3.5 h-3.5 ${
              infiniteHealth ? 'text-emerald-600 fill-emerald-600/20' : 'text-zinc-500'
            }`}
          />
          <span>Inf Health</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
              infiniteHealth ? 'bg-emerald-600 text-white' : 'bg-zinc-300 text-zinc-700'
            }`}
          >
            {infiniteHealth ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Cheats: Infinite Jump Button */}
        <div className="flex items-center rounded-lg overflow-hidden border border-zinc-300 bg-zinc-100 shadow-xs">
          <button
            id="btn-infinite-jump"
            type="button"
            onClick={onToggleInfiniteJump}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              infiniteJump
                ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-500/40 shadow-xs'
                : 'hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900'
            }`}
            title={
              infiniteJump
                ? 'Infinite Jump: Active (Press Jump/Space/A anywhere in mid-air to jump repeatedly! Hotkey: K)'
                : 'Enable Infinite Jump (Jump repeatedly in mid-air & moon jump! Hotkey: K)'
            }
          >
            <ChevronsUp
              className={`w-3.5 h-3.5 ${
                infiniteJump ? 'text-sky-600 stroke-[2.5]' : 'text-zinc-500'
              }`}
            />
            <span>Inf Jump</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                infiniteJump ? 'bg-sky-600 text-white' : 'bg-zinc-300 text-zinc-700'
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
            className="px-2 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white transition-colors border-l border-zinc-300 flex items-center gap-1 cursor-pointer"
            title="Instant Jump Boost: Propel Mario upward mid-air right now! (Hotkey: K)"
          >
            <ArrowUp className="w-3 h-3 stroke-[3]" />
            <span className="text-[10px] font-mono hidden sm:inline">Boost [K]</span>
          </button>
        </div>
      </div>

      {/* Secondary Row: Powerup, Save/Load, Glitch/Garbage, Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-200">
        {/* Mario Powerup Changer */}
        <div
          id="powerup-changer-group"
          className="flex items-center rounded-lg overflow-hidden border border-zinc-300 bg-zinc-50 shadow-xs p-0.5 gap-0.5"
        >
          <span className="text-[10px] font-mono font-bold text-zinc-500 px-1.5 hidden xl:inline">
            Powerup:
          </span>

          {/* Small Mario */}
          <button
            id="btn-powerup-small"
            type="button"
            onClick={() => onChangePowerup('small')}
            className={`flex items-center gap-1 px-1.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              currentPowerup === 'small'
                ? 'bg-zinc-700 text-white shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
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
                ? 'bg-amber-100 text-amber-900 border border-amber-400 shadow-xs font-bold ring-1 ring-amber-400/40'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
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
                ? 'bg-red-100 text-red-900 border border-red-400 shadow-xs font-bold ring-1 ring-red-400/40'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
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
                ? 'bg-yellow-100 text-yellow-900 border border-yellow-400 shadow-xs font-bold ring-1 ring-yellow-400/50 animate-pulse'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="Starman: Invincible flashing Mario with Star Power invulnerability!"
          >
            <span className="text-xs">⭐</span>
            <span className="text-[10px] font-mono">Star</span>
          </button>
        </div>

        {/* Save & Load Options with Corruptor */}
        <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg p-1">
          {/* Save Button */}
          <button
            id="btn-save-state"
            type="button"
            onClick={onSaveState}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 rounded-md transition-colors shadow-xs cursor-pointer"
            title="Save State into memory & storage (Hotkey: F5 or [)"
          >
            <Save className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold">Save</span>
            <span className="text-[9px] font-mono text-zinc-500 hidden sm:inline">[F5]</span>
          </button>

          {/* Load Button (Supports loading the exact same save multiple times) */}
          <button
            id="btn-load-state"
            type="button"
            onClick={onLoadState}
            disabled={!hasSaveState}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors shadow-xs ${
              hasSaveState
                ? 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 cursor-pointer'
                : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
            }`}
            title={
              hasSaveState
                ? `Load State repeatedly (Saved: ${lastSavedTime}) - Hotkey: F8 or ]`
                : 'No saved state available'
            }
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-semibold">Load</span>
            <span className="text-[9px] font-mono text-zinc-500 hidden sm:inline">[F8]</span>
          </button>

          <div className="w-[1px] h-5 bg-zinc-200 mx-0.5" />

          {/* Full Memory Corruptor Button */}
          <button
            id="btn-corrupt-nes"
            type="button"
            onClick={onCorrupt}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Glitch NES memory once (Hotkey: G, F7, or `)"
          >
            <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-600/30 animate-pulse" />
            <span>Glitch</span>
            <span className="text-[9px] font-mono bg-purple-200 text-purple-900 px-1 rounded">
              [G]
            </span>
          </button>

          {/* Garbage Corruptor Button (Changes bits scaled by Power) */}
          <button
            id="btn-corrupt-garbage"
            type="button"
            onClick={onCorruptGarbage}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer"
            title={`Garbage Corruption (Hotkey: H) - Randomizes ${corruptionPower * 20} bits based on Power ${corruptionPower}/10`}
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-600" />
            <span>Garbage</span>
            <span className="text-[9px] font-mono bg-amber-200 text-amber-900 px-1 rounded">
              [H]
            </span>
          </button>

          {/* Quick Level Merge Button */}
          <button
            id="btn-quick-merge-levels"
            type="button"
            onClick={onQuickMerge}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Merge Two Level Datas: Simultaneously fuses two level object & enemy streams into one hybrid world! (Hotkey: M)"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600/30" />
            <span>Merge</span>
            <span className="text-[9px] font-mono bg-indigo-200 text-indigo-900 px-1 rounded">
              [M]
            </span>
          </button>

          {/* Quick Flag Button (5 blocks in front of Mario) */}
          <button
            id="btn-spawn-flag"
            type="button"
            onClick={onSpawnFlag}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Adds an authentic Flagpole 5 blocks in front of Mario! Run into it to complete the stage! (Hotkey: F)"
          >
            <Flag className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/30" />
            <span>+Flag</span>
            <span className="text-[9px] font-mono bg-emerald-200 text-emerald-900 px-1 rounded">
              [F]
            </span>
          </button>

          {/* Quick Hammer Button (5 blocks in front of Mario) */}
          <button
            id="btn-spawn-hammer"
            type="button"
            onClick={onSpawnHammer}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Spawns Hammer Bro & flying Hammer 5 blocks in front of Mario! (Hotkey: U)"
          >
            <Hammer className="w-3.5 h-3.5 text-rose-600" />
            <span>+Hammer</span>
            <span className="text-[9px] font-mono bg-rose-200 text-rose-900 px-1 rounded">
              [U]
            </span>
          </button>

          {/* Quick Random Warp Button */}
          <button
            id="btn-quick-random-warp"
            type="button"
            onClick={onRandomWarp}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Warp to a Random Level! (Hotkey: T)"
          >
            <Shuffle className="w-3.5 h-3.5 text-cyan-600" />
            <span>Random Warp</span>
            <span className="text-[9px] font-mono bg-cyan-200 text-cyan-900 px-1 rounded">
              [T]
            </span>
          </button>

          {/* Corruption Power Control */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-[10px]"
            title={`Glitch & Garbage Power: ${corruptionPower} / 10 (${
              corruptionPower <= 3
                ? `Mild: ${corruptionPower * 20} bits`
                : corruptionPower <= 7
                ? `Chaos: ${corruptionPower * 20} bits`
                : `Cosmic: ${corruptionPower * 20} bits`
            })`}
          >
            <span className="text-zinc-500 font-mono text-[9px]">Pwr:</span>
            <input
              id="corruption-power-slider"
              type="range"
              min="1"
              max="10"
              step="1"
              value={corruptionPower}
              onChange={(e) => onChangeCorruptionPower(parseInt(e.target.value, 10))}
              className="w-10 sm:w-12 h-1 bg-zinc-200 rounded appearance-none cursor-pointer accent-purple-600"
            />
            <span className="font-mono font-bold text-purple-700 w-3 text-center">
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
            className="p-1.5 text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-lg transition-colors shadow-xs cursor-pointer"
            title="Capture Screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            id="btn-toggle-scanlines"
            type="button"
            onClick={onToggleScanlines}
            className={`p-1.5 rounded-lg border transition-colors shadow-xs cursor-pointer ${
              scanlinesEnabled
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:text-zinc-900'
            }`}
            title={scanlinesEnabled ? 'CRT Scanlines: ON' : 'CRT Scanlines: OFF'}
          >
            <Tv className="w-4 h-4" />
          </button>

          <button
            id="btn-toggle-virtual-gamepad"
            type="button"
            onClick={onToggleVirtualGamepad}
            className={`p-1.5 rounded-lg border transition-colors shadow-xs cursor-pointer ${
              showVirtualGamepad
                ? 'bg-zinc-200 border-zinc-400 text-zinc-900'
                : 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:text-zinc-900'
            }`}
            title={showVirtualGamepad ? 'Hide On-Screen Controller' : 'Show On-Screen Controller'}
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          <button
            id="btn-open-keybindings"
            type="button"
            onClick={onToggleControlsModal}
            className="p-1.5 text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-lg transition-colors shadow-xs cursor-pointer"
            title="View Keyboard & Controller Mappings"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Speedhack Row: Fast-Forward, Slow-Motion, Presets & Precision Slider */}
      <div
        id="speedhack-controls-group"
        className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Main Speedhack Pill */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-300 shadow-xs">
            <span className="flex items-center gap-1 text-xs font-bold text-zinc-800">
              <Gauge className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Speedhack:</span>
            </span>

            {/* Slower (-) */}
            <button
              id="btn-speed-decrease"
              type="button"
              onClick={() => onChangeSpeed?.(Math.max(0.25, Math.round((emulationSpeed - (emulationSpeed > 2.0 ? 0.5 : 0.25)) * 100) / 100))}
              className="p-1 rounded hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
              title="Slow down game (-)"
            >
              <Minus className="w-3 h-3" />
            </button>

            {/* Current Speed Badge & 1.0x Reset */}
            <button
              id="btn-speed-reset-normal"
              type="button"
              onClick={() => onChangeSpeed?.(1.0)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                emulationSpeed === 1.0
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : emulationSpeed > 1.0
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_8px_rgba(217,119,6,0.4)] animate-pulse'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_8px_rgba(8,145,178,0.4)]'
              }`}
              title="Click to reset speed to 1.0x Normal (Hotkey: \ or 0)"
            >
              {emulationSpeed.toFixed(2)}x {emulationSpeed === 1.0 ? 'Normal' : emulationSpeed > 1.0 ? 'Fast' : 'Slow'}
            </button>

            {/* Faster (+) */}
            <button
              id="btn-speed-increase"
              type="button"
              onClick={() => onChangeSpeed?.(Math.min(5.0, Math.round((emulationSpeed + (emulationSpeed >= 2.0 ? 0.5 : 0.25)) * 100) / 100))}
              className="p-1 rounded hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
              title="Speed up game (+)"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: '0.25x', speed: 0.25, desc: 'Matrix Slow-Mo' },
              { label: '0.5x', speed: 0.5, desc: 'Half Speed Slow-Mo' },
              { label: '0.75x', speed: 0.75, desc: 'Slightly Slower' },
              { label: '1.0x', speed: 1.0, desc: 'Normal 60 FPS' },
              { label: '1.5x', speed: 1.5, desc: 'Brisk Pace' },
              { label: '2.0x', speed: 2.0, desc: '2x Double Speed' },
              { label: '3.0x', speed: 3.0, desc: '3x Speedrun Turbo' },
              { label: '5.0x', speed: 5.0, desc: '5x Hyper Mode' },
            ].map((p) => (
              <button
                key={p.speed}
                id={`btn-speedhack-${p.speed}`}
                type="button"
                onClick={() => onChangeSpeed?.(p.speed)}
                className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-all cursor-pointer ${
                  emulationSpeed === p.speed
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300'
                }`}
                title={`Set game speed to ${p.label} (${p.desc})`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Speed Slider */}
        <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-300 rounded-lg px-2 py-1 shadow-xs">
          <label htmlFor="speedhack-slider" className="text-[10px] font-mono text-zinc-600">
            Speed:
          </label>
          <input
            id="speedhack-slider"
            type="range"
            min="0.1"
            max="5.0"
            step="0.05"
            value={emulationSpeed}
            onChange={(e) => onChangeSpeed?.(parseFloat(e.target.value))}
            className="w-16 sm:w-24 h-1.5 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-amber-600"
            title={`Emulation Speed: ${emulationSpeed}x`}
          />
          <span className="text-[10px] font-mono font-bold text-amber-700 w-11 text-right">
            {emulationSpeed.toFixed(2)}x
          </span>
        </div>
      </div>
    </div>
  );
};
