import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Cpu,
  Compass,
  Shuffle,
  Dice5,
  Eye,
  Skull,
  Flame,
  Zap,
  Repeat,
  GitMerge,
  Flag,
  Hammer,
} from 'lucide-react';
import { WorldLevelInfo } from '../types';

interface LiveWorldChangerProps {
  currentInfo: WorldLevelInfo | null;
  corruptionPower?: number;
  onChangeCorruptionPower?: (pwr: number) => void;
  onCorruptGarbage?: () => void;
  onReplaceLevelData: (world: number, level: number) => void;
  onWarp: (world: number, level: number) => void;
  onCorruptLiveLevel: (mode: 'stream' | 'screen' | 'enemies' | 'full', intensity: number) => void;
  onMergeLevels?: (
    worldA: number,
    levelA: number,
    worldB: number,
    levelB: number,
    mode?: 'interleave' | 'overlay' | 'chaos'
  ) => void;
  onSpawnFlag?: () => void;
  onSpawnHammer?: () => void;
  onRandomWarp?: () => void;
  autoEnemyScramble: boolean;
  autoEnemyScrambleSpeed: number;
  onToggleAutoEnemyScramble: (enabled: boolean) => void;
  onChangeAutoEnemyScrambleSpeed: (speed: number) => void;
  autoStreamRandomize?: boolean;
  autoStreamRandomizeSpeed?: number;
  onToggleAutoStreamRandomize?: (enabled: boolean) => void;
  onChangeAutoStreamRandomizeSpeed?: (speed: number) => void;
  disabled?: boolean;
}

interface LevelPreset {
  label: string;
  sublabel?: string;
  world: number;
  level: number;
  isIllegal?: boolean;
}

const PRESETS: LevelPreset[] = [
  { label: 'World -1', sublabel: 'Minus World (36-1)', world: 36, level: 1, isIllegal: true },
  { label: 'World -1', sublabel: 'Glitch Void (-1-1)', world: -1, level: 1, isIllegal: true },
  { label: 'World -2', sublabel: 'Sunken Castle', world: -2, level: 1, isIllegal: true },
  { label: 'World -3', sublabel: 'Glitch Realm', world: -3, level: 1, isIllegal: true },
  { label: 'World 0-1', sublabel: 'Null Area', world: 0, level: 1, isIllegal: true },
  { label: 'World 9-1', sublabel: 'Secret World', world: 9, level: 1, isIllegal: true },
  { label: 'World 10-1', sublabel: 'Overworld Glitch', world: 10, level: 1, isIllegal: true },
  { label: 'World 64-1', sublabel: 'Matrix Glitch', world: 64, level: 1, isIllegal: true },
  { label: 'World 1-1', sublabel: 'Mushroom Kingdom', world: 1, level: 1, isIllegal: false },
  { label: 'World 1-2', sublabel: 'Underground', world: 1, level: 2, isIllegal: false },
  { label: 'World 2-3', sublabel: 'Water Realm', world: 2, level: 3, isIllegal: false },
  { label: 'World 4-1', sublabel: 'Lakitu Clouds', world: 4, level: 1, isIllegal: false },
  { label: 'World 8-4', sublabel: "Bowser's Castle", world: 8, level: 4, isIllegal: false },
];

