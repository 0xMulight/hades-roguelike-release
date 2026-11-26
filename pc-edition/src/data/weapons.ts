import { WeaponId } from '../state/save';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  title: string;
  spriteKey: string;
  accentColor: number;
  attackDesc: string;
  specialDesc: string;
  baseDamage: number;
  attackCooldownMs: number;
  specialCooldownMs: number;
  range: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword: {
    id: 'sword',
    name: '冥界魔剑',
    title: '冥王之刃 · 斯提克斯',
    spriteKey: 'wpn_sword',
    accentColor: 0xff5252,
    attackDesc: '按住左键极速自动三连斩，第3击大范围重劈击飞',
    specialDesc: '右键震地新星；冲刺+右键瞬发穿透全场的「完美居合·一闪」',
    baseDamage: 25,
    attackCooldownMs: 205,
    specialCooldownMs: 780,
    range: 98,
  },
  bow: {
    id: 'bow',
    name: '追魂神弓',
    title: '寻心魔弓 · 科罗纳斯',
    spriteKey: 'wpn_bow',
    accentColor: 0x4dd0e1,
    attackDesc: '按住左键全自动高速连射穿透灵箭',
    specialDesc: '右键扇形箭雨；冲刺+右键瞬发破盾必暴「黄金穿心神箭」',
    baseDamage: 26,
    attackCooldownMs: 240,
    specialCooldownMs: 720,
    range: 540,
  },
  blades: {
    id: 'blades',
    name: '暗影双刃',
    title: '双生利爪 · 玛尔福斯',
    spriteKey: 'wpn_blades',
    accentColor: 0xce93d8,
    attackDesc: '按住左键狂暴全自动双刃连刺并伴随突进',
    specialDesc: '右键回旋飞刃；冲刺+右键瞬发锁敌突袭「飞雷神影袭」',
    baseDamage: 16,
    attackCooldownMs: 120,
    specialCooldownMs: 650,
    range: 82,
  },
};

export type HammerId =
  | 'sword_wave'
  | 'sword_whirl'
  | 'sword_lunge'
  | 'bow_burst'
  | 'bow_explosive'
  | 'bow_ricochet'
  | 'blades_fan'
  | 'blades_shadowstep'
  | 'blades_flurry';

export interface HammerDef {
  id: HammerId;
  weapon: WeaponId;
  icon: string;
  name: string;
  desc: string;
}

export const HAMMERS: HammerDef[] = [
  // Sword
  {
    id: 'sword_wave',
    weapon: 'sword',
    icon: '🔨',
    name: '剑气纵横',
    desc: '魔剑每次普攻挥砍时额外向前发射一道穿透月牙剑气波（造成 65% 普攻伤害）。',
  },
  {
    id: 'sword_whirl',
    weapon: 'sword',
    icon: '🔨',
    name: '嗜血旋风',
    desc: '第 3 段重劈进化为 360° 狂暴旋风斩，且重劈每命中一名敌人为你恢复 2 点生命！',
  },
  {
    id: 'sword_lunge',
    weapon: 'sword',
    icon: '🔨',
    name: '瞬影十字突',
    desc: '冲刺斩突进距离翻倍、必定暴击，且对敌人造成双倍黄色架势条削韧！',
  },
  // Bow
  {
    id: 'bow_burst',
    weapon: 'bow',
    icon: '🔨',
    name: '连珠疾射',
    desc: '神弓左键普攻每次同时射出 2 支平行追魂灵箭，总火力瞬间质变！',
  },
  {
    id: 'bow_explosive',
    weapon: 'bow',
    icon: '🔨',
    name: '爆裂魔矢',
    desc: '普攻灵箭命中敌人时引发火焰魔法爆裂，造成 65% 范围溅射伤害与强力削韧。',
  },
  {
    id: 'bow_ricochet',
    weapon: 'bow',
    icon: '🔨',
    name: '漫天弹射箭阵',
    desc: '右键特殊技齐射箭矢增至 7 支，且所有灵箭碰墙后可弹射一次！',
  },
  // Blades
  {
    id: 'blades_fan',
    weapon: 'blades',
    icon: '🔨',
    name: '千刃回旋',
    desc: '右键特殊技不再只丢 1 把，而是扇形同时掷出 3 把来回切割的回旋飞刃！',
  },
  {
    id: 'blades_shadowstep',
    weapon: 'blades',
    icon: '🔨',
    name: '鬼影瞬步',
    desc: '冲刺时若 200 范围内有敌人，自动闪现到目标背后，且下一击必定背刺暴击！',
  },
  {
    id: 'blades_flurry',
    weapon: 'blades',
    icon: '🔨',
    name: '幻影乱舞',
    desc: '双刃第 3 段连击自动向四周卷起一圈暗影剑舞，高频削减周围敌人的架势条。',
  },
];

export function rollHammerChoices(weapon: WeaponId, ownedIds: Set<HammerId>): HammerDef[] {
  const pool = HAMMERS.filter((h) => h.weapon === weapon && !ownedIds.has(h.id));
  if (pool.length > 0) return pool.slice(0, 3);
  return HAMMERS.filter((h) => h.weapon === weapon).slice(0, 3);
}

export const ASPECT_UNLOCK_COST = 35;

export interface WeaponAspectDef {
  level: 1 | 2;
  name: string;
  tagline: string;
  desc: string;
  accentHex: string;
}

export const WEAPON_ASPECTS: Record<WeaponId, [WeaponAspectDef, WeaponAspectDef]> = {
  sword: [
    {
      level: 1,
      name: '斯提克斯形态',
      tagline: '均衡冥王剑术 · 冲刺+右键瞬发居合拔刀闪',
      desc: '标准三段斩与震地波，冲刺途中按右键可零读条瞬发穿透全场的「完美居合·一闪」。',
      accentHex: '#ff5252',
    },
    {
      level: 2,
      name: '涅墨西斯 · 复仇形态',
      tagline: '弹反复仇狂热 · 范围暴击强化',
      desc: '斩击范围 +25%、基础暴击率 +20%；每次精准弹反后 3.5 秒内普攻必定暴击且每刀回复 2 点生命！',
      accentHex: '#ffd54f',
    },
  ],
  bow: [
    {
      level: 1,
      name: '科罗纳斯形态',
      tagline: '穿心重箭 · 冲刺+右键瞬发强力射击',
      desc: '按住左键极速连射；冲刺途中按右键瞬发必暴击、无视护盾的「黄金穿心神箭」。',
      accentHex: '#4dd0e1',
    },
    {
      level: 2,
      name: '喀戎 · 追魂索命形态',
      tagline: '印记锁定 · 右键箭雨自动追踪',
      desc: '左键普攻命中敌人施加 4 秒「🎯 索命印记」；右键扇形箭雨的所有箭矢将自动弧线追踪印记目标！',
      accentHex: '#80deea',
    },
  ],
  blades: [
    {
      level: 1,
      name: '玛尔福斯形态',
      tagline: '高速暗影连刺 · 冲刺+右键瞬发飞雷神影袭',
      desc: '按住左键狂暴连刺与回旋飞镖；冲刺途中按右键瞬发锁敌突袭的「飞雷神影袭」。',
      accentHex: '#ce93d8',
    },
    {
      level: 2,
      name: '吉尔伽美什 · 恶魔血爪',
      tagline: '额外冲刺 · 撕裂爆血真伤',
      desc: '出战冲刺次数上限额外 +1！普攻与冲刺斩施加「🩸 恶魔裂伤」，1.4 秒后爆发 42 点流血伤害并重创架势。',
      accentHex: '#ff1744',
    },
  ],
};
