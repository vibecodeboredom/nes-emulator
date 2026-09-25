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
} from 'lucide-react';
import { WorldLevelInfo } from '../types';

interface LiveWorldChangerProps {
  currentInfo: WorldLevelInfo | null;
  onReplaceLevelData: (world: number, level: number) => void;
  onWarp: (world: number, level: number) => void;
  onCorruptLiveLevel: (mode: 'stream' | 'screen' | 'enemies' | 'full', intensity: number) => void;
  autoEnemyScramble: boolean;
  autoEnemyScrambleSpeed: number;
  onToggleAutoEnemyScramble: (enabled: boolean) => void;
  onChangeAutoEnemyScrambleSpeed: (speed: number) => void;
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
  onReplaceLevelData,
  onWarp,
  onCorruptLiveLevel,
  autoEnemyScramble,
  autoEnemyScrambleSpeed,
  onToggleAutoEnemyScramble,
  onChangeAutoEnemyScrambleSpeed,
  disabled = false,
}) => {
  const [worldInput, setWorldInput] = useState<string>('8');
  const [levelInput, setLevelInput] = useState<string>('4');
  const [corruptIntensity, setCorruptIntensity] = useState<number>(5);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'swap_warp' | 'corruptor'>('swap_warp');

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
      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 sm:p-4 text-zinc-100 shadow-md backdrop-blur-xs flex flex-col gap-3 transition-all"
    >
      {/* Header & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-950/80 border border-red-800/80 text-red-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold tracking-wide text-zinc-100 uppercase font-mono">
                Live Level Tools & Corruptor
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-900/40 border border-red-700/60 text-red-300 font-mono font-semibold">
                Mid-Game RAM Mod
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight hidden sm:block">
              Swap level data live, warp cleanly to any world, or corrupt and build levels out of random things mid-game
            </p>
          </div>
        </div>

        {/* Live Detected State Badge & Collapse Toggle */}
        <div className="flex items-center gap-2">
          {currentInfo && (
            <div
              id="current-world-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs font-mono font-bold shadow-xs"
              title={`Active NES Memory: World $075F=${currentInfo.rawWorld}, Area $0760=${currentInfo.rawLevel}, Style=${currentInfo.areaType || 'Unknown'}, AreaPtr=${currentInfo.areaPtr || 'N/A'}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-400 font-normal text-[10px]">Active:</span>
              <span className="text-emerald-400 font-bold">
                W{currentInfo.displayWorld}-{currentInfo.displayLevel}
              </span>
              {currentInfo.areaType && (
                <span className="text-[10px] text-zinc-400 border-l border-zinc-800 pl-1.5 hidden md:inline">
                  {currentInfo.areaType}
                </span>
              )}
            </div>
          )}

          <button
            id="btn-toggle-world-changer"
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-md transition-colors"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Sub Navigation: Level Replacer / Warp vs Live Level Corruptor */}
          <div className="flex items-center gap-1 border-b border-zinc-800 pb-2">
            <button
              id="tab-swap-warp"
              type="button"
              onClick={() => setActiveTab('swap_warp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'swap_warp'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-red-400" />
              <span>Level Data Replacer & Warp</span>
            </button>

            <button
              id="tab-level-corruptor"
              type="button"
              onClick={() => setActiveTab('corruptor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'corruptor'
                  ? 'bg-purple-950/80 text-purple-200 border border-purple-800 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>Live Level Corruptor</span>
              {autoEnemyScramble ? (
                <span className="px-1.5 py-0.5 rounded bg-red-900 text-red-200 font-mono text-[9px] font-bold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  Auto Enemies ({autoEnemyScrambleSpeed < 0.1 ? autoEnemyScrambleSpeed.toFixed(2) : autoEnemyScrambleSpeed}s)
                </span>
              ) : (
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 font-mono">
                  Randomizer
                </span>
              )}
            </button>
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
                {/* Corrupt Action 1: Randomize Level Stream */}
                <button
                  id="btn-corrupt-stream"
                  type="button"
                  disabled={disabled}
                  onClick={() => onCorruptLiveLevel('stream', corruptIntensity)}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-purple-600 transition-all text-left cursor-pointer group disabled:opacity-50"
                  title="Randomize upcoming SMB1 objects in level stream ($E7,$E8) so Mario encounters random mystery structures as he walks"
                >
                  <div className="p-1.5 rounded-md bg-purple-950 border border-purple-800 text-purple-400 group-hover:text-purple-300 shrink-0">
                    <Dice5 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-200 group-hover:text-purple-300 flex items-center gap-1">
                      <span>Randomize Level Stream</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Builds upcoming terrain with random mystery blocks, pipes, springs, staircases & platforms as you walk!
                    </p>
                  </div>
                </button>

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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
