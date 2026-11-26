export type GodId = 'zeus' | 'ares' | 'demeter' | 'nyx';
export type BoonSlot = 'attack' | 'special' | 'dash' | 'passive' | 'duo';
export type Rarity = 'common' | 'rare' | 'epic' | 'duo';

export interface BoonDef {
  id: string;
  god: GodId;
  godName: string;
  icon: string;
  colorHex: string;
  colorNum: number;
  slot: BoonSlot;
  slotLabel: string;
  name: string;
  baseValue: number;
  duoReqs?: [GodId, GodId];
  descTemplate: (val: number) => string;
}

export interface AcquiredBoon {
  def: BoonDef;
  rarity: Rarity;
  value: number;
}

export const GOD_META: Record<GodId, { name: string; icon: string; colorHex: string; colorNum: number }> = {
  zeus: { name: '雷神·宙斯', icon: '⚡', colorHex: '#ffd54f', colorNum: 0xffd54f },
  ares: { name: '战神·阿瑞斯', icon: '🔥', colorHex: '#ff5252', colorNum: 0xff5252 },
  demeter: { name: '凛冬·德墨忒尔', icon: '❄️', colorHex: '#4dd0e1', colorNum: 0x4dd0e1 },
  nyx: { name: '冥夜·倪克斯', icon: '🩸', colorHex: '#ce93d8', colorNum: 0xce93d8 },
};

export const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0,
  rare: 1.35,
  epic: 1.75,
  duo: 1.0,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  duo: '传奇双神',
};

