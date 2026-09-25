export interface RomInfo {
  id: string;
  title: string;
  subtitle: string;
  releaseYear: number;
  url?: string;
  isCustom?: boolean;
}

export type EmulatorStatus = 'unloaded' | 'loading' | 'running' | 'paused' | 'error';

export interface KeyMapping {
  code: string;
  label: string;
  nesButton: number;
  nesButtonName: string;
}

export interface SaveStateData {
  romId: string;
  romTitle: string;
  timestamp: number;
  screenshotUrl?: string;
  state: any;
}

export interface WorldLevelInfo {
  world: number;
  level: number;
  rawWorld: number;
  rawLevel: number;
  displayWorld: string;
  displayLevel: string;
  areaType?: string;
  areaPtr?: string;
  enemyPtr?: string;
  areaPointerHex?: string;
}

export interface LevelDataReplaceResult {
  success: boolean;
  targetWorld: number;
  targetLevel: number;
  rawWorld: number;
  rawLevel: number;
  areaType: string;
  areaPtr: string;
  enemyPtr: string;
  bytesReplaced: number;
  message: string;
}

export type PowerupType = 'small' | 'super' | 'fire' | 'star';

export interface WarpResult {
  success: boolean;
  world: number;
  level: number;
  rawWorld: number;
  rawLevel: number;
  message: string;
}

export interface LiveLevelCorruptResult {
  success: boolean;
  mode: 'stream' | 'screen' | 'enemies' | 'full';
  objectsModified: number;
  tilesModified: number;
  enemiesModified: number;
  message: string;
}
