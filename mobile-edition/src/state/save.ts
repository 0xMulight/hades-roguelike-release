export type WeaponId = 'sword' | 'bow' | 'blades';

export interface MirrorLevels {
  deathDefiance: number; // Max 3: +1 revive at 50% HP per level
  extraDash: number;     // Max 2: +1 dash charge per level
  vitality: number;      // Max 5: +25 max HP per level
  might: number;         // Max 5: +12% all damage per level
  fortune: number;       // Max 4: +15% rare/epic chance & +30 starting gold per level
}

export interface SaveData {
  darkness: number;
  bestChamber: number;
  totalRuns: number;
  selectedWeapon: WeaponId;
  unlockedAspects: Record<WeaponId, boolean>;
  selectedAspects: Record<WeaponId, 1 | 2>;
  mirror: MirrorLevels;
}

const SAVE_KEY = 'hades_endless_mobile_hell3x_v1';

const DEFAULT_SAVE: SaveData = {
  darkness: 60, // Starter Darkness so players can try Mirror upgrades immediately
  bestChamber: 0,
  totalRuns: 0,
  selectedWeapon: 'sword',
  unlockedAspects: { sword: false, bow: false, blades: false },
  selectedAspects: { sword: 1, bow: 1, blades: 1 },
  mirror: {
    deathDefiance: 1,
    extraDash: 0,
    vitality: 0,
    might: 0,
    fortune: 0,
  },
};

export interface MirrorConfigItem {
  key: keyof MirrorLevels;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
}

export const MIRROR_ITEMS: MirrorConfigItem[] = [
  {
    key: 'deathDefiance',
    name: '💀 死里逃生 (Death Defiance)',
    desc: '致命伤时消耗 1 次次数触发金光震退并恢复 50% 生命。每级 +1 次。',
    maxLevel: 3,
    baseCost: 45,
    costStep: 45,
  },
  {
    key: 'extraDash',
    name: '💨 迅影冲刺 (Greater Reflex)',
    desc: '提升连续冲刺上限。每级 +1 次连续冲刺次数（初始 1 次）。',
    maxLevel: 2,
    baseCost: 40,
    costStep: 50,
  },
  {
    key: 'vitality',
    name: '❤️ 冥血体魄 (Thick Skin)',
    desc: '永久提升出战初始最大生命值。每级 +25 生命上限（初始 100）。',
    maxLevel: 5,
    baseCost: 25,
    costStep: 20,
  },
  {
    key: 'might',
    name: '⚔️ 泰坦神力 (Fiery Presence)',
    desc: '永久增强所有武器与祝福造成的伤害。每级 +12% 全伤害。',
    maxLevel: 5,
    baseCost: 30,
    costStep: 25,
  },
  {
    key: 'fortune',
    name: '✨ 神恩眷顾 (Gods Pride)',
    desc: '提升稀有/史诗祝福出现率，并增加出战携带金币。每级 +30 初始金币。',
    maxLevel: 4,
    baseCost: 30,
    costStep: 25,
  },
];

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      darkness: typeof parsed.darkness === 'number' ? parsed.darkness : DEFAULT_SAVE.darkness,
      bestChamber: typeof parsed.bestChamber === 'number' ? parsed.bestChamber : 0,
      totalRuns: typeof parsed.totalRuns === 'number' ? parsed.totalRuns : 0,
      selectedWeapon:
        parsed.selectedWeapon === 'bow' || parsed.selectedWeapon === 'blades'
          ? parsed.selectedWeapon
          : 'sword',
      unlockedAspects: {
        ...DEFAULT_SAVE.unlockedAspects,
        ...(parsed.unlockedAspects ?? {}),
      },
      selectedAspects: {
        ...DEFAULT_SAVE.selectedAspects,
        ...(parsed.selectedAspects ?? {}),
      },
      mirror: {
        ...DEFAULT_SAVE.mirror,
        ...(parsed.mirror ?? {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function getMirrorCost(item: MirrorConfigItem, level: number): number {
  return item.baseCost + level * item.costStep;
}
