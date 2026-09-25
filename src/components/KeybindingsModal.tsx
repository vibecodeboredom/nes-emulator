import React, { useState, useEffect } from 'react';
import { X, Keyboard, Gamepad2, Volume2, Info } from 'lucide-react';

interface KeybindingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeybindingsModal: React.FC<KeybindingsModalProps> = ({ isOpen, onClose }) => {
  const [connectedGamepad, setConnectedGamepad] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const checkGamepad = () => {
      if (typeof navigator.getGamepads === 'function') {
        const pads = navigator.getGamepads();
        const pad = pads[0];
        if (pad) {
          setConnectedGamepad(pad.id || 'Standard Gamepad');
        } else {
          setConnectedGamepad(null);
        }
      }
    };

    checkGamepad();
    const interval = setInterval(checkGamepad, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="keybindings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        id="keybindings-modal-content"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-sm tracking-wide text-zinc-100">Controls & Controller Guide</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Keyboard Layout Grid */}
          <div>
            <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[11px] block mb-2">
              Keyboard Controls (Player 1)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">D-Pad / Movement</span>
                <span className="font-mono font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Arrows / WASD
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">A Button (Jump)</span>
                <span className="font-mono font-bold text-red-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  ' (Quote) or X
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">B Button (Run / Fire)</span>
                <span className="font-mono font-bold text-red-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  ; (Semicolon) or Z
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">START Button</span>
                <span className="font-mono font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Enter
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">SELECT Button</span>
                <span className="font-mono font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Right Shift / Space
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Turbo B / Turbo A</span>
                <span className="font-mono font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  C / V
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Quick Save State</span>
                <span className="font-mono font-bold text-amber-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  F5 or [
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Quick Load State</span>
                <span className="font-mono font-bold text-sky-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  F8 or ]
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Glitch Corruptor</span>
                <span className="font-mono font-bold text-purple-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  G or F7
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Garbage Corruptor (80 bits)</span>
                <span className="font-mono font-bold text-amber-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  H
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Infinite Jump / Mid-Air Boost</span>
                <span className="font-mono font-bold text-sky-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  J
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Powerup Changer</span>
                <span className="font-mono font-bold text-amber-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Small / Super / Fire / Star
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Level Warp & Data Replacer</span>
                <span className="font-mono font-bold text-red-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Warp or Memory Injection
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-zinc-400">Live Level Corruptor</span>
                <span className="font-mono font-bold text-purple-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Stream / Screen / Enemies / Chaos
                </span>
              </div>
            </div>
          </div>

          {/* Physical Gamepad Support */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                Physical Gamepad Status
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                  connectedGamepad
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {connectedGamepad ? 'Connected' : 'No Controller Detected'}
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {connectedGamepad
                ? `Active: ${connectedGamepad}. Plug-and-play ready for Xbox, PlayStation, 8BitDo, and USB NES gamepads.`
                : 'Connect any USB or Bluetooth gamepad (Xbox, PlayStation, 8BitDo, etc.) and press any button to play directly.'}
            </p>
          </div>

          {/* Audio Tip */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-amber-200/90 text-[11px]">
            <Volume2 className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Audio Tip:</strong> Modern browsers pause sound until your first interaction with the page. Clicking anywhere in the emulator or pressing a key un-suspends authentic 8-bit sound!
            </span>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
