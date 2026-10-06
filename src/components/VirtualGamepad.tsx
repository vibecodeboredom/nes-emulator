import React from 'react';
import { NES_BUTTONS } from '../emulator/constants';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface VirtualGamepadProps {
  onButtonDown: (player: number, button: number) => void;
  onButtonUp: (player: number, button: number) => void;
}

export const VirtualGamepad: React.FC<VirtualGamepadProps> = ({
  onButtonDown,
  onButtonUp,
}) => {
  const createButtonHandlers = (nesButton: number) => {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        onButtonDown(1, nesButton);
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        try {
          (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        } catch {
          // ignore
        }
        onButtonUp(1, nesButton);
      },
      onPointerCancel: (e: React.PointerEvent) => {
        onButtonUp(1, nesButton);
      },
    };
  };

  return (
    <div
      id="nes-virtual-controller"
      className="w-full max-w-[680px] mx-auto bg-zinc-900 border-2 border-zinc-300 rounded-2xl p-4 shadow-xl select-none touch-none text-zinc-300"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.8)]" />
          <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase font-mono">
            NES Controller &bull; Player 1
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Touch &bull; Click &bull; Turbo</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-2">
        {/* Left: Classic D-Pad */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          {/* D-Pad Cross Background */}
          <div className="absolute w-32 h-11 bg-zinc-950 rounded-md border border-zinc-800 shadow-inner" />
          <div className="absolute w-11 h-32 bg-zinc-950 rounded-md border border-zinc-800 shadow-inner" />
          {/* Center Circle Hub */}
          <div className="absolute w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 pointer-events-none" />

          {/* Up */}
          <button
            id="pad-up"
            type="button"
            {...createButtonHandlers(NES_BUTTONS.UP)}
            className="absolute top-1 w-11 h-12 bg-zinc-800 hover:bg-zinc-700 active:bg-red-900/60 rounded-t-md flex items-center justify-center text-zinc-300 active:text-white shadow-md transition-colors"
            title="D-Pad Up"
          >
            <ArrowUp className="w-5 h-5 pointer-events-none" />
          </button>

          {/* Down */}
          <button
            id="pad-down"
            type="button"
            {...createButtonHandlers(NES_BUTTONS.DOWN)}
            className="absolute bottom-1 w-11 h-12 bg-zinc-800 hover:bg-zinc-700 active:bg-red-900/60 rounded-b-md flex items-center justify-center text-zinc-300 active:text-white shadow-md transition-colors"
            title="D-Pad Down"
          >
            <ArrowDown className="w-5 h-5 pointer-events-none" />
          </button>

          {/* Left */}
          <button
            id="pad-left"
            type="button"
            {...createButtonHandlers(NES_BUTTONS.LEFT)}
            className="absolute left-1 w-12 h-11 bg-zinc-800 hover:bg-zinc-700 active:bg-red-900/60 rounded-l-md flex items-center justify-center text-zinc-300 active:text-white shadow-md transition-colors"
            title="D-Pad Left"
          >
            <ArrowLeft className="w-5 h-5 pointer-events-none" />
          </button>

          {/* Right */}
          <button
            id="pad-right"
            type="button"
            {...createButtonHandlers(NES_BUTTONS.RIGHT)}
            className="absolute right-1 w-12 h-11 bg-zinc-800 hover:bg-zinc-700 active:bg-red-900/60 rounded-r-md flex items-center justify-center text-zinc-300 active:text-white shadow-md transition-colors"
            title="D-Pad Right"
          >
            <ArrowRight className="w-5 h-5 pointer-events-none" />
          </button>
        </div>

        {/* Center: Select & Start Buttons */}
        <div className="flex flex-col items-center justify-center gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-4 py-3 shadow-inner">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <button
                id="btn-nes-select"
                type="button"
                {...createButtonHandlers(NES_BUTTONS.SELECT)}
                className="w-12 h-4.5 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 rounded-full border border-zinc-600 shadow-sm transition-all"
                title="Select Button"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500/90 font-mono">
                Select
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button
                id="btn-nes-start"
                type="button"
                {...createButtonHandlers(NES_BUTTONS.START)}
                className="w-12 h-4.5 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 rounded-full border border-zinc-600 shadow-sm transition-all"
                title="Start Button"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500/90 font-mono">
                Start
              </span>
            </div>
          </div>
        </div>

        {/* Right: Turbo and Action Buttons (B & A) */}
        <div className="flex flex-col items-center gap-2">
          {/* Turbo Row */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <button
                id="btn-nes-turbo-b"
                type="button"
                {...createButtonHandlers(NES_BUTTONS.TURBO_B)}
                className="w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-red-800 border-2 border-red-700/60 text-red-400 active:text-white font-bold text-xs shadow-md transition-all flex items-center justify-center"
                title="Turbo B"
              >
                TB
              </button>
              <span className="text-[9px] text-zinc-500 uppercase mt-0.5 font-mono">Turbo B</span>
            </div>

            <div className="flex flex-col items-center">
              <button
                id="btn-nes-turbo-a"
                type="button"
                {...createButtonHandlers(NES_BUTTONS.TURBO_A)}
                className="w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-red-800 border-2 border-red-700/60 text-red-400 active:text-white font-bold text-xs shadow-md transition-all flex items-center justify-center"
                title="Turbo A"
              >
                TA
              </button>
              <span className="text-[9px] text-zinc-500 uppercase mt-0.5 font-mono">Turbo A</span>
            </div>
          </div>

          {/* Primary Action Row: B and A (Authentic tilted NES layout) */}
          <div className="flex items-center gap-4 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800">
            <div className="flex flex-col items-center">
              <button
                id="btn-nes-b"
                type="button"
                {...createButtonHandlers(NES_BUTTONS.B)}
                className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-95 text-white font-black text-sm shadow-lg border-2 border-red-400/30 flex items-center justify-center transition-all cursor-pointer"
                title="B Button (Run / Fireball) [L]"
              >
                B
              </button>
              <span className="text-[10px] font-bold text-zinc-400 uppercase mt-1 font-mono">
                Run [L]
              </span>
            </div>

            <div className="flex flex-col items-center">
              <button
                id="btn-nes-a"
                type="button"
                {...createButtonHandlers(NES_BUTTONS.A)}
                className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-95 text-white font-black text-sm shadow-lg border-2 border-red-400/30 flex items-center justify-center transition-all cursor-pointer"
                title="A Button (Jump) [;]"
              >
                A
              </button>
              <span className="text-[10px] font-bold text-zinc-400 uppercase mt-1 font-mono">
                Jump [;]
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
