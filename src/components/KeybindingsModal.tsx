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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        id="keybindings-modal-content"
        className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xl text-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-sm tracking-wide text-zinc-900">Controls & Controller Guide</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Keyboard Layout Grid */}
          <div>
            <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[11px] block mb-2">
              Keyboard Controls (Player 1)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Quick Reset (Reload Game)</span>
                <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  J
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">D-Pad / Movement</span>
                <span className="font-mono font-bold text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  Arrows / WASD
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">A Button (Jump)</span>
                <span className="font-mono font-bold text-red-600 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  ; (Semicolon) or X
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">B Button (Run / Fire)</span>
                <span className="font-mono font-bold text-red-600 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  L or Z
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">START Button</span>
                <span className="font-mono font-bold text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  Enter
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">SELECT Button</span>
                <span className="font-mono font-bold text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  Right Shift / Space
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Turbo B / Turbo A</span>
                <span className="font-mono font-bold text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  C / V
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Quick Save State</span>
                <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  F5 or [
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Quick Load State</span>
                <span className="font-mono font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  F8 or ]
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Glitch Corruptor</span>
                <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  G or F7
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Garbage Corruptor</span>
                <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  H
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Infinite Jump / Air Boost</span>
                <span className="font-mono font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  K
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Speedhack Faster / Slower</span>
                <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  + / -
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Speedhack Reset Normal (1.0x)</span>
                <span className="font-mono font-bold text-zinc-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  \ or 0
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Powerup Changer</span>
                <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  Small / Super / Fire / Star
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Dual Level Data Merger</span>
                <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  M
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Warp to Random Level</span>
                <span className="font-mono font-bold text-cyan-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  T
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Add Flag (+5 Blocks in Front)</span>
                <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  F
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Add Hammer (+5 Blocks in Front)</span>
                <span className="font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  U
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Level Warp & Data Replacer</span>
                <span className="font-mono font-bold text-red-600 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  Warp or Memory Injection
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-600">Auto Randomize Stream & Enemies</span>
                <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-xs">
                  Live Level Corruptor Panel
                </span>
              </div>
            </div>
          </div>

          {/* Physical Gamepad Support */}
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-emerald-600" />
                Physical Gamepad Status
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                  connectedGamepad
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                {connectedGamepad ? 'Connected' : 'No Controller Detected'}
              </span>
            </div>
            <p className="text-zinc-600 text-[11px] leading-relaxed">
              {connectedGamepad
                ? `Active: ${connectedGamepad}. Plug-and-play ready for Xbox, PlayStation, 8BitDo, and USB NES gamepads.`
                : 'Connect any USB or Bluetooth gamepad (Xbox, PlayStation, 8BitDo, etc.) and press any button to play directly.'}
            </p>
          </div>

          {/* Audio Tip */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
            <Volume2 className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Audio Tip:</strong> Modern browsers pause sound until your first interaction with the page. Clicking anywhere in the emulator or pressing a key un-suspends authentic 8-bit sound!
            </span>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