export const BOONS: BoonDef[] = [
  // ⚡ ZEUS
  {
    id: 'zeus_attack',
    god: 'zeus',
    godName: '雷神·宙斯',
    icon: '⚡',
    colorHex: '#ffd54f',
    colorNum: 0xffd54f,
    slot: 'attack',
    slotLabel: '普攻祝福',
    name: '狂雷极速链',
    baseValue: 18,
    descTemplate: (v) => `攻速狂飙 +22%！每次普攻释放跨屏闪电链，在最多 4~8 名敌人间弹射造成 ${v} 点雷电伤害。`,
  },
  {
    id: 'zeus_special',
    god: 'zeus',
    godName: '雷神·宙斯',
    icon: '⚡',
    colorHex: '#ffd54f',
    colorNum: 0xffd54f,
    slot: 'special',
    slotLabel: '特技祝福',
    name: '天罚雷暴阵',
    baseValue: 28,
    descTemplate: (v) => `特殊技降下九霄落雷造成 ${v} 点伤害，并在命中处生成持续 2.4 秒的「雷暴磁场」高频电击敌群！`,
  },
  {
    id: 'zeus_dash',
    god: 'zeus',
    godName: '雷神·宙斯',
    icon: '⚡',
    colorHex: '#ffd54f',
    colorNum: 0xffd54f,
    slot: 'dash',
    slotLabel: '冲刺祝福',
    name: '奔雷幻电径',
    baseValue: 22,
    descTemplate: (v) => `冲刺瞬间劈出 3 道奔雷（${v} 点伤害），并在起点留下持续电击的「雷暴磁场」！`,
  },
  {
    id: 'zeus_passive',
    god: 'zeus',
    godName: '雷神·宙斯',
    icon: '⚡',
    colorHex: '#ffd54f',
    colorNum: 0xffd54f,
    slot: 'passive',
    slotLabel: '神力被动',
    name: '万钧过载',
    baseValue: 34,
    descTemplate: (v) => `全武器攻速 +15%、大招充能 +45%；且每命中 5 次自动引落一道 ${v} 点伤害的天谴落雷！`,
  },

  // 🔥 ARES
  {
    id: 'ares_attack',
    god: 'ares',
    godName: '战神·阿瑞斯',
    icon: '🔥',
    colorHex: '#ff5252',
    colorNum: 0xff5252,
    slot: 'attack',
    slotLabel: '普攻祝福',
    name: '裂空血轮斩',
    baseValue: 26,
    descTemplate: (v) => `普攻施加厄运巨剑（${v} 点爆炸），且每挥砍 2 次向前发射穿透全场的「旋转血刃轮」持续绞杀路径敌群！`,
  },
  {
    id: 'ares_special',
    god: 'ares',
    godName: '战神·阿瑞斯',
    icon: '🔥',
    colorHex: '#ff5252',
    colorNum: 0xff5252,
    slot: 'special',
    slotLabel: '特技祝福',
    name: '剑狱龙卷',
    baseValue: 24,
    descTemplate: (v) => `特殊技伤害 +25%，并向外扇形发射多道穿透「旋转血刃轮」（每段造成 ${v} 点撕裂伤害）！`,
  },
  {
    id: 'ares_dash',
    god: 'ares',
    godName: '战神·阿瑞斯',
    icon: '🔥',
    colorHex: '#ff5252',
    colorNum: 0xff5252,
    slot: 'dash',
    slotLabel: '冲刺祝福',
    name: '血火绞肉轮',
    baseValue: 18,
    descTemplate: (v) => `冲刺在原地召唤持续旋转 1.8 秒的「血刃旋风阵」，高频切割周围敌人（每段 ${v} 点伤害）！`,
  },
  {
    id: 'ares_passive',
    god: 'ares',
    godName: '战神·阿瑞斯',
    icon: '🔥',
    colorHex: '#ff5252',
    colorNum: 0xff5252,
    slot: 'passive',
    slotLabel: '神力被动',
    name: '连环血爆瘟疫',
    baseValue: 42,
    descTemplate: (v) => `被击杀的敌人发生 145 范围「连环尸爆」（造成 ${v} 点伤害并传染厄运），炸死一只即可连锁引爆整片尸潮！`,
  },

  // ❄️ DEMETER
  {
    id: 'demeter_attack',
    god: 'demeter',
    godName: '凛冬·德墨忒尔',
    icon: '❄️',
    colorHex: '#4dd0e1',
    colorNum: 0x4dd0e1,
    slot: 'attack',
    slotLabel: '普攻祝福',
    name: '极寒巨刃·霜噬',
    baseValue: 22,
    descTemplate: (v) => `刀光/箭矢范围扩大 20%、伤害 +${v}%，且每次普攻直接叠加 2 层寒霜（2 击即触发碎冰爆裂）！`,
  },
  {
    id: 'demeter_special',
    god: 'demeter',
    godName: '凛冬·德墨忒尔',
    icon: '❄️',
    colorHex: '#4dd0e1',
    colorNum: 0x4dd0e1,
    slot: 'special',
    slotLabel: '特技祝福',
    name: '凛冬引力黑洞',
    baseValue: 20,
    descTemplate: (v) => `特殊技在前方生成持续 2.2 秒的「极寒引力黑洞」，强行将周围敌群吸聚到中心并造成 ${v} 点冰霜脉冲伤害！`,
  },
  {
    id: 'demeter_dash',
    god: 'demeter',
    godName: '凛冬·德墨忒尔',
    icon: '❄️',
    colorHex: '#4dd0e1',
    colorNum: 0x4dd0e1,
    slot: 'dash',
    slotLabel: '冲刺祝福',
    name: '冰魄聚拢滑步',
    baseValue: 18,
    descTemplate: (v) => `冲刺在身后留下「极寒引力黑洞」，将追兵强行吸聚成团并造成 ${v} 点冻结伤害！`,
  },
  {
    id: 'demeter_passive',
    god: 'demeter',
    godName: '凛冬·德墨忒尔',
    icon: '❄️',
    colorHex: '#4dd0e1',
    colorNum: 0x4dd0e1,
    slot: 'passive',
    slotLabel: '神力被动',
    name: '万径冰枪爆裂',
    baseValue: 52,
    descTemplate: (v) => `触发「碎冰」时爆发 ${v} 点伤害，并向四周 360° 爆射 6~8 枚穿透「极寒冰枪」连锁冻结全场！`,
  },

  // 🩸 NYX
  {
    id: 'nyx_attack',
    god: 'nyx',
    godName: '冥夜·倪克斯',
    icon: '🩸',
    colorHex: '#ce93d8',
    colorNum: 0xce93d8,
    slot: 'attack',
    slotLabel: '普攻祝福',
    name: '双生暗影分身斩',
    baseValue: 22,
    descTemplate: (v) => `暴击率 +${v}%、攻速 +15%；每次普攻召唤「暗影分身」在 0.08 秒后同步挥出第 2 道幻影刀光/暗箭！`,
  },
  {
    id: 'nyx_special',
    god: 'nyx',
    godName: '冥夜·倪克斯',
    icon: '🩸',
    colorHex: '#ce93d8',
    colorNum: 0xce93d8,
    slot: 'special',
    slotLabel: '特技祝福',
    name: '万剑归宗·追魂剑',
    baseValue: 26,
    descTemplate: (v) => `释放特殊技时自动御使 3~5 柄「冥夜追魂飞剑」全屏索敌穿刺，每柄造成 ${v} 点暗影伤害！`,
  },
  {
    id: 'nyx_dash',
    god: 'nyx',
    godName: '冥夜·倪克斯',
    icon: '🩸',
    colorHex: '#ce93d8',
    colorNum: 0xce93d8,
    slot: 'dash',
    slotLabel: '冲刺祝福',
    name: '瞬影飞剑阵',
    baseValue: 22,
    descTemplate: (v) => `冲刺冷却缩短 22%、冲刺斩 +45%，且每次冲刺自动召唤 2~3 柄「冥夜追魂飞剑」索敌斩杀（${v} 点伤害）！`,
  },
  {
    id: 'nyx_passive',
    god: 'nyx',
    godName: '冥夜·倪克斯',
    icon: '🩸',
    colorHex: '#ce93d8',
    colorNum: 0xce93d8,
    slot: 'passive',
    slotLabel: '神力被动',
    name: '暴击剑灵共鸣',
    baseValue: 28,
    descTemplate: (v) => `杀敌回复 3 点生命；且每次暴击自动凝聚一柄 ${v} 点伤害的「冥夜追魂飞剑」全屏追杀敌人！`,
  },

  // 🌟 DUO BOONS (Synergy Legendary Mutations)
  {
    id: 'duo_zeus_ares',
    god: 'zeus',
    godName: '宙斯 × 阿瑞斯',
    icon: '⚡🔥',
    colorHex: '#ffb300',
    colorNum: 0xffb300,
    slot: 'duo',
    slotLabel: '双神共鸣',
    name: '雷火天劫',
    baseValue: 55,
    duoReqs: ['zeus', 'ares'],
    descTemplate: (v) => `闪电命中带有「厄运」的敌人时立刻引爆厄运巨剑并追加一道 ${v} 点伤害的天谴落雷！`,
  },
  {
    id: 'duo_zeus_demeter',
    god: 'zeus',
    godName: '宙斯 × 德墨忒尔',
    icon: '⚡❄️',
    colorHex: '#80deea',
    colorNum: 0x80deea,
    slot: 'duo',
    slotLabel: '双神共鸣',
    name: '极光磁暴',
    baseValue: 40,
    duoReqs: ['zeus', 'demeter'],
    descTemplate: (v) => `处于「寒霜」下的敌人易伤 +${v}%，且「极寒引力黑洞」会持续劈出连锁闪电！`,
  },
  {
    id: 'duo_ares_nyx',
    god: 'ares',
    godName: '阿瑞斯 × 倪克斯',
    icon: '🔥🩸',
    colorHex: '#ff5252',
    colorNum: 0xff5252,
    slot: 'duo',
    slotLabel: '双神共鸣',
    name: '血刃狂宴',
    baseValue: 28,
    duoReqs: ['ares', 'nyx'],
    descTemplate: (v) => `暴击与处决额外射出「旋转血刃轮」（${v} 点伤害），且「冥夜追魂飞剑」命中会自动施加厄运印记！`,
  },
  {
    id: 'duo_demeter_nyx',
    god: 'demeter',
    godName: '德墨忒尔 × 倪克斯',
    icon: '❄️🩸',
    colorHex: '#b388ff',
    colorNum: 0xb388ff,
    slot: 'duo',
    slotLabel: '双神共鸣',
    name: '永夜冰棺',
    baseValue: 4,
    duoReqs: ['demeter', 'nyx'],
    descTemplate: (v) => `触发「碎冰」时撕开次元裂隙回复 ${v} 点生命，并自动爆射 3 柄「冥夜追魂飞剑」！`,
  },
];

