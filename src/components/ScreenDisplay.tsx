import React, { useRef, useEffect } from 'react';
import { Play, Upload, Maximize2, Minimize2, Tv } from 'lucide-react';
import { EmulatorStatus } from '../types';

interface ScreenDisplayProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: EmulatorStatus;
  scanlinesEnabled: boolean;
  isFullscreen: boolean;
  fps: number;
  currentGameTitle: string;
  onTogglePause: () => void;
  onToggleFullscreen: () => void;
  onFileDrop: (file: File) => void;
}

export const ScreenDisplay: React.FC<ScreenDisplayProps> = ({
  canvasRef,
  status,
  scanlinesEnabled,
  isFullscreen,
  fps,
  currentGameTitle,
  onTogglePause,
  onToggleFullscreen,
  onFileDrop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.nes') || file.type.includes('octet-stream')) {
        onFileDrop(file);
      }
    }
  };

  return (
    <div
      id="nes-screen-container"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative mx-auto flex flex-col items-center justify-center rounded-xl bg-zinc-950 p-2 sm:p-3.5 shadow-2xl border border-zinc-800 transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen max-w-none rounded-none p-4'
          : 'w-full max-w-[680px]'
      }`}
    >
      {/* Upper Bezel with Game Title & Status Indicators */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 mb-2 bg-zinc-900/90 rounded-lg border border-zinc-800 text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2 truncate">
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              status === 'running'
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                : status === 'paused'
                ? 'bg-amber-500'
                : 'bg-zinc-600'
            }`}
          />
          <span className="font-semibold text-zinc-200 truncate">{currentGameTitle}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            {fps > 0 ? `${fps} FPS` : '60 FPS'}
          </span>
          <button
            id="fullscreen-toggle-btn"
            type="button"
            onClick={onToggleFullscreen}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded hover:bg-zinc-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Screen Frame & Canvas Area */}
      <div className="relative w-full aspect-[256/240] max-h-[75vh] flex items-center justify-center bg-black rounded-lg overflow-hidden border-2 border-zinc-800 shadow-inner group">
        <canvas
          id="nes-canvas"
          ref={canvasRef}
          width={256}
          height={240}
          className="w-full h-full object-contain cursor-pointer select-none"
          style={{
            imageRendering: 'pixelated',
          }}
          onClick={onTogglePause}
        />

        {/* Scanlines Effect Overlay */}
        {scanlinesEnabled && (
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-30 mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.9) 0px, rgba(0, 0, 0, 0.9) 1px, transparent 1px, transparent 2px)',
              backgroundSize: '100% 2px',
            }}
          />
        )}

        {/* Vignette & CRT Screen Curvature Simulation */}
        <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_24px_rgba(0,0,0,0.85)]" />

        {/* Pause Overlay */}
        {status === 'paused' && (
          <div
            onClick={onTogglePause}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs cursor-pointer select-none"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-600 text-white shadow-xl hover:scale-105 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <span className="mt-3 text-sm font-semibold tracking-wider text-zinc-100 uppercase bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-700">
              Paused (Click to Resume)
            </span>
          </div>
        )}

        {/* Drag and drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 border-2 border-dashed border-red-500 rounded-lg">
            <Upload className="w-12 h-12 text-red-400 animate-bounce mb-2" />
            <p className="text-sm font-semibold text-zinc-200">Drop your .NES ROM file here to play</p>
          </div>
        )}
      </div>

      {/* Subtle Hint Bar under screen */}
      <div className="w-full flex items-center justify-between px-2 pt-2 text-[11px] text-zinc-500 font-mono">
        <span className="hidden sm:inline">D-Pad: Arrows/WASD &bull; Jump: X &bull; Run: Z &bull; Start: Enter</span>
        <span className="sm:hidden">Tap virtual gamepad below</span>
        <span className="flex items-center gap-1.5">
          <Tv className="w-3 h-3" />
          Native NES 256&times;240
        </span>
      </div>
    </div>
  );
};
