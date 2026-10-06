import React, { useRef } from 'react';
import { FolderOpen, Disc, Sparkles } from 'lucide-react';
import { RomInfo } from '../types';

interface GameSelectorProps {
  currentRomId: string;
  romList: RomInfo[];
  onSelectRom: (rom: RomInfo) => void;
  onCustomFileSelected: (file: File) => void;
}

export const GameSelector: React.FC<GameSelectorProps> = ({
  currentRomId,
  romList,
  onSelectRom,
  onCustomFileSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onCustomFileSelected(file);
      e.target.value = '';
    }
  };

  return (
    <div id="game-selector-container" className="w-full max-w-[680px] mx-auto flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
          <Disc className="w-3.5 h-3.5 text-red-600" />
          Game Cartridges
        </span>
        <span className="text-[11px] text-zinc-400 font-mono">NES NROM & MMC3</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {romList.map((rom) => {
          const isSelected = currentRomId === rom.id;
          return (
            <button
              key={rom.id}
              id={`game-select-${rom.id}`}
              type="button"
              onClick={() => onSelectRom(rom)}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                isSelected
                  ? 'bg-red-50/90 border-red-500 shadow-sm ring-1 ring-red-500/30'
                  : 'bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-md bg-red-600" />
              )}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                  isSelected ? 'bg-red-600 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {rom.id === 'smb1' ? (
                  <span className="text-base">🍄</span>
                ) : rom.id === 'mb1' ? (
                  <span className="text-base">🐢</span>
                ) : rom.id === 'famidash' ? (
                  <span className="text-base">⚡</span>
                ) : (
                  <Disc className="w-4 h-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={`text-xs font-bold truncate ${
                    isSelected ? 'text-zinc-950' : 'text-zinc-800'
                  }`}
                >
                  {rom.title}
                </span>
                <span className="text-[11px] text-zinc-500 truncate">
                  {rom.subtitle} &bull; {rom.releaseYear}
                </span>
              </div>
            </button>
          );
        })}

        {/* Load Custom ROM Button */}
        <button
          id="btn-upload-custom-rom"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-dashed border-zinc-300 bg-white hover:bg-zinc-50 hover:border-zinc-400 text-left transition-all text-zinc-600 shadow-xs cursor-pointer"
          title="Open custom .nes ROM from your computer"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate text-zinc-800 flex items-center gap-1">
              Load .NES ROM
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            </span>
            <span className="text-[11px] text-zinc-400 truncate">Select file from device</span>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".nes,application/octet-stream"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