export const LiveWorldChanger: React.FC<LiveWorldChangerProps> = ({
  currentInfo,
  corruptionPower,
  onChangeCorruptionPower,
  onCorruptGarbage,
  onReplaceLevelData,
  onWarp,
  onCorruptLiveLevel,
  onMergeLevels,
  onSpawnFlag,
  onSpawnHammer,
  onRandomWarp,
  autoEnemyScramble,
  autoEnemyScrambleSpeed,
  onToggleAutoEnemyScramble,
  onChangeAutoEnemyScrambleSpeed,
  autoStreamRandomize = false,
  autoStreamRandomizeSpeed = 2.0,
  onToggleAutoStreamRandomize,
  onChangeAutoStreamRandomizeSpeed,
  disabled = false,
}) => {
  const [worldInput, setWorldInput] = useState<string>('8');
  const [levelInput, setLevelInput] = useState<string>('4');
  const [localCorruptIntensity, setLocalCorruptIntensity] = useState<number>(5);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'swap_warp' | 'corruptor' | 'merger'>('swap_warp');

  // Level Merger State
  const [mergeWorldA, setMergeWorldA] = useState<string>('1');
  const [mergeLevelA, setMergeLevelA] = useState<string>('1');
  const [mergeWorldB, setMergeWorldB] = useState<string>('8');
  const [mergeLevelB, setMergeLevelB] = useState<string>('4');
  const [mergeMode, setMergeMode] = useState<'interleave' | 'overlay' | 'chaos'>('interleave');

  const corruptIntensity = corruptionPower !== undefined ? corruptionPower : localCorruptIntensity;
  const setCorruptIntensity = (val: number) => {
    setLocalCorruptIntensity(val);
    onChangeCorruptionPower?.(val);
  };

  const getParsedInputs = () => {
    const w = parseInt(worldInput, 10);
    const l = parseInt(levelInput, 10);
    return {
      w: isNaN(w) ? 1 : w,
      l: isNaN(l) ? 1 : l,
    };
  };

  const handleReplace = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const { w, l } = getParsedInputs();
    onReplaceLevelData(w, l);
  };

  const handleWarp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const { w, l } = getParsedInputs();
    onWarp(w, l);
  };

  const handlePresetSelect = (preset: LevelPreset, action: 'replace' | 'warp' = 'replace') => {
    setWorldInput(preset.world.toString());
    setLevelInput(preset.level.toString());
    if (action === 'warp') {
      onWarp(preset.world, preset.level);
    } else {
      onReplaceLevelData(preset.world, preset.level);
    }
  };

  const stepWorld = (delta: number) => {
    const current = parseInt(worldInput, 10) || 0;
    setWorldInput((current + delta).toString());
  };

  const stepLevel = (delta: number) => {
    const current = parseInt(levelInput, 10) || 0;
    setLevelInput((current + delta).toString());
  };

  return (
    <div
      id="live-world-changer-card"
      className="w-full bg-white border border-zinc-200 rounded-xl p-3 sm:p-4 text-zinc-800 shadow-md flex flex-col gap-3 transition-all"
    >
      {/* Header & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-100 border border-red-200 text-red-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold tracking-wide text-zinc-900 uppercase font-mono">
                Live Level Tools & Corruptor
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 border border-red-200 text-red-700 font-mono font-semibold">
                Mid-Game RAM Mod
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-tight hidden sm:block">
              Swap level data live, warp cleanly to any world, or corrupt and build levels out of random things mid-game
            </p>
          </div>
        </div>

        {/* Live Detected State Badge & Collapse Toggle */}
        <div className="flex items-center gap-2">
          {currentInfo && (
            <div
              id="current-world-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-300 text-zinc-800 text-xs font-mono font-bold shadow-xs"
              title={`Active NES Memory: World $075F=${currentInfo.rawWorld}, Area $0760=${currentInfo.rawLevel}, Style=${currentInfo.areaType || 'Unknown'}, AreaPtr=${currentInfo.areaPtr || 'N/A'}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-500 font-normal text-[10px]">Active:</span>
              <span className="text-emerald-700 font-bold">
                W{currentInfo.displayWorld}-{currentInfo.displayLevel}
              </span>
              {currentInfo.areaType && (
                <span className="text-[10px] text-zinc-500 border-l border-zinc-300 pl-1.5 hidden md:inline">
                  {currentInfo.areaType}
                </span>
              )}
            </div>
          )}

          <button
            id="btn-toggle-world-changer"
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Sub Navigation: Level Replacer / Warp vs Live Level Corruptor */}
          <div className="flex items-center gap-1 border-b border-zinc-200 pb-2">
            <button
              id="tab-swap-warp"
              type="button"
              onClick={() => setActiveTab('swap_warp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'swap_warp'
                  ? 'bg-zinc-100 text-zinc-900 border border-zinc-300 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-red-600" />
              <span>Level Data Replacer & Warp</span>
            </button>

            <button
              id="tab-level-corruptor"
              type="button"
              onClick={() => setActiveTab('corruptor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'corruptor'
                  ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-600" />
              <span>Live Level Corruptor</span>
              {autoStreamRandomize && (
                <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white font-mono text-[9px] font-bold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Auto Stream ({autoStreamRandomizeSpeed < 0.1 ? autoStreamRandomizeSpeed.toFixed(2) : autoStreamRandomizeSpeed}s)
                </span>
              )}
              {autoEnemyScramble && (
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-bold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Auto Enemies ({autoEnemyScrambleSpeed < 0.1 ? autoEnemyScrambleSpeed.toFixed(2) : autoEnemyScrambleSpeed}s)
                </span>
              )}
              {!autoStreamRandomize && !autoEnemyScramble && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-200 text-purple-800 font-mono">
                  Randomizer
                </span>
              )}
            </button>

            <button
              id="tab-level-merger"
              type="button"
              onClick={() => setActiveTab('merger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'merger'
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dual Level Merger</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono font-bold shadow-xs">
                Key [M]
              </span>
            </button>

            {/* Quick Spawn Buttons in Front of Mario */}
            <div className="ml-auto flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-zinc-500 hidden md:inline">+5 Blocks:</span>
              <button
                id="btn-panel-spawn-flag"
                type="button"
                disabled={disabled}
                onClick={onSpawnFlag}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Adds Flagpole 5 blocks in front of Mario! (Hotkey: F)"
              >
                <Flag className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/30" />
                <span>Flag [F]</span>
              </button>
              <button
                id="btn-panel-spawn-hammer"
                type="button"
                disabled={disabled}
                onClick={onSpawnHammer}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Spawns Hammer Bro & Hammer 5 blocks in front of Mario! (Hotkey: U)"
              >
                <Hammer className="w-3.5 h-3.5 text-rose-600" />
                <span>Hammer [U]</span>
              </button>
              <button
                id="btn-panel-random-warp"
                type="button"
                disabled={disabled}
                onClick={onRandomWarp}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Warp to a Random Level! (Hotkey: T)"
              >
                <Shuffle className="w-3.5 h-3.5 text-cyan-600" />
                <span>Random Warp [T]</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Level Data Replacer & Working Warp */}
          {activeTab === 'swap_warp' && (
            <div className="flex flex-col gap-3">
              {/* Real-time memory indicators if available */}
              {currentInfo && (currentInfo.areaPtr || currentInfo.enemyPtr) && (
                <div className="flex items-center gap-3 px-2 py-1 rounded-md bg-zinc-950/70 border border-zinc-800/80 text-[10px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Cpu className="w-3 h-3 text-red-400" />
                    <span>Zero-Page Pointers:</span>
                  </span>
                  <span>
                    Objects <code className="text-amber-400">$E7,$E8: {currentInfo.areaPtr}</code>
                  </span>
                  <span className="border-l border-zinc-800 pl-2">
                    Enemies <code className="text-cyan-400">$E9,$EA: {currentInfo.enemyPtr}</code>
                  </span>
                  {currentInfo.areaPointerHex && (
                    <span className="border-l border-zinc-800 pl-2 hidden sm:inline">
                      AreaPtr <code className="text-purple-400">$0750: {currentInfo.areaPointerHex}</code>
                    </span>
                  )}
                </div>
              )}

              {/* Custom Input & Actions Form */}
              <form
                id="world-changer-form"
                onSubmit={handleReplace}
                className="flex flex-wrap items-center gap-2"
              >
                {/* World Input */}
                <div className="flex items-center gap-1">
                  <label htmlFor="world-number-input" className="text-xs font-mono text-zinc-400">
                    World:
                  </label>
                  <div className="flex items-center rounded-lg bg-zinc-950 border border-zinc-700/90 overflow-hidden focus-within:border-red-500">
                    <button
                      id="btn-step-world-down"
                      type="button"
                      onClick={() => stepWorld(-1)}
                      className="px-1.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border-r border-zinc-800"
                      title="Step World down (can be negative!)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      id="world-number-input"
                      type="number"
                      value={worldInput}
                      onChange={(e) => setWorldInput(e.target.value)}
                      placeholder="-1, 1, 8..."
                      className="w-16 px-1.5 py-1 text-xs font-mono font-bold text-center text-zinc-100 bg-transparent focus:outline-none"
                      title="Enter any world number (e.g. -1 for Minus/Glitch, -2, 0, 1 to 8, 9, 36, 255)"
                    />
                    <button
                      id="btn-step-world-up"
                      type="button"
                      onClick={() => stepWorld(1)}
                      className="px-1.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border-l border-zinc-800"
                      title="Step World up"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Level / Area Input */}
                <div className="flex items-center gap-1">
                  <label htmlFor="level-number-input" className="text-xs font-mono text-zinc-400">
                    Level:
                  </label>
                  <div className="flex items-center rounded-lg bg-zinc-950 border border-zinc-700/90 overflow-hidden focus-within:border-red-500">
                    <button
                      id="btn-step-level-down"
                      type="button"
                      onClick={() => stepLevel(-1)}
                      className="px-1.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border-r border-zinc-800"
                      title="Step Level down (can be negative!)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      id="level-number-input"
                      type="number"
                      value={levelInput}
                      onChange={(e) => setLevelInput(e.target.value)}
                      placeholder="-1, 1, 4..."
                      className="w-16 px-1.5 py-1 text-xs font-mono font-bold text-center text-zinc-100 bg-transparent focus:outline-none"
                      title="Enter any stage number (e.g. 1 to 4, or illegal -1, 0, 9)"
                    />
                    <button
                      id="btn-step-level-up"
                      type="button"
                      onClick={() => stepLevel(1)}
                      className="px-1.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border-l border-zinc-800"
                      title="Step Level up"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Action 1: Replace Level Data Button */}
                <button
                  id="btn-replace-level-data"
                  type="submit"
                  disabled={disabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg transition-all shadow-[0_0_12px_rgba(220,38,38,0.35)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Directly replace the current level's active object data with target world level data without resetting Mario"
                >
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Replace Level Data</span>
                </button>

                {/* Action 2: Warp To Level Button (Fully working in-game transition) */}
                <button
                  id="btn-warp-to-level"
                  type="button"
                  onClick={handleWarp}
                  disabled={disabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-lg transition-all shadow-[0_0_12px_rgba(14,165,233,0.35)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Warp to this World & Level: Complete in-game stage load with full background palettes, music, and Mario spawn!"
                >
                  <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Warp To Level</span>
                </button>

                {/* Action 3: Random Warp Button [Hotkey: T] */}
                <button
                  id="btn-warp-random-level"
                  type="button"
                  onClick={onRandomWarp}
                  disabled={disabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg transition-all shadow-[0_0_12px_rgba(6,182,212,0.35)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Warp to a completely Random Level! (Hotkey: T)"
                >
                  <Shuffle className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Random Warp [T]</span>
                </button>
              </form>

              {/* Curated Presets Bar */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/80">
                <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Quick Presets: Click to load / replace, or hold to warp:</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                    Red = Swap Data | Blue = Warp
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p, idx) => (
                    <div
                      key={`${p.world}-${p.level}-${idx}`}
                      className={`flex items-center rounded-md border text-[11px] font-mono overflow-hidden transition-all ${
                        p.isIllegal
                          ? 'bg-purple-950/50 border-purple-800/70 text-purple-200'
                          : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300'
                      }`}
                    >
                      {/* Left click: Replace level data */}
                      <button
                        id={`btn-preset-replace-${p.world}-${p.level}`}
                        type="button"
                        onClick={() => handlePresetSelect(p, 'replace')}
                        className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-700/70 transition-colors"
                        title={`Replace current level data with ${p.label}: ${p.sublabel}`}
                      >
                        <span className="font-bold">{p.label}</span>
                        {p.sublabel && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-sans ${
                              p.isIllegal ? 'bg-purple-900/90 text-purple-300' : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            {p.sublabel}
                          </span>
                        )}
                      </button>

                      {/* Right click/button: Direct Warp */}
                      <button
                        id={`btn-preset-warp-${p.world}-${p.level}`}
                        type="button"
                        onClick={() => handlePresetSelect(p, 'warp')}
                        className="px-1.5 py-1 bg-sky-950/60 hover:bg-sky-700 hover:text-white text-sky-300 border-l border-zinc-750 transition-colors"
                        title={`Warp cleanly to ${p.label}: ${p.sublabel} (full stage reload)`}
                      >
                        <Compass className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Level Corruptor & Randomizer */}
          {activeTab === 'corruptor' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-zinc-300 leading-snug">
                  Randomize level structures, terrain, metatiles, and enemy spawns mid-game to build surreal random stages:
                </p>

                {/* Intensity Slider */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs">
                  <span className="text-[10px] text-zinc-400 font-mono">Intensity:</span>
                  <input
                    id="corrupt-intensity-slider"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={corruptIntensity}
                    onChange={(e) => setCorruptIntensity(parseInt(e.target.value, 10))}
                    className="w-16 sm:w-20 h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="font-mono font-bold text-purple-300 w-4 text-center">
                    {corruptIntensity}
                  </span>
                </div>
              </div>

              {/* 4 Interactive Corruptor Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Corrupt Action 1: Randomize Level Stream with Auto-Toggle and Speed controls */}
                <div
                  id="corrupt-stream-card"
                  className={`col-span-1 sm:col-span-2 flex flex-col gap-2.5 p-3 rounded-lg border transition-all ${
                    autoStreamRandomize
                      ? 'bg-purple-950/30 border-purple-600/80 shadow-[0_0_15px_rgba(147,51,234,0.2)]'
                      : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Top Row: Icon, Title, Active Badge, Description, and Manual Trigger Button */}
                  <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-md shrink-0 border transition-colors ${
                          autoStreamRandomize
                            ? 'bg-purple-900 border-purple-600 text-purple-200 animate-pulse'
                            : 'bg-purple-950 border-purple-800 text-purple-400'
                        }`}
                      >
                        <Dice5 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-100">
                            Randomize Level Stream ($E7, $E8)
                          </span>
                          {autoStreamRandomize && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                              <Zap className="w-2.5 h-2.5" /> AUTO ACTIVE ({autoStreamRandomizeSpeed < 0.1 ? autoStreamRandomizeSpeed.toFixed(2) : autoStreamRandomizeSpeed}s)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                          Continuously builds upcoming terrain with random mystery ? blocks, pipes, springs, staircases, and platforms as you progress through the stage!
                        </p>
                      </div>
                    </div>

                    {/* Manual One-time Trigger Button */}
                    <button
                      id="btn-corrupt-stream-once"
                      type="button"
                      disabled={disabled}
                      onClick={() => onCorruptLiveLevel('stream', corruptIntensity)}
                      className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 hover:border-purple-600 text-zinc-200 hover:text-purple-300 text-[11px] font-medium shrink-0 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      title="Manually randomize upcoming level stream once right now"
                    >
                      <Dice5 className="w-3 h-3 text-purple-400" />
                      <span>Randomize Once</span>
                    </button>
                  </div>

                  {/* Bottom Controls Row: Auto Randomize Toggle & Speed Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-850">
                    {/* Auto Randomize Stream Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-300">Auto Randomize:</span>
                      <button
                        id="btn-toggle-auto-stream-randomize"
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggleAutoStreamRandomize?.(!autoStreamRandomize)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                          autoStreamRandomize
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(147,51,234,0.5)]'
                            : 'bg-zinc-850 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 border border-zinc-750'
                        }`}
                        title="Toggle automatic continuous level stream terrain randomization"
                      >
                        <Repeat className={`w-3.5 h-3.5 ${autoStreamRandomize ? 'animate-spin' : ''}`} />
                        <span>{autoStreamRandomize ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    {/* Speed Controls: Slider + Quick Presets */}
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
                      {/* Speed Slider */}
                      <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                        <label htmlFor="auto-stream-speed-slider" className="text-[10px] text-zinc-400 font-mono">
                          Speed:
                        </label>
                        <input
                          id="auto-stream-speed-slider"
                          type="range"
                          min="0.05"
                          max="5.0"
                          step="0.05"
                          value={autoStreamRandomizeSpeed}
                          onChange={(e) => onChangeAutoStreamRandomizeSpeed?.(parseFloat(e.target.value))}
                          disabled={disabled}
                          className="w-16 sm:w-20 h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
                          title={`Interval: ${autoStreamRandomizeSpeed < 0.1 ? autoStreamRandomizeSpeed.toFixed(2) : autoStreamRandomizeSpeed} seconds`}
                        />
                        <span className="font-mono font-bold text-purple-400 text-xs w-11 text-center">
                          {autoStreamRandomizeSpeed < 0.1 ? autoStreamRandomizeSpeed.toFixed(2) : autoStreamRandomizeSpeed}s
                        </span>
                      </div>

                      {/* Speed Presets */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { label: '0.1s', speed: 0.1, desc: 'Hyper Chaos' },
                          { label: '0.5s', speed: 0.5, desc: 'Ultra Fast' },
                          { label: '1.0s', speed: 1.0, desc: 'Fast' },
                          { label: '2.0s', speed: 2.0, desc: 'Normal' },
                          { label: '3.5s', speed: 3.5, desc: 'Steady' },
                        ].map((preset) => (
                          <button
                            key={preset.speed}
                            id={`btn-stream-speed-preset-${preset.speed}`}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChangeAutoStreamRandomizeSpeed?.(preset.speed)}
                            className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                              autoStreamRandomizeSpeed === preset.speed
                                ? 'bg-purple-950 text-purple-300 border border-purple-700 font-bold shadow-[0_0_8px_rgba(147,51,234,0.5)]'
                                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                            }`}
                            title={`Set level stream randomize interval to ${preset.label} (${preset.desc})`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corrupt Action 2: Corrupt Visible Screen */}
                <button
                  id="btn-corrupt-screen"
                  type="button"
                  disabled={disabled}
                  onClick={() => onCorruptLiveLevel('screen', corruptIntensity)}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-600 transition-all text-left cursor-pointer group disabled:opacity-50"
                  title="Directly scrambles RAM metatiles ($0500) and PPU nametables so the current screen immediately mutates into random blocks"
                >
                  <div className="p-1.5 rounded-md bg-amber-950 border border-amber-800 text-amber-400 group-hover:text-amber-300 shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-200 group-hover:text-amber-300 flex items-center gap-1">
                      <span>Corrupt Current Screen</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Immediately transforms visible tiles on-screen into random blocks, question marks, and pipes without moving!
                    </p>
                  </div>
                </button>

                {/* Corrupt Action 3: Scramble Enemy Spawner with Auto-Toggle and Speed controls */}
                <div
                  id="corrupt-enemies-card"
                  className={`col-span-1 sm:col-span-2 flex flex-col gap-2.5 p-3 rounded-lg border transition-all ${
                    autoEnemyScramble
                      ? 'bg-red-950/30 border-red-600/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Top Row: Icon, Title, Active Badge, Description, and Manual Trigger Button */}
                  <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-md shrink-0 border transition-colors ${
                          autoEnemyScramble
                            ? 'bg-red-900 border-red-600 text-red-200 animate-pulse'
                            : 'bg-red-950 border-red-800 text-red-400'
                        }`}
                      >
                        <Skull className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-100">
                            Enemy Scramble & Auto Spawns
                          </span>
                          {autoEnemyScramble && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                              <Zap className="w-2.5 h-2.5" /> AUTO ACTIVE ({autoEnemyScrambleSpeed < 0.1 ? autoEnemyScrambleSpeed.toFixed(2) : autoEnemyScrambleSpeed}s)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                          Spawns unexpected enemies throughout the stage: Bowser, Hammer Bros, Bloopers, Flying Koopas, Lakitu & Buzzy Beetles!
                        </p>
                      </div>
                    </div>

                    {/* Manual One-time Trigger Button */}
                    <button
                      id="btn-corrupt-enemies-once"
                      type="button"
                      disabled={disabled}
                      onClick={() => onCorruptLiveLevel('enemies', corruptIntensity)}
                      className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 hover:border-red-600 text-zinc-200 hover:text-red-300 text-[11px] font-medium shrink-0 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      title="Manually trigger enemy scramble once right now"
                    >
                      <Skull className="w-3 h-3 text-red-400" />
                      <span>Scramble Once</span>
                    </button>
                  </div>

                  {/* Bottom Controls Row: Auto Scramble Toggle & Speed Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-850">
                    {/* Auto Scramble Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-300">Auto Scramble:</span>
                      <button
                        id="btn-toggle-auto-enemy-scramble"
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggleAutoEnemyScramble(!autoEnemyScramble)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                          autoEnemyScramble
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                            : 'bg-zinc-850 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 border border-zinc-750'
                        }`}
                        title="Toggle automatic continuous enemy scramble spawns"
                      >
                        <Repeat className={`w-3.5 h-3.5 ${autoEnemyScramble ? 'animate-spin' : ''}`} />
                        <span>{autoEnemyScramble ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    {/* Speed Controls: Slider + Quick Presets */}
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
                      {/* Speed Slider */}
                      <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                        <label htmlFor="auto-scramble-speed-slider" className="text-[10px] text-zinc-400 font-mono">
                          Speed:
                        </label>
                        <input
                          id="auto-scramble-speed-slider"
                          type="range"
                          min="0.01"
                          max="3.0"
                          step="0.01"
                          value={autoEnemyScrambleSpeed}
                          onChange={(e) => onChangeAutoEnemyScrambleSpeed(parseFloat(e.target.value))}
                          disabled={disabled}
                          className="w-16 sm:w-20 h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                          title={`Interval: ${autoEnemyScrambleSpeed < 0.1 ? autoEnemyScrambleSpeed.toFixed(2) : autoEnemyScrambleSpeed} seconds`}
                        />
                        <span className="font-mono font-bold text-red-400 text-xs w-11 text-center">
                          {autoEnemyScrambleSpeed < 0.1 ? autoEnemyScrambleSpeed.toFixed(2) : autoEnemyScrambleSpeed}s
                        </span>
                      </div>

                      {/* Speed Presets */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { label: '0.01s', speed: 0.01, desc: 'Hyper (60 FPS)', hyper: true },
                          { label: '0.05s', speed: 0.05, desc: 'Ultra Fast' },
                          { label: '0.2s', speed: 0.2, desc: 'Frenzy' },
                          { label: '0.5s', speed: 0.5, desc: 'Fast' },
                          { label: '1.5s', speed: 1.5, desc: 'Normal' },
                        ].map((preset) => (
                          <button
                            key={preset.speed}
                            id={`btn-speed-preset-${preset.speed}`}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChangeAutoEnemyScrambleSpeed(preset.speed)}
                            className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                              autoEnemyScrambleSpeed === preset.speed
                                ? 'bg-red-950 text-red-300 border border-red-700 font-bold shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                : preset.hyper
                                  ? 'bg-red-950/40 text-red-400 hover:text-red-200 border border-red-900/60 font-semibold'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                            }`}
                            title={`Set scramble interval to ${preset.label} (${preset.desc})`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corrupt Action 4: Full Chaos Metamorphosis */}
                <button
                  id="btn-corrupt-full"
                  type="button"
                  disabled={disabled}
                  onClick={() => onCorruptLiveLevel('full', corruptIntensity)}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-purple-950/40 hover:bg-purple-950/70 border border-purple-800/80 hover:border-purple-500 transition-all text-left cursor-pointer group disabled:opacity-50 shadow-[0_0_15px_rgba(147,51,234,0.15)]"
                  title="Complete level metamorphosis: scrambles terrain stream, current screen tiles, and enemy spawns simultaneously!"
                >
                  <div className="p-1.5 rounded-md bg-purple-900 border border-purple-600 text-purple-200 shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-purple-200 group-hover:text-white flex items-center gap-1">
                      <span>Full Chaos Metamorphosis</span>
                    </div>
                    <p className="text-[10px] text-purple-300/80 leading-tight">
                      Combines random terrain stream + visible screen tiles + enemy spawner for a total surreal level makeover!
                    </p>
                  </div>
                </button>

                {/* Corrupt Action 5: Garbage Bit & Glitch Corruptor */}
                <button
                  id="btn-corrupt-garbage-panel"
                  type="button"
                  disabled={disabled}
                  onClick={() => (onCorruptGarbage ? onCorruptGarbage() : onCorruptLiveLevel('screen', corruptIntensity))}
                  className="col-span-1 sm:col-span-2 flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-950/30 hover:bg-amber-950/60 border border-amber-800/80 hover:border-amber-500 transition-all text-left cursor-pointer group disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  title="Garbage & Memory Glitch Corruptor: Randomizes bits across VRAM, OAM, and CPU RAM with full glitch power! (Hotkey: H)"
                >
                  <div className="p-1.5 rounded-md bg-amber-900 border border-amber-600 text-amber-200 shrink-0">
                    <Shuffle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-200 group-hover:text-white flex items-center gap-1.5">
                      <span>Garbage & Bit Glitch Corruptor</span>
                      <span className="text-[9px] font-mono bg-amber-400 text-amber-950 px-1 rounded font-bold">
                        [H]
                      </span>
                      <span className="text-[9px] font-mono text-amber-300/80">
                        Power {corruptIntensity}/10 ({corruptIntensity * 25} bits + Glitches)
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-300/80 leading-tight mt-0.5">
                      The power of the glitch things works with the garbage: inverts memory bits, glitched sprites, nametable tiles, and level structures directly into the NES hardware!
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Dual Level Data Merger [Hotkey: M] */}
          {activeTab === 'merger' && (
            <div className="flex flex-col gap-3">
              {/* Header card with hotkey banner */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/80 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-900 border border-indigo-700 text-indigo-200 shrink-0">
                    <GitMerge className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">Dual Level Data Fusion</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-600 text-white shadow-xs">
                        HOTKEY: M
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 leading-relaxed mt-1">
                      Merges two complete level datas at the same time! Fuses upcoming object streams ($E7,$E8), enemy spawners ($E9,$EA), and live screen structures into one hybrid stage without resetting.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-merger-quick-m"
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const wa = parseInt(mergeWorldA, 10) || 1;
                    const la = parseInt(mergeLevelA, 10) || 1;
                    const wb = parseInt(mergeWorldB, 10) || 8;
                    const lb = parseInt(mergeLevelB, 10) || 4;
                    onMergeLevels?.(wa, la, wb, lb, mergeMode);
                  }}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border border-indigo-400 disabled:opacity-50"
                  title="Merge Level A + Level B right now (or press M)"
                >
                  <Sparkles className="w-4 h-4 fill-white/20" />
                  <span>Merge Now [M]</span>
                </button>
              </div>

              {/* Quick Fusion Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1">
                  <span>Iconic Merge Presets:</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                  {[
                    { label: 'Overworld + Castle', wa: 1, la: 1, wb: 8, lb: 4, desc: '1-1 + 8-4 Bowser' },
                    { label: 'Underground + Coral', wa: 1, la: 2, wb: 2, lb: 2, desc: '1-2 + 2-2 Sea' },
                    { label: 'Clouds + Hammer Fortress', wa: 4, la: 1, wb: 8, lb: 3, desc: '4-1 + 8-3 Bro' },
                    { label: 'Night Bridge + Maze', wa: 3, la: 1, wb: 7, lb: 4, desc: '3-1 + 7-4 Castle' },
                    { label: 'Minus World + 8-4', wa: -1, la: 1, wb: 8, lb: 4, desc: 'Void + Castle' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setMergeWorldA(p.wa.toString());
                        setMergeLevelA(p.la.toString());
                        setMergeWorldB(p.wb.toString());
                        setMergeLevelB(p.lb.toString());
                        onMergeLevels?.(p.wa, p.la, p.wb, p.lb, mergeMode);
                      }}
                      className="flex flex-col text-left p-2 rounded-lg bg-zinc-50 hover:bg-indigo-50 border border-zinc-200 hover:border-indigo-300 transition-all cursor-pointer disabled:opacity-50 group"
                    >
                      <span className="text-xs font-bold text-zinc-800 group-hover:text-indigo-900 truncate">
                        {p.label}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 group-hover:text-indigo-700">
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Dual Level Setup Studio */}
              <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-2.5 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
                {/* Stage A */}
                <div className="md:col-span-5 flex flex-col gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      Stage A (Base World)
                    </span>
                    {currentInfo && (
                      <button
                        type="button"
                        onClick={() => {
                          setMergeWorldA(currentInfo.world.toString());
                          setMergeLevelA(currentInfo.level.toString());
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                        title="Set Stage A to current level"
                      >
                        Use Current (W{currentInfo.world}-{currentInfo.level})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-xs font-mono text-zinc-400">World:</label>
                      <input
                        type="number"
                        value={mergeWorldA}
                        onChange={(e) => setMergeWorldA(e.target.value)}
                        className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-center text-zinc-100 bg-zinc-950 border border-zinc-700 rounded focus:border-cyan-500 focus:outline-none"
                        placeholder="1"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs font-mono text-zinc-400">Level:</label>
                      <input
                        type="number"
                        value={mergeLevelA}
                        onChange={(e) => setMergeLevelA(e.target.value)}
                        className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-center text-zinc-100 bg-zinc-950 border border-zinc-700 rounded focus:border-cyan-500 focus:outline-none"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Merge Operator Icon */}
                <div className="md:col-span-1 flex flex-col items-center justify-center">
                  <div className="p-2 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-300 shadow-xs">
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 mt-1">MERGE</span>
                </div>

                {/* Stage B */}
                <div className="md:col-span-5 flex flex-col gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      Stage B (Infused World)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const rW = 1 + Math.floor(Math.random() * 8);
                        const rL = 1 + Math.floor(Math.random() * 4);
                        setMergeWorldB(rW.toString());
                        setMergeLevelB(rL.toString());
                      }}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-mono underline cursor-pointer"
                      title="Pick a random Level B"
                    >
                      🎲 Randomize B
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-xs font-mono text-zinc-400">World:</label>
                      <input
                        type="number"
                        value={mergeWorldB}
                        onChange={(e) => setMergeWorldB(e.target.value)}
                        className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-center text-zinc-100 bg-zinc-950 border border-zinc-700 rounded focus:border-purple-500 focus:outline-none"
                        placeholder="8"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs font-mono text-zinc-400">Level:</label>
                      <input
                        type="number"
                        value={mergeLevelB}
                        onChange={(e) => setMergeLevelB(e.target.value)}
                        className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-center text-zinc-100 bg-zinc-950 border border-zinc-700 rounded focus:border-purple-500 focus:outline-none"
                        placeholder="4"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Mode Selection & Big Execute Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-zinc-700">Merge Mode:</span>
                  {(
                    [
                      { id: 'interleave', label: 'Interleaved Fusion', desc: 'Alternates structures & enemies' },
                      { id: 'overlay', label: 'Layered Overlay', desc: 'Full simultaneous stacking' },
                      { id: 'chaos', label: 'Chaos Morph', desc: 'Surreal dimensional coordinates' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMergeMode(m.id)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                        mergeMode === m.id
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300'
                      }`}
                      title={m.desc}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  id="btn-execute-merge-levels"
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const wa = parseInt(mergeWorldA, 10) || 1;
                    const la = parseInt(mergeLevelA, 10) || 1;
                    const wb = parseInt(mergeWorldB, 10) || 8;
                    const lb = parseInt(mergeLevelB, 10) || 4;
                    onMergeLevels?.(wa, la, wb, lb, mergeMode);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  title="Fuses Stage A and Stage B together now (Hotkey: M)"
                >
                  <GitMerge className="w-4 h-4" />
                  <span>Execute Level Merge [M]</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