export function rollBoonChoices(
  ownedIds: Set<string>,
  fortuneLevel: number,
  preferredGod?: GodId,
  ownedGods?: Set<GodId>
): Array<{ def: BoonDef; rarity: Rarity; value: number }> {
  const regularBoons = BOONS.filter((b) => b.slot !== 'duo');
  let pool = regularBoons.filter((b) => !ownedIds.has(b.id));
  if (pool.length < 3) {
    pool = [...regularBoons];
  }

  // Check eligible Duo Boons
  const eligibleDuos = ownedGods
    ? BOONS.filter(
        (b) =>
          b.slot === 'duo' &&
          !ownedIds.has(b.id) &&
          b.duoReqs &&
          ownedGods.has(b.duoReqs[0]) &&
          ownedGods.has(b.duoReqs[1])
      )
    : [];

  const picked: BoonDef[] = [];
  if (eligibleDuos.length > 0 && Math.random() < 0.52) {
    picked.push(eligibleDuos[Math.floor(Math.random() * eligibleDuos.length)]);
  }

  const godPool = preferredGod ? pool.filter((b) => b.god === preferredGod) : [];
  if (picked.length === 0 && godPool.length > 0) {
    const first = godPool[Math.floor(Math.random() * godPool.length)];
    picked.push(first);
  }

  const remaining = pool.filter((b) => !picked.includes(b));
  while (picked.length < 3 && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(idx, 1)[0]);
  }

  return picked.map((def) => {
    if (def.slot === 'duo') {
      return { def, rarity: 'duo' as Rarity, value: def.baseValue };
    }
    const rRoll = Math.random() + fortuneLevel * 0.08;
    let rarity: Rarity = 'common';
    if (rRoll > 0.88) rarity = 'epic';
    else if (rRoll > 0.56) rarity = 'rare';
    const value = Math.round(def.baseValue * RARITY_MULT[rarity]);
    return { def, rarity, value };
  });
}
