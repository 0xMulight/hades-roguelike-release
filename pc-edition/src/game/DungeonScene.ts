import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { bgm } from '../audio/bgm';
import {
  AcquiredBoon,
  BOONS,
  BoonDef,
  GOD_META,
  GodId,
  Rarity,
  rollBoonChoices,
} from '../data/boons';
import {
  ASPECT_UNLOCK_COST,
  HammerDef,
  HammerId,
  rollHammerChoices,
  WEAPON_ASPECTS,
  WEAPONS,
} from '../data/weapons';
import {
  getMirrorCost,
  loadSave,
  MIRROR_ITEMS,
  SaveData,
  WeaponId,
  writeSave,
} from '../state/save';
import { OverlayUI } from '../ui/OverlayUI';
import { CombatVFX } from '../vfx/CombatVFX';
import { DIFFICULTY } from '../data/difficulty';

const TILE = 48;
const ROOM_W = 22;
const ROOM_H = 14;
const ARENA_W = ROOM_W * TILE;
const ARENA_H = ROOM_H * TILE;
const HERO_SCALE = 0.7;

type ArenaLayout = 'sanctum' | 'crucible' | 'abyss_bridge';
type EliteAffix = 'teleporter' | 'molten_link' | 'splitter';

type RoomRewardType =
  | { kind: 'boon'; god: GodId; label: string; color: number }
  | { kind: 'hammer'; label: string; color: number }
  | { kind: 'gold'; label: string; color: number }
  | { kind: 'maxhp'; label: string; color: number }
  | { kind: 'heal'; label: string; color: number }
  | { kind: 'shop'; label: string; color: number }
  | { kind: 'boss'; label: string; color: number };

interface EnemyEntity {
  id: number;
  kind: 'ghoul' | 'skeleton' | 'imp' | 'ice' | 'necro' | 'boss' | 'dummy' | 'totem';
  isElite: boolean;
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow?: Phaser.GameObjects.Image;
  baseScale: number;
  idleAnim: string;
  runAnim: string;
  atkAnim: string;
  hpBarYOff: number;
  animLockUntil: number;
  hp: number;
  maxHp: number;
  armorHp: number;
  maxArmorHp: number;
  affixes: EliteAffix[];
  armorLabel?: Phaser.GameObjects.Text;
  teleportCdUntil: number;
  moltenCdUntil: number;
  chironMarkUntil: number;
  isMinion?: boolean;
  maimTimer: number;
  maimDmg: number;
  markVisual?: Phaser.GameObjects.Image;
  posture: number;
  maxPosture: number;
  postureDecayAt: number;
  brokenUntil: number;
  speed: number;
  damage: number;
  facingAngle: number;
  aiState: 'chase' | 'windup' | 'strike' | 'recover';
  aiTimer: number;
  lockedAngle: number;
  leapTarget?: { x: number; y: number };
  jumpReticle?: Phaser.GameObjects.Arc;
  laserG?: Phaser.GameObjects.Graphics;
  frontShield?: Phaser.GameObjects.Image;
  execMark?: Phaser.GameObjects.Image;
  chillStacks: number;
  chillUntil: number;
  duoBoltCd: number;
  doomTimer: number;
  doomDamage: number;
  doomColor: number;
  doomRarity?: Rarity;
  bossCycle: number;
  bossMidSummoned?: boolean;
  bossEnraged: boolean;
  hpBarBg?: Phaser.GameObjects.Rectangle;
  hpBarFill?: Phaser.GameObjects.Rectangle;
  armorBarBg?: Phaser.GameObjects.Rectangle;
  armorBarFill?: Phaser.GameObjects.Rectangle;
  postureBarBg?: Phaser.GameObjects.Rectangle;
  postureBarFill?: Phaser.GameObjects.Rectangle;
  aura?: Phaser.GameObjects.Image;
  doomSigil?: Phaser.GameObjects.Image;
  chillBase?: Phaser.GameObjects.Image;
}

interface HazardZone {
  kind: 'zeus_storm' | 'ares_vortex' | 'demeter_vortex';
  x: number;
  y: number;
  radius: number;
  damage: number;
  rarity: Rarity;
  lifeMs: number;
  tickCd: number;
  tickInterval: number;
  ringObj: Phaser.GameObjects.Image;
  coreObj: Phaser.GameObjects.Image;
}

interface PlayerProjectile {
  sprite: Phaser.Physics.Arcade.Image;
  vx: number;
  vy: number;
  damage: number;
  postureDmg: number;
  source: 'attack' | 'special' | 'proc';
  pierce: number;
  bouncesLeft: number;
  explosive?: boolean;
  homingTargetId?: number;
  bypassShield?: boolean;
  isBladeWheel?: boolean;
  rehitCd?: number;
  isSoulSword?: boolean;
  isFrostLance?: boolean;
  hitIds: Set<number>;
  lifeMs: number;
  trailCd: number;
  boomerang?: boolean;
  returning?: boolean;
  spinSpeed?: number;
}

interface EnemyProjectile {
  sprite: Phaser.Physics.Arcade.Image;
  vx: number;
  vy: number;
  damage: number;
  lifeMs: number;
  trailCd: number;
  practiceOnly?: boolean;
}

interface ExplosiveBarrel {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  triggered: boolean;
}

interface AbyssPit {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SpikeTrap {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  phase: 'idle' | 'warn' | 'active';
  timer: number;
}

interface Interactable {
  x: number;
  y: number;
  radius: number;
  label: string;
  sprite: Phaser.GameObjects.GameObject;
  text: Phaser.GameObjects.Text;
  onTrigger: () => void;
  autoTrigger?: boolean;
  consumed?: boolean;
}

interface AmbientMote {
  obj: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  baseAlpha: number;
}

export class DungeonScene extends Phaser.Scene {
  private ui!: OverlayUI;
  private vfx!: CombatVFX;
  private save!: SaveData;

  // Player & Controls
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerShadow!: Phaser.GameObjects.Image;
  private playerHalo!: Phaser.GameObjects.Image;
  private playerRuneRing!: Phaser.GameObjects.Image;
  private parryShieldVisual!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private autoAim = false;
  private auraTickTimer = 0;
  private hubTrialIndex = 0;
  private hubTrialActive = false;

  // Run Stats
  private chamber = 0; // 0 = Sanctuary Hub, 1..8 Boutique Chapter, 9+ Endless
  private hp = 100;
  private maxHp = 100;
  private wrath = 0;
  private gold = 0;
  private runDarkness = 0;
  private kills = 0;
  private revivesLeft = 1;
  private maxRevives = 1;
  private boons: Map<string, AcquiredBoon> = new Map();
  private hammers: Map<HammerId, HammerDef> = new Map();

  // Combat state
  private comboStep = 0;
  private bladesFlurryCounter = 0;
  private guaranteedNextCrit = false;
  private attackCdUntil = 0;
  private specialCdUntil = 0;
  private dashCharges = 1;
  private maxDashCharges = 1;
  private dashRechargeAt = 0;
  private dashingUntil = 0;
  private dashDir = new Phaser.Math.Vector2(1, 0);
  private parryWindowUntil = 0;
  private parryCdUntil = 0;
  private parrySucceededThisWindow = false;
  private lastDashAt = 0;
  private phantomDodgeCdUntil = 0;
  private styleScore = 0;
  private comboCount = 0;
  private styleFreezeUntil = 0;
  private afterimageTick = 0;
  private lastKillPos = { x: ARENA_W / 2, y: ARENA_H / 2 };
  private nemesisBuffUntil = 0;
  private chironMarkedId = 0;
  private chironMarkUntil = 0;
  private invulnUntil = 0;
  private hitstopRealUntil = 0;
  private slowMoRealUntil = 0;
  private playerAnimLockUntil = 0;
  private heldCodes: Set<string> = new Set();
  private pillarCenters: Array<{ x: number; y: number; r: number }> = [];
  private roomToken = 0;
  private waveWatchdogTimer = 0;
  private hudDirty = false;
  private activeFloatTexts = 0;
  private lastCamPunchAt = 0;

  // Room state
  private roomGroup!: Phaser.GameObjects.Group;
  private pillars!: Phaser.Physics.Arcade.StaticGroup;
  private pillarVisuals: Phaser.GameObjects.Image[] = [];
  private ambientMotes: AmbientMote[] = [];
  private pits: AbyssPit[] = [];
  private barrels: ExplosiveBarrel[] = [];
  private wardG?: Phaser.GameObjects.Graphics;
  private moltenG?: Phaser.GameObjects.Graphics;
  private enemies: EnemyEntity[] = [];
  private enemyIdSeq = 1;
  private playerProjectiles: PlayerProjectile[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];
  private hazardZones: HazardZone[] = [];
  private zeusOverloadCounter = 0;
  private aresWheelCounter = 0;
  private lastCritSwordAt = 0;
  private chillShatterDepth = 0;
  private lastStormZoneAt = 0;
  private spikes: SpikeTrap[] = [];
  private interactables: Interactable[] = [];
  private currentReward: RoomRewardType = { kind: 'boon', god: 'zeus', label: '⚡ 宙斯祝福', color: 0xffd54f };
  private roomCleared = true;
  private rewardSpawned = false;
  private doorsOpened = false;
  private wavesRemaining = 0;
  private waveSpawning = false;
  private lastInteractAt = 0;
  private isDead = false;
  private activePrompt: string | null = null;
  private hudSyncTimer = 0;

  constructor() {
    super('DungeonScene');
  }

  create() {
    this.save = loadSave();
    this.input.mouse?.disableContextMenu();

    const uiRoot = document.getElementById('ui-layer')!;
    this.ui = new OverlayUI(uiRoot, {
      onToggleAutoAim: () => {
        this.autoAim = !this.autoAim;
        this.syncHud(true);
        return this.autoAim;
      },
      onToggleMute: () => {
        const m = sfx.toggleMute();
        this.syncHud(true);
        return m;
      },
      onOpenMirrorShortcut: () => {
        if (this.chamber === 0 && !this.ui.hasModal()) {
          this.openMirror();
        }
      },
    });

    this.roomGroup = this.add.group();
    this.pillars = this.physics.add.staticGroup();
    this.vfx = new CombatVFX(this);
    this.cameras.main.postFX?.addBloom(0xffffff, 1, 1, 1.08, 0.24);

    this.setupInputs();
    this.setupPlayer();
    this.loadHub();
  }

  private getHeroAnimPrefix(): string {
    if (this.save.selectedWeapon === 'bow') return 'hero_bow';
    if (this.save.selectedWeapon === 'blades') return 'hero_blades';
    return 'hero_sword';
  }

  private setupInputs() {
    const kb = this.input.keyboard!;
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      E: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      Q: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      F: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      R: kb.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      SPACE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      SHIFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      ESC: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      bgm.startIfNeeded();
      if (this.ui.hasModal() || this.isDead) return;
      if (ptr.rightButtonDown()) {
        this.performSpecial();
      } else if (ptr.leftButtonDown()) {
        this.triggerPrimaryAction();
      }
    });

    this.keys.SPACE.on('down', () => {
      bgm.startIfNeeded();
      if (!this.ui.hasModal() && !this.isDead) this.performDash();
    });
    this.keys.SHIFT.on('down', () => {
      bgm.startIfNeeded();
      if (!this.ui.hasModal() && !this.isDead) this.performDash();
    });
    this.keys.Q.on('down', () => {
      bgm.startIfNeeded();
      if (!this.ui.hasModal() && !this.isDead) this.performGodCall();
    });
    this.keys.F.on('down', () => {
      bgm.startIfNeeded();
      if (!this.ui.hasModal() && !this.isDead) this.performParry();
    });
    this.keys.R.on('down', () => {
      bgm.startIfNeeded();
      if (!this.ui.hasModal() && !this.isDead) this.performParry();
    });
    this.keys.E.on('down', () => {
      bgm.startIfNeeded();
      if (!this.ui.hasModal() && !this.isDead) this.tryManualInteract();
    });
    this.keys.ESC.on('down', () => {
      if (this.ui.hasModal() && this.chamber === 0) {
        this.ui.clearModal();
      }
    });

    // IME-immune physical key listener (ev.code works even when Chinese IME sends keyCode 229!)
    const onWinKeyDown = (ev: KeyboardEvent) => {
      if (
        ev.code === 'Space' ||
        ev.code === 'ArrowUp' ||
        ev.code === 'ArrowDown' ||
        ev.code === 'ArrowLeft' ||
        ev.code === 'ArrowRight'
      ) {
        ev.preventDefault();
      }
      this.heldCodes.add(ev.code);
      if (ev.repeat) return;
      bgm.startIfNeeded();
      if (ev.code === 'Escape') {
        if (this.ui.hasModal() && this.chamber === 0) {
          this.ui.clearModal();
        }
        return;
      }
      if (this.ui.hasModal() || this.isDead) return;
      if (ev.code === 'Space' || ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') {
        if (ev.keyCode === 229) this.performDash();
      } else if (ev.code === 'KeyQ') {
        if (ev.keyCode === 229) this.performGodCall();
      } else if (ev.code === 'KeyF' || ev.code === 'KeyR') {
        if (ev.keyCode === 229) this.performParry();
      } else if (ev.code === 'KeyE') {
        if (ev.keyCode === 229) this.tryManualInteract();
      }
    };
    const onWinKeyUp = (ev: KeyboardEvent) => {
      this.heldCodes.delete(ev.code);
    };
    const onWinBlur = () => {
      this.heldCodes.clear();
    };
    const onVisChange = () => {
      if (document.hidden) this.heldCodes.clear();
    };
    window.addEventListener('keydown', onWinKeyDown, { passive: false });
    window.addEventListener('keyup', onWinKeyUp);
    window.addEventListener('blur', onWinBlur);
    document.addEventListener('visibilitychange', onVisChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onWinKeyDown);
      window.removeEventListener('keyup', onWinKeyUp);
      window.removeEventListener('blur', onWinBlur);
      document.removeEventListener('visibilitychange', onVisChange);
    });
  }

  private setupPlayer() {
    const startX = ARENA_W / 2;
    const startY = ARENA_H - 130;
    const prefix = this.getHeroAnimPrefix();

    this.playerShadow = this.add
      .image(startX, startY + 24, 'tex_shadow_oval')
      .setScale(0.68)
      .setAlpha(0.75)
      .setDepth(8);

    this.playerHalo = this.add
      .image(startX, startY + 8, 'tex_circle_glow')
      .setTint(WEAPONS[this.save.selectedWeapon].accentColor)
      .setScale(1.45)
      .setAlpha(0.32)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);

    this.playerRuneRing = this.add
      .image(startX, startY + 20, 'tex_magic_circle')
      .setScale(0.36)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);

    this.player = this.physics.add.sprite(startX, startY, `${prefix}_idle`);
    this.player.setScale(HERO_SCALE);
    this.player.setDepth(10);
    this.player.play(`${prefix}_idle`);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(42, 36);
    body.setOffset(75, 92);
    this.player.setCollideWorldBounds(true);

    this.parryShieldVisual = this.add
      .image(startX, startY, 'tex_parry_shield')
      .setScale(0.92)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19);

    this.physics.world.setBounds(TILE, TILE * 2, ARENA_W - TILE * 2, ARENA_H - TILE * 3);
    this.physics.add.collider(this.player, this.pillars);

    this.cameras.main.setBounds(-140, -100, ARENA_W + 280, ARENA_H + 210);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
  }

  private resetRunStats() {
    this.save = loadSave();
    this.maxHp = 100 + this.save.mirror.vitality * 25;
    this.hp = this.maxHp;
    this.wrath = 0;
    this.gold = this.save.mirror.fortune * 30;
    this.runDarkness = 0;
    this.kills = 0;
    this.maxRevives = this.save.mirror.deathDefiance;
    this.revivesLeft = this.maxRevives;
    this.maxDashCharges = this.computeMaxDashes();
    this.dashCharges = this.maxDashCharges;
    this.boons.clear();
    this.hammers.clear();
    this.hubTrialActive = false;
    this.hubTrialIndex = 0;
    this.parryCdUntil = 0;
    this.parryWindowUntil = 0;
    this.lastDashAt = 0;
    this.phantomDodgeCdUntil = 0;
    this.styleScore = 0;
    this.comboCount = 0;
    this.styleFreezeUntil = 0;
    this.zeusOverloadCounter = 0;
    this.aresWheelCounter = 0;
    this.lastCritSwordAt = 0;
    this.chillShatterDepth = 0;
    this.lastStormZoneAt = 0;
    this.nemesisBuffUntil = 0;
    this.chironMarkedId = 0;
    this.chironMarkUntil = 0;
    this.guaranteedNextCrit = false;
    this.isDead = false;
    this.playerAnimLockUntil = 0;
    this.hitstopRealUntil = 0;
    this.slowMoRealUntil = 0;
    this.heldCodes.clear();
    this.time.timeScale = 1.0;
    const prefix = this.getHeroAnimPrefix();
    this.player.play(`${prefix}_idle`, true);
    this.playerHalo.setTint(WEAPONS[this.save.selectedWeapon].accentColor);
    this.playerRuneRing.setAlpha(0);
    this.parryShieldVisual.setAlpha(0);
  }

  private getAspectLevel(weapon: WeaponId = this.save.selectedWeapon): 1 | 2 {
    if (!this.save.unlockedAspects[weapon]) return 1;
    return this.save.selectedAspects[weapon] === 2 ? 2 : 1;
  }

  private computeMaxDashes(): number {
    const bladesBonus = this.save.selectedWeapon === 'blades' && this.getAspectLevel('blades') === 2 ? 1 : 0;
    return 1 + this.save.mirror.extraDash + bladesBonus;
  }

  private getBoonRarity(id: string): Rarity {
    return this.boons.get(id)?.rarity ?? 'common';
  }

  private getOwnedGods(): Set<GodId> {
    const s = new Set<GodId>();
    for (const b of this.boons.values()) {
      if (b.def.slot !== 'duo') s.add(b.def.god);
    }
    return s;
  }

  private getDominantGod(): GodId {
    if (this.boons.size === 0) return 'zeus';
    const counts: Record<GodId, number> = { zeus: 0, ares: 0, demeter: 0, nyx: 0 };
    for (const b of this.boons.values()) {
      counts[b.def.god] += b.rarity === 'epic' ? 3 : b.rarity === 'rare' ? 2 : 1;
    }
    let best: GodId = 'zeus';
    let bestScore = -1;
    for (const g of ['zeus', 'ares', 'demeter', 'nyx'] as GodId[]) {
      if (counts[g] > bestScore) {
        bestScore = counts[g];
        best = g;
      }
    }
    return best;
  }

  private refreshHeroEnchantVisuals() {
    if (this.boons.size === 0) {
      this.playerRuneRing.setAlpha(0);
      this.playerHalo.setTint(WEAPONS[this.save.selectedWeapon].accentColor);
      return;
    }
    const dom = this.getDominantGod();
    this.playerHalo.setTint(GOD_META[dom].colorNum);
    this.playerRuneRing.setTint(GOD_META[dom].colorNum).setAlpha(0.58);
  }

  // ============================================================================
  // Room Builders & Non-Boxy Tactical Arenas
  // ============================================================================
  private clearRoom() {
    this.roomToken++;
    this.waveSpawning = false;
    this.activeFloatTexts = 0;
    this.roomGroup.clear(true, true);
    this.pillars.clear(true, true);
    this.pillarVisuals = [];
    this.pillarCenters = [];
    for (const m of this.ambientMotes) m.obj.destroy();
    this.ambientMotes = [];
    this.pits = [];
    for (const b of this.barrels) {
      b.shadow.destroy();
      b.sprite.destroy();
    }
    this.barrels = [];
    this.wardG?.destroy();
    this.wardG = undefined;
    this.moltenG?.destroy();
    this.moltenG = undefined;
    this.hitstopRealUntil = 0;
    this.slowMoRealUntil = 0;
    this.time.timeScale = 1.0;

    for (const e of this.enemies) {
      e.hpBarBg?.destroy();
      e.hpBarFill?.destroy();
      e.armorBarBg?.destroy();
      e.armorBarFill?.destroy();
      e.armorLabel?.destroy();
      e.markVisual?.destroy();
      e.postureBarBg?.destroy();
      e.postureBarFill?.destroy();
      e.aura?.destroy();
      e.shadow?.destroy();
      e.doomSigil?.destroy();
      e.chillBase?.destroy();
      e.frontShield?.destroy();
      e.execMark?.destroy();
      e.laserG?.destroy();
      e.jumpReticle?.destroy();
      e.sprite.destroy();
    }
    this.cameras.main.setZoom(1);
    this.enemies = [];
    for (const p of this.playerProjectiles) p.sprite.destroy();
    this.playerProjectiles = [];
    for (const ep of this.enemyProjectiles) ep.sprite.destroy();
    this.enemyProjectiles = [];
    for (const hz of this.hazardZones) {
      hz.ringObj.destroy();
      hz.coreObj.destroy();
    }
    this.hazardZones = [];
    for (const sp of this.spikes) sp.sprite.destroy();
    this.spikes = [];
    for (const it of this.interactables) {
      it.sprite.destroy();
      it.text.destroy();
    }
    this.interactables = [];
    this.doorsOpened = false;
    this.rewardSpawned = false;
    this.activePrompt = null;
  }

  private getArenaLayout(chamberNum: number): ArenaLayout {
    if (chamberNum === 0 || chamberNum % 4 === 0 && chamberNum % 8 !== 0) {
      return chamberNum === 0 ? 'sanctum' : 'abyss_bridge';
    }
    if (chamberNum === 2 || chamberNum === 7) return 'crucible';
    return 'sanctum';
  }

  private buildRoomShell(isBoss = false, isHub = false, layout: ArenaLayout = 'sanctum') {
    const g = this.add.graphics().setDepth(-3);
    this.roomGroup.add(g);

    g.fillStyle(0x05030a, 1);
    g.fillRect(-500, -400, ARENA_W + 1000, ARENA_H + 800);

    const abyssGlow = this.add
      .image(ARENA_W / 2, ARENA_H / 2, 'tex_circle_glow')
      .setTint(isBoss ? 0x6a0f1c : isHub ? 0x2b174d : 0x1b1535)
      .setScale(14, 9)
      .setAlpha(0.55)
      .setDepth(-2);
    this.roomGroup.add(abyssGlow);

    g.fillStyle(0x0d0914, 1);
    g.fillRect(-10, ARENA_H - 6, ARENA_W + 20, 74);
    g.fillStyle(0x161022, 1);
    g.fillRect(0, ARENA_H - 4, ARENA_W, 42);
    for (let sx = 12; sx < ARENA_W - 20; sx += 64) {
      g.fillStyle(0x211832, 0.75);
      g.fillRect(sx, ARENA_H + 2, 52, 26);
      g.lineStyle(1.5, 0x09060e, 0.9);
      g.strokeRect(sx, ARENA_H + 2, 52, 26);
    }
    g.lineStyle(3, isBoss ? 0xff3d00 : isHub ? 0x9c27b0 : 0x5c3688, 0.55);
    g.strokeRect(2, ARENA_H + 38, ARENA_W - 4, 2);

    const innerX = TILE;
    const innerY = TILE * 2;
    const innerW = ARENA_W - TILE * 2;
    const innerH = ARENA_H - TILE * 3;
    const floorTile = this.add
      .tileSprite(innerX + innerW / 2, innerY + innerH / 2, innerW, innerH, 'underworld_floor_tile')
      .setTileScale(0.21, 0.21)
      .setTint(isBoss ? 0xe0b4be : isHub ? 0xe4daf2 : 0xd3cadf)
      .setDepth(0);
    this.roomGroup.add(floorTile);

    const fg = this.add.graphics().setDepth(1);
    this.roomGroup.add(fg);

    fg.fillStyle(0x171124, 1);
    fg.fillRect(0, 0, ARENA_W, TILE * 2);
    for (let wx = 0; wx < ARENA_W; wx += 72) {
      fg.fillStyle(0x221933, 0.9);
      fg.fillRect(wx + 2, 10, 68, TILE * 1.45);
      fg.lineStyle(1.5, 0x0b0712, 0.95);
      fg.strokeRect(wx + 2, 10, 68, TILE * 1.45);
    }
    fg.fillStyle(0x2a1f3d, 1);
    fg.fillRect(0, TILE * 2 - 14, ARENA_W, 14);
    fg.lineStyle(2, isBoss ? 0xd32f2f : 0xc59b38, 0.85);
    fg.lineBetween(TILE - 4, TILE * 2 - 2, ARENA_W - TILE + 4, TILE * 2 - 2);

    for (const bx of [190, 340, ARENA_W - 340, ARENA_W - 190]) {
      const bn = this.add
        .image(bx, TILE * 1.15, 'tex_banner_hd')
        .setTint(isBoss ? 0xff8a80 : isHub ? 0xce93d8 : 0xffffff)
        .setDepth(3);
      this.roomGroup.add(bn);
    }

    fg.fillStyle(0x130e1e, 1);
    fg.fillRect(0, TILE * 2, TILE, ARENA_H - TILE * 2);
    fg.fillRect(ARENA_W - TILE, TILE * 2, TILE, ARENA_H - TILE * 2);
    fg.fillRect(0, ARENA_H - TILE, ARENA_W, TILE);

    fg.lineStyle(2, isBoss ? 0xc62828 : 0xb88c38, 0.48);
    fg.strokeRect(innerX + 14, innerY + 14, innerW - 28, innerH - 28);
    fg.lineStyle(1, isBoss ? 0xff5252 : 0xd4af37, 0.25);
    fg.strokeRect(innerX + 22, innerY + 22, innerW - 44, innerH - 44);

    // Abyssal Chasm Bridge Pits (Ring-Out Hazards!)
    if (layout === 'abyss_bridge') {
      const pitDefs: AbyssPit[] = [
        { x: TILE * 2.2, y: TILE * 4.4, w: TILE * 3.4, h: TILE * 5.6 },
        { x: ARENA_W - TILE * 5.6, y: TILE * 4.4, w: TILE * 3.4, h: TILE * 5.6 },
      ];
      for (const pit of pitDefs) {
        this.pits.push(pit);
        fg.fillStyle(0x040208, 0.98);
        fg.fillRoundedRect(pit.x, pit.y, pit.w, pit.h, 8);
        fg.lineStyle(3, 0x9c27b0, 0.65);
        fg.strokeRoundedRect(pit.x, pit.y, pit.w, pit.h, 8);
        fg.lineStyle(1.5, 0x4dd0e1, 0.35);
        fg.strokeRoundedRect(pit.x + 6, pit.y + 6, pit.w - 12, pit.h - 12, 6);
        const pitGlow = this.add
          .image(pit.x + pit.w / 2, pit.y + pit.h / 2, 'tex_circle_glow')
          .setTint(0x7b1fa2)
          .setScale(1.8, 2.5)
          .setAlpha(0.32)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(1);
        this.roomGroup.add(pitGlow);
      }
    }

    const cx = ARENA_W / 2;
    const cy = innerY + innerH / 2 + 10;
    fg.lineStyle(2.5, isBoss ? 0xff1744 : isHub ? 0xce93d8 : 0xb88c38, isBoss || isHub ? 0.42 : 0.22);
    fg.strokeCircle(cx, cy, 118);
    fg.lineStyle(1.5, isBoss ? 0xff8a80 : isHub ? 0x80deea : 0xd4af37, isBoss || isHub ? 0.34 : 0.16);
    fg.strokeCircle(cx, cy, 88);

    const rockKeys = ['env_rock1', 'env_rock2', 'env_rock3'];
    const cornerSpots = [
      [TILE + 16, TILE * 2 + 16],
      [ARENA_W - TILE - 16, TILE * 2 + 16],
      [TILE + 18, ARENA_H - TILE - 18],
      [ARENA_W - TILE - 18, ARENA_H - TILE - 18],
    ];
    cornerSpots.forEach(([rx, ry], idx) => {
      const rk = this.add
        .image(rx, ry, rockKeys[idx % rockKeys.length])
        .setScale(0.75)
        .setTint(0x6e6088)
        .setDepth(2);
      this.roomGroup.add(rk);
    });

    const flameTint = isBoss ? 0xff3d00 : isHub ? 0xba68c8 : 0xff9100;
    const glowTint = isBoss ? 0xff1744 : isHub ? 0x9c27b0 : 0xff7043;
    const brazierSpots = [
      [TILE * 2.2, TILE * 2.05],
      [ARENA_W - TILE * 2.2, TILE * 2.05],
      [TILE * 1.4, ARENA_H / 2],
      [ARENA_W - TILE * 1.4, ARENA_H / 2],
      [TILE * 2.4, ARENA_H - TILE * 1.1],
      [ARENA_W - TILE * 2.4, ARENA_H - TILE * 1.1],
    ];
    for (const [bx, by] of brazierSpots) {
      this.spawnBrazier(bx, by, flameTint, glowTint);
    }

    const moteColor = isBoss ? 0xff5252 : isHub ? 0xce93d8 : 0xffb74d;
    for (let i = 0; i < 18; i++) {
      const m = this.add
        .circle(
          Phaser.Math.Between(TILE, ARENA_W - TILE),
          Phaser.Math.Between(TILE * 2, ARENA_H - TILE),
          Phaser.Math.FloatBetween(1.4, 2.8),
          moteColor,
          Phaser.Math.FloatBetween(0.25, 0.65)
        )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(17);
      this.ambientMotes.push({
        obj: m,
        vx: Phaser.Math.FloatBetween(-10, 10),
        vy: Phaser.Math.FloatBetween(-24, -10),
        baseAlpha: m.alpha,
      });
    }
  }

  private spawnBrazier(x: number, y: number, flameTint: number, glowTint: number) {
    const shadow = this.add.image(x, y + 14, 'tex_shadow_oval').setScale(0.58).setAlpha(0.7).setDepth(2);
    const pool = this.add
      .image(x, y - 4, 'tex_circle_glow')
      .setTint(glowTint)
      .setScale(2.7)
      .setAlpha(0.38)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    const bowl = this.add.image(x, y, 'tex_brazier_base').setScale(0.95).setDepth(5);
    const flame = this.add
      .sprite(x, y - 20, 'env_fire')
      .setScale(1.02)
      .setTint(flameTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);
    flame.play('env_fire_anim');

    this.tweens.add({
      targets: pool,
      scale: 3.1,
      alpha: 0.48,
      duration: Phaser.Math.Between(700, 1050),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.roomGroup.addMultiple([shadow, pool, bowl, flame]);
  }

  private spawnPillar(gx: number, gy: number) {
    const px = gx * TILE + TILE / 2;
    const py = gy * TILE + TILE / 2;

    const shadow = this.add.image(px, py + 18, 'tex_shadow_oval').setScale(0.92).setAlpha(0.8).setDepth(2);
    const visual = this.add.image(px, py + 24, 'tex_pillar_hd').setOrigin(0.5, 0.88).setScale(0.92).setDepth(12);
    this.roomGroup.addMultiple([shadow, visual]);
    this.pillarVisuals.push(visual);

    this.pillarCenters.push({ x: px, y: py + 4, r: 34 });
    const colObj = this.pillars.create(px, py + 4, 'tex_spark').setScale(3).setVisible(false).refreshBody();
    const b = colObj.body as Phaser.Physics.Arcade.StaticBody;
    b.setSize(34, 26);
    b.setOffset(7, 9);
  }

  private spawnExplosiveBarrel(gx: number, gy: number) {
    const x = gx * TILE + TILE / 2;
    const y = gy * TILE + TILE / 2;
    const shadow = this.add.image(x, y + 18, 'tex_shadow_oval').setScale(0.55).setDepth(2);
    const sprite = this.add.image(x, y, 'tex_barrel').setScale(0.92).setDepth(8);
    this.barrels.push({ x, y, sprite, shadow, triggered: false });
  }

  private triggerBarrel(barrel: ExplosiveBarrel) {
    if (barrel.triggered) return;
    barrel.triggered = true;
    barrel.sprite.setTintFill(0xffffff);
    this.tweens.add({
      targets: barrel.sprite,
      scale: 1.15,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        const bx = barrel.x;
        const by = barrel.y;
        barrel.shadow.destroy();
        barrel.sprite.destroy();
        this.barrels = this.barrels.filter((b) => b !== barrel);

        this.vfx.spawnBarrelExplosion(bx, by);
        this.cameraPunch(0.04, 180, 0.009);

        for (const e of [...this.enemies]) {
          if (!e.sprite.active || e.kind === 'dummy') continue;
          const d = Phaser.Math.Distance.Between(bx, by, e.sprite.x, e.sprite.y);
          if (d <= 160) {
            const ang = Phaser.Math.Angle.Between(bx, by, e.sprite.x, e.sprite.y);
            this.addPosture(e, 110);
            this.damageEnemy(e, 88 * this.getGlobalDmgMult(), 'special', ang, 340, true);
          }
        }
        if (Phaser.Math.Distance.Between(bx, by, this.player.x, this.player.y) <= 95) {
          this.hurtPlayer(Math.round(14 * DIFFICULTY.damageMult));
        }
      },
    });
  }

  private spawnBloodAltar(x: number, y: number) {
    const sh = this.add.image(x, y + 20, 'tex_shadow_oval').setScale(0.65).setDepth(2);
    const glow = this.add
      .image(x, y, 'tex_circle_glow')
      .setTint(0xff1744)
      .setScale(1.6)
      .setAlpha(0.52)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    const sprite = this.add.image(x, y - 6, 'flask_red').setScale(3.1).setTint(0xff5252).setDepth(6);
    this.roomGroup.addMultiple([sh, glow]);

    let used = false;
    let altarIt: Interactable | null = null;
    altarIt = this.registerInteractable(x, y, 64, '🩸 [E] 冥血契约 (献祭25%血 -> 稀有神恩)', sprite, () => {
      if (used || this.hp <= 15) {
        this.floatText(x, y - 36, '生命值不足，无法献祭!', '#ff5252', 14);
        return;
      }
      used = true;
      const cost = Math.max(8, Math.round(this.hp * 0.25));
      this.hp = Math.max(1, this.hp - cost);
      this.floatText(this.player.x, this.player.y - 36, `-${cost} 🩸 鲜血献祭!`, '#ff5252', 16);
      if (altarIt) {
        altarIt.consumed = true;
        altarIt.text.destroy();
        this.interactables = this.interactables.filter((i) => i !== altarIt);
      }
      glow.destroy();
      sprite.setTint(0x555555);

      const choices = rollBoonChoices(
        new Set(Array.from(this.boons.keys())),
        this.save.mirror.fortune + 2,
        undefined,
        this.getOwnedGods()
      );
      if (choices[0].rarity === 'common') {
        choices[0].rarity = 'rare';
        choices[0].value = Math.round(choices[0].def.baseValue * 1.35);
      }
      this.ui.showBoonModal(choices, (picked) => {
        this.grantBoon(picked.def, picked.rarity, picked.value);
      });
      this.syncHud();
    });
  }

  private loadHub() {
    this.clearRoom();
    this.chamber = 0;
    this.roomCleared = true;
    bgm.setMode('hub');
    this.resetRunStats();
    this.buildRoomShell(false, true, 'sanctum');

    this.player.setPosition(ARENA_W / 2, ARENA_H - 150);

    // 1. Night Mirror Pedestal on Left
    const mirrorShadow = this.add.image(200, ARENA_H / 2 + 42, 'tex_shadow_oval').setScale(0.75).setDepth(2);
    const mirrorPed = this.add.image(200, ARENA_H / 2 + 30, 'tex_pedestal').setScale(1.05).setDepth(4);
    const mirrorGlow = this.add
      .image(200, ARENA_H / 2 + 12, 'tex_circle_glow')
      .setTint(0xce93d8)
      .setScale(1.85)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    const mirrorSprite = this.add.image(200, ARENA_H / 2 + 12, 'flask_blue').setScale(3.0).setDepth(6);
    this.roomGroup.addMultiple([mirrorShadow, mirrorPed, mirrorGlow]);
    this.registerInteractable(200, ARENA_H / 2 + 20, 74, '🪞 [E] 夜之圣镜 (升级)', mirrorSprite, () => {
      this.openMirror();
    });

    // 2. Three Weapon Pedestals
    const weaponSpecs: Array<{ id: WeaponId; x: number; y: number }> = [
      { id: 'sword', x: 328, y: ARENA_H / 2 + 125 },
      { id: 'bow', x: 528, y: ARENA_H / 2 + 125 },
      { id: 'blades', x: 728, y: ARENA_H / 2 + 125 },
    ];
    for (const ws of weaponSpecs) {
      const def = WEAPONS[ws.id];
      const sh = this.add.image(ws.x, ws.y + 24, 'tex_shadow_oval').setScale(0.65).setDepth(2);
      const ped = this.add.image(ws.x, ws.y + 12, 'tex_pedestal').setScale(0.95).setDepth(4);
      const glow = this.add
        .image(ws.x, ws.y - 2, 'tex_circle_glow')
        .setTint(def.accentColor)
        .setScale(1.45)
        .setAlpha(0.52)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
      const sp = this.add.image(ws.x, ws.y - 10, def.spriteKey).setScale(2.8).setDepth(6);
      this.tweens.add({ targets: sp, y: ws.y - 18, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.roomGroup.addMultiple([sh, ped, glow]);
      this.registerInteractable(
        ws.x,
        ws.y,
        66,
        `⚔️ [E] ${def.name}${this.save.selectedWeapon === ws.id ? ' (神态)' : ''}`,
        sp,
        () => {
          this.save.selectedWeapon = ws.id;
          writeSave(this.save);
          const prefix = this.getHeroAnimPrefix();
          this.player.play(`${prefix}_idle`, true);
          this.playerHalo.setTint(def.accentColor);
          this.maxDashCharges = this.computeMaxDashes();
          this.dashCharges = this.maxDashCharges;
          sfx.playBoonSelect();
          this.refreshHubWeaponLabels();
          this.syncHud();
          this.ui.showAspectModal(
            ws.id,
            this.save,
            (lvl) => {
              this.save.selectedAspects[ws.id] = lvl;
              writeSave(this.save);
              this.maxDashCharges = this.computeMaxDashes();
              this.dashCharges = this.maxDashCharges;
              this.refreshHubWeaponLabels();
              this.syncHud();
            },
            () => {
              if (this.save.darkness < ASPECT_UNLOCK_COST || this.save.unlockedAspects[ws.id]) return false;
              this.save.darkness -= ASPECT_UNLOCK_COST;
              this.save.unlockedAspects[ws.id] = true;
              this.save.selectedAspects[ws.id] = 2;
              writeSave(this.save);
              this.maxDashCharges = this.computeMaxDashes();
              this.dashCharges = this.maxDashCharges;
              this.vfx.spawnDivineDescent(this.player.x, this.player.y, 'ares', 'epic');
              this.refreshHubWeaponLabels();
              this.syncHud();
              return true;
            },
            () => {
              this.attackCdUntil = Math.max(this.attackCdUntil, this.time.now + 200);
              this.refreshHubWeaponLabels();
              this.syncHud();
            }
          );
        }
      );
    }
    this.refreshHubWeaponLabels();

    // 3. Practice Combat Dummy (parryable + posture breakable!) + Divine Trial Altar
    this.spawnEnemy('dummy', ARENA_W - 190, ARENA_H / 2 + 20, false);

    const trialX = ARENA_W - 190;
    const trialY = ARENA_H / 2 + 145;
    const trialSh = this.add.image(trialX, trialY + 22, 'tex_shadow_oval').setScale(0.65).setDepth(2);
    const trialPed = this.add.image(trialX, trialY + 10, 'tex_pedestal').setScale(0.95).setDepth(4);
    const trialGlow = this.add
      .image(trialX, trialY - 2, 'tex_circle_glow')
      .setTint(0xffd54f)
      .setScale(1.55)
      .setAlpha(0.58)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    const trialSprite = this.add.image(trialX, trialY - 10, 'chest_0').setScale(2.8).setDepth(6);
    this.roomGroup.addMultiple([trialSh, trialPed, trialGlow]);
    this.registerInteractable(trialX, trialY, 68, '✨ [E] 神力试炼 (史诗四神+大招)', trialSprite, () => {
      const cycle: Array<GodId | 'clear'> = ['zeus', 'ares', 'demeter', 'nyx', 'clear'];
      const pick = cycle[this.hubTrialIndex % cycle.length];
      this.hubTrialIndex++;
      this.boons.clear();
      if (pick === 'clear') {
        this.hubTrialActive = false;
        this.wrath = 0;
        this.floatText(trialX, trialY - 38, '🔄 已清空试炼祝福', '#cfd8dc', 15);
      } else {
        this.hubTrialActive = true;
        for (const def of BOONS.filter((b) => b.god === pick)) {
          this.boons.set(def.id, { def, rarity: 'epic', value: Math.round(def.baseValue * 1.75) });
        }
        this.wrath = 100;
        this.vfx.spawnDivineDescent(this.player.x, this.player.y, pick, 'epic');
        this.cameraPunch(0.03, 120, 0.006);
        this.floatText(
          this.player.x,
          this.player.y - 48,
          `${GOD_META[pick].icon} 试炼：史诗${GOD_META[pick].name} (按Q放大招!)`,
          GOD_META[pick].colorHex,
          17
        );
      }
      this.refreshHeroEnchantVisuals();
      this.syncHud();
    });

    // 4. Start Chapter Door
    const doorGlow = this.add
      .image(ARENA_W / 2, TILE * 1.95, 'tex_circle_glow')
      .setTint(0xffd54f)
      .setScale(2.1)
      .setAlpha(0.65)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    const door = this.add.image(ARENA_W / 2, TILE * 1.48, 'tex_gate_arch').setTint(0xffd54f).setScale(1.0).setDepth(4);
    this.roomGroup.add(doorGlow);
    this.registerInteractable(
      ARENA_W / 2,
      TILE * 2.25,
      58,
      '🚪 进入塔尔塔罗斯 · 第 1 / 8 层',
      door,
      () => {
        this.currentReward = { kind: 'boon', god: 'zeus', label: '⚡ 宙斯祝福', color: 0xffd54f };
        this.enterChamber(1);
      },
      true
    );

    this.cameras.main.fadeIn(260, 0, 0, 0);
    this.syncHud();
  }

  private refreshHubWeaponLabels() {
    for (const it of this.interactables) {
      for (const id of ['sword', 'bow', 'blades'] as WeaponId[]) {
        const def = WEAPONS[id];
        if (it.label.includes(def.name)) {
          const lvl = this.save.selectedAspects[id] || 1;
          const mark = this.save.selectedWeapon === id ? ' ✓' : '';
          it.label = `⚔️ [E] ${def.name}·${lvl === 2 ? 'II' : 'I'}${mark}`;
          it.text.setText(it.label);
        }
      }
    }
  }

  private enterChamber(chamberNum: number) {
    this.clearRoom();
    this.chamber = chamberNum;
    this.roomCleared = false;
    const isBoss = chamberNum === 8 || (chamberNum > 8 && chamberNum % 5 === 0);
    const isMiniBoss = chamberNum === 5;
    const isElite = !isBoss && !isMiniBoss && chamberNum % 3 === 0;
    const layout = isBoss ? 'sanctum' : this.getArenaLayout(chamberNum);

    if (chamberNum === 1) {
      if (this.hubTrialActive) {
        this.hubTrialActive = false;
        this.boons.clear();
        this.wrath = 0;
        this.refreshHeroEnchantVisuals();
      }
      this.styleScore = 0;
      this.comboCount = 0;
      this.styleFreezeUntil = 0;
      this.save.totalRuns += 1;
      writeSave(this.save);
    }

    this.buildRoomShell(isBoss, false, layout);
    this.player.setPosition(ARENA_W / 2, ARENA_H - 110);

    // Tactical room geometry + Barrels + Blood Altars
    if (isBoss) {
      this.spawnPillar(5, 5);
      this.spawnPillar(16, 5);
      this.spawnPillar(5, 9);
      this.spawnPillar(16, 9);
      this.spawnExplosiveBarrel(11, 5);
      this.spawnExplosiveBarrel(11, 9);
    } else if (layout === 'abyss_bridge') {
      this.spawnPillar(9, 6);
      this.spawnPillar(12, 8);
      this.spawnExplosiveBarrel(8, 7);
      this.spawnExplosiveBarrel(13, 7);
      this.spawnBloodAltar(ARENA_W / 2, TILE * 3.1);
    } else if (layout === 'crucible') {
      this.spawnPillar(7, 5);
      this.spawnPillar(14, 5);
      this.spawnPillar(10.5, 8.5);
      this.spawnExplosiveBarrel(6, 8);
      this.spawnExplosiveBarrel(15, 8);
      this.spawnSpikeTrap(10, 5);
      this.spawnSpikeTrap(11, 5);
      if (chamberNum === 2 || chamberNum === 7) {
        this.spawnBloodAltar(TILE * 2.5, ARENA_H / 2 + 60);
      }
    } else {
      this.spawnPillar(6, 6);
      this.spawnPillar(15, 6);
      this.spawnSpikeTrap(10, 7);
      this.spawnSpikeTrap(11, 7);
      this.spawnExplosiveBarrel(7, 9);
      this.spawnExplosiveBarrel(14, 9);
    }

    const titleStr = isBoss
      ? `第 ${chamberNum} 层 · 炼狱魔王殿 [${DIFFICULTY.label}]`
      : isMiniBoss
      ? `第 ${chamberNum} 层 · 守门三精英 [${DIFFICULTY.label}]`
      : isElite
      ? `第 ${chamberNum} 层 · 精英试炼 [${DIFFICULTY.label}]`
      : `塔尔塔罗斯 · 第 ${chamberNum} / 8 层 [${DIFFICULTY.label}]`;
    this.floatText(ARENA_W / 2, ARENA_H / 2 - 90, titleStr, isBoss ? '#ff5252' : '#ffd54f', 24);

    if (this.currentReward.kind === 'shop') {
      bgm.setMode('clear');
      this.roomCleared = true;
      this.doorsOpened = false;
      const shopGlow = this.add
        .image(ARENA_W / 2, ARENA_H / 2 - 20, 'tex_circle_glow')
        .setTint(0xffca28)
        .setScale(2.1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
      const shopChest = this.add.image(ARENA_W / 2, ARENA_H / 2 - 20, 'chest_0').setScale(3.4).setDepth(5);
      this.roomGroup.add(shopGlow);
      this.registerInteractable(ARENA_W / 2, ARENA_H / 2 - 20, 72, '🛒 [E] 打开卡戎黑市商店', shopChest, () => {
        this.openShop();
      });
      this.openExitDoors();
    } else if (isBoss) {
      bgm.setMode('boss_p1');
      this.wavesRemaining = 0;
      this.spawnWave([
        { kind: 'boss', elite: false },
        { kind: 'imp', elite: true },
        { kind: 'imp', elite: true },
      ]);
      sfx.playBossRoar();
    } else if (isMiniBoss) {
      bgm.setMode('combat');
      this.wavesRemaining = 1;
      this.spawnWave([
        { kind: 'ice', elite: true },
        { kind: 'necro', elite: true },
        { kind: 'imp', elite: true },
        { kind: 'ghoul', elite: false },
        { kind: 'ghoul', elite: false },
        { kind: 'ghoul', elite: false },
        { kind: 'ghoul', elite: false },
        { kind: 'ghoul', elite: false },
        { kind: 'ghoul', elite: false },
      ]);
    } else {
      bgm.setMode('combat');
      this.wavesRemaining = chamberNum >= 4 ? 2 : 1;
      this.spawnChamberWave(true);
    }

    this.cameras.main.fadeIn(240, 0, 0, 0);
    this.syncHud();
  }

  private spawnSpikeTrap(gx: number, gy: number) {
    const x = gx * TILE + TILE / 2;
    const y = gy * TILE + TILE / 2;
    const sp = this.add.image(x, y, 'spike_0').setScale(1.0).setDepth(2);
    this.spikes.push({ sprite: sp, x, y, phase: 'idle', timer: 1200 + Math.random() * 1400 });
  }

  private spawnChamberWave(isEliteRoom: boolean) {
    const count = Math.min(DIFFICULTY.waveMaxCount, 9 + Math.floor(this.chamber * 0.75));
    const list: Array<{ kind: EnemyEntity['kind']; elite: boolean }> = [];
    const threatPool: EnemyEntity['kind'][] =
      this.chamber === 1
        ? ['skeleton', 'imp', 'necro']
        : ['skeleton', 'imp', 'ice', 'necro'];

    const ghoulTarget = Math.ceil(count * 0.5);
    for (let i = 0; i < count; i++) {
      if (i === 0 || (isEliteRoom && i === 1)) {
        const eliteKind = threatPool[(this.chamber + i) % threatPool.length];
        list.push({ kind: eliteKind, elite: true });
      } else if (i <= ghoulTarget) {
        list.push({ kind: 'ghoul', elite: false });
      } else {
        const k = threatPool[(i + this.chamber) % threatPool.length];
        list.push({ kind: k, elite: false });
      }
    }
    this.spawnWave(list);
  }

  private isInsidePit(x: number, y: number, margin = 10): AbyssPit | null {
    for (const p of this.pits) {
      if (x >= p.x + margin && x <= p.x + p.w - margin && y >= p.y + margin && y <= p.y + p.h - margin) {
        return p;
      }
    }
    return null;
  }

  private spawnWave(specs: Array<{ kind: EnemyEntity['kind']; elite: boolean }>) {
    this.waveSpawning = true;
    const spots: Array<{ x: number; y: number; kind: EnemyEntity['kind']; elite: boolean }> = [];

    for (let i = 0; i < specs.length; i++) {
      let sx = ARENA_W / 2;
      let sy = ARENA_H / 2 - 40;
      for (let tries = 0; tries < 24; tries++) {
        const tx = Phaser.Math.Between(TILE * 3, ARENA_W - TILE * 3);
        const ty = Phaser.Math.Between(TILE * 3, ARENA_H - TILE * 4);
        if (!this.isInsidePit(tx, ty, -18) && Phaser.Math.Distance.Between(tx, ty, this.player.x, this.player.y) > 155) {
          sx = tx;
          sy = ty;
          break;
        }
      }
      spots.push({ x: sx, y: sy, kind: specs[i].kind, elite: specs[i].elite });

      const mark = this.add
        .image(sx, sy, 'tex_circle_glow')
        .setTint(0xff3d00)
        .setScale(1.4)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
      this.tweens.add({
        targets: mark,
        scale: 0.45,
        alpha: 0.9,
        duration: 370,
        onComplete: () => mark.destroy(),
      });
    }

    const spawnToken = this.roomToken;
    this.time.delayedCall(380, () => {
      if (spawnToken !== this.roomToken) return;
      this.waveSpawning = false;
      if (this.isDead) return;
      for (const s of spots) {
        this.spawnEnemy(s.kind, s.x, s.y, s.elite);
        // Elite Necromancer brings a protective Ward Totem!
        if (s.kind === 'necro' && s.elite) {
          const tx = Phaser.Math.Clamp(s.x + (s.x < ARENA_W / 2 ? 75 : -75), TILE * 2.5, ARENA_W - TILE * 2.5);
          if (!this.isInsidePit(tx, s.y, -10)) {
            this.spawnEnemy('totem', tx, s.y, false);
          }
        }
      }
      this.checkWaveOrClear(false);
      this.syncHud(true);
    });
  }

  private spawnEnemy(kind: EnemyEntity['kind'], x: number, y: number, isElite: boolean) {
    const scaleMult = 1 + Math.max(0, this.chamber - 1) * 0.22;
    const eliteMult = isElite ? 2.35 : 1.0;

    let spriteKey = 'en_knight_idle';
    let idleAnim = 'en_knight_idle';
    let runAnim = 'en_knight_run';
    let atkAnim = 'en_knight_atk';
    let baseHp = 50;
    let maxPosture = 90;
    let speed = 145;
    let dmg = 17;
    let sprScale = 0.68;
    let shadowScale = 0.68;
    let hpBarYOff = -44;
    let bodyW = 42;
    let bodyH = 36;
    let bodyOx = 75;
    let bodyOy = 92;

    if (kind === 'ghoul') {
      spriteKey = 'en_imp_sheet';
      idleAnim = 'en_imp_idle';
      runAnim = 'en_imp_run';
      atkAnim = 'en_imp_atk';
      baseHp = 26;
      maxPosture = 999999;
      speed = 188;
      dmg = 13;
      sprScale = 0.56;
      shadowScale = 0.56;
      hpBarYOff = -36;
    } else if (kind === 'imp') {
      spriteKey = 'en_imp_sheet';
      idleAnim = 'en_imp_idle';
      runAnim = 'en_imp_run';
      atkAnim = 'en_imp_atk';
      baseHp = 44;
      maxPosture = 78;
      speed = 172;
      dmg = 19;
      sprScale = 0.66;
      shadowScale = 0.64;
      hpBarYOff = -40;
    } else if (kind === 'ice') {
      // Front-Shielded Phalanx Lancer!
      spriteKey = 'en_lancer_idle';
      idleAnim = 'en_lancer_idle';
      runAnim = 'en_lancer_run';
      atkAnim = 'en_lancer_atk';
      baseHp = 80;
      maxPosture = 125;
      speed = 110;
      dmg = 22;
      sprScale = 0.56;
      shadowScale = 0.78;
      hpBarYOff = -50;
      bodyW = 54;
      bodyH = 44;
      bodyOx = 133;
      bodyOy = 152;
    } else if (kind === 'necro') {
      // Laser-Sight Sniper Mage!
      spriteKey = 'en_monk_idle';
      idleAnim = 'en_monk_idle';
      runAnim = 'en_monk_run';
      atkAnim = 'en_monk_cast';
      baseHp = 52;
      maxPosture = 80;
      speed = 100;
      dmg = 19;
      sprScale = 0.68;
      shadowScale = 0.66;
      hpBarYOff = -44;
    } else if (kind === 'boss') {
      spriteKey = 'boss_nightborne';
      idleAnim = 'boss_nb_idle';
      runAnim = 'boss_nb_run';
      atkAnim = 'boss_nb_atk';
      baseHp = 950;
      maxPosture = 320;
      speed = 132;
      dmg = 25;
      sprScale = 2.05;
      shadowScale = 1.4;
      hpBarYOff = -66;
      bodyW = 24;
      bodyH = 24;
      bodyOx = 28;
      bodyOy = 36;
    } else if (kind === 'totem') {
      spriteKey = 'tex_totem';
      idleAnim = '';
      runAnim = '';
      atkAnim = '';
      baseHp = 48;
      maxPosture = 9999;
      speed = 0;
      dmg = 0;
      sprScale = 0.92;
      shadowScale = 0.58;
      hpBarYOff = -48;
      bodyW = 36;
      bodyH = 36;
      bodyOx = 10;
      bodyOy = 40;
    } else if (kind === 'dummy') {
      spriteKey = 'en_dummy_idle';
      idleAnim = 'en_dummy_idle';
      runAnim = 'en_dummy_idle';
      atkAnim = 'en_dummy_idle';
      baseHp = 99999;
      maxPosture = 100;
      speed = 0;
      dmg = 0;
      sprScale = 0.7;
      shadowScale = 0.7;
    }

    const hasPosture = isElite || kind === 'boss' || kind === 'dummy';
    const maxHp =
      kind === 'dummy'
        ? 99999
        : Math.round(baseHp * scaleMult * eliteMult * DIFFICULTY.hpMult);
    const finalPosture = hasPosture
      ? Math.round(maxPosture * (isElite ? 1.45 : 1.0) * (kind === 'dummy' ? 1.0 : DIFFICULTY.postureMult))
      : 999999;

    // Elite Super-Armor & Random Affixes (Hell 3×)
    const hasArmor = isElite && kind !== 'boss' && kind !== 'dummy' && kind !== 'totem';
    const maxArmorHp = hasArmor ? Math.round(maxHp * DIFFICULTY.armorRatio) : 0;
    const affixes: EliteAffix[] = [];
    if (hasArmor) {
      const affixPool: EliteAffix[] = Phaser.Utils.Array.Shuffle(['teleporter', 'molten_link', 'splitter']);
      const affixCount = this.chamber >= 5 ? 3 : 2;
      for (let a = 0; a < affixCount; a++) {
        affixes.push(affixPool[a]);
      }
    }

    const shadow = this.add
      .image(x, y + (kind === 'boss' ? 30 : 22), 'tex_shadow_oval')
      .setScale(shadowScale)
      .setAlpha(0.75)
      .setDepth(7);

    const sp = this.physics.add.sprite(x, y, spriteKey);
    sp.setScale(isElite ? sprScale * 1.15 : sprScale);
    if (kind === 'ghoul') sp.setTint(0xff8a80);
    sp.setDepth(9);
    if (idleAnim) sp.play(idleAnim);
    const body = sp.body as Phaser.Physics.Arcade.Body;
    body.setSize(bodyW, bodyH);
    body.setOffset(bodyOx, bodyOy);
    sp.setCollideWorldBounds(true);
    this.physics.add.collider(sp, this.pillars);

    let aura: Phaser.GameObjects.Image | undefined;
    if (isElite || kind === 'boss' || kind === 'totem') {
      const auraTint = kind === 'boss' ? 0xff1744 : kind === 'totem' ? 0xe040fb : 0xffab40;
      aura = this.add
        .image(x, y + 10, 'tex_circle_glow')
        .setTint(auraTint)
        .setScale(kind === 'boss' ? 2.4 : 1.45)
        .setAlpha(0.42)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
    }

    let frontShield: Phaser.GameObjects.Image | undefined;
    if (kind === 'ice') {
      frontShield = this.add
        .image(x, y, 'tex_front_shield')
        .setScale(0.72)
        .setAlpha(0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(14);
    }

    let hpBg: Phaser.GameObjects.Rectangle | undefined;
    let hpFill: Phaser.GameObjects.Rectangle | undefined;
    let postureBarBg: Phaser.GameObjects.Rectangle | undefined;
    let postureBarFill: Phaser.GameObjects.Rectangle | undefined;
    let armorBarBg: Phaser.GameObjects.Rectangle | undefined;
    let armorBarFill: Phaser.GameObjects.Rectangle | undefined;
    let armorLabel: Phaser.GameObjects.Text | undefined;
    if (kind !== 'boss') {
      hpBg = this.add.rectangle(x, y + hpBarYOff, 44, 5, 0x0d0914).setStrokeStyle(1, 0x000000, 0.85).setDepth(20);
      hpFill = this.add
        .rectangle(x, y + hpBarYOff, 42, 3.5, kind === 'totem' ? 0xe040fb : isElite ? 0xffab40 : 0xff5252)
        .setDepth(21);
      if (hasPosture && kind !== 'totem') {
        postureBarBg = this.add.rectangle(x, y + hpBarYOff + 5, 44, 4, 0x16120c).setDepth(20);
        postureBarFill = this.add.rectangle(x, y + hpBarYOff + 5, 0, 2.5, 0xffd54f).setDepth(21);
      }
      if (hasArmor) {
        armorBarBg = this.add.rectangle(x, y + hpBarYOff - 6, 46, 5, 0x061a20).setStrokeStyle(1, 0x00e5ff, 0.8).setDepth(20);
        armorBarFill = this.add.rectangle(x, y + hpBarYOff - 6, 44, 3.5, 0x00e5ff).setDepth(21);
        const affixMap: Record<EliteAffix, string> = {
          teleporter: '⚡瞬移',
          molten_link: '🔥熔链',
          splitter: '🪲分裂',
        };
        const tag = affixes.map((a) => affixMap[a]).join('·');
        armorLabel = this.add
          .text(x, y + hpBarYOff - 16, `🛡️${tag}`, {
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#80deea',
            backgroundColor: '#06151ecc',
            padding: { x: 4, y: 1 },
          })
          .setOrigin(0.5)
          .setDepth(22);
      }
    }

    const ent: EnemyEntity = {
      id: this.enemyIdSeq++,
      kind,
      isElite,
      sprite: sp,
      shadow,
      baseScale: isElite ? sprScale * 1.15 : sprScale,
      idleAnim,
      runAnim,
      atkAnim,
      hpBarYOff,
      animLockUntil: 0,
      hp: maxHp,
      maxHp,
      armorHp: maxArmorHp,
      maxArmorHp,
      affixes,
      teleportCdUntil: this.time.now + 2000,
      moltenCdUntil: this.time.now + 1500,
      chironMarkUntil: 0,
      maimTimer: 0,
      maimDmg: 0,
      posture: 0,
      maxPosture: finalPosture,
      postureDecayAt: 0,
      brokenUntil: 0,
      speed:
        kind === 'dummy' || kind === 'totem'
          ? 0
          : Math.round(speed * (isElite ? 1.3 : 1.0) * DIFFICULTY.moveSpeedMult),
      damage:
        kind === 'dummy' || kind === 'totem'
          ? 0
          : Math.round(dmg * (isElite ? 1.3 : 1.0) * (1 + Math.max(0, this.chamber - 1) * 0.08) * DIFFICULTY.damageMult),
      facingAngle: Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y),
      aiState: 'chase',
      aiTimer: kind === 'dummy' ? 2400 : 350 + Math.random() * 350,
      lockedAngle: 0,
      frontShield,
      chillStacks: 0,
      chillUntil: 0,
      duoBoltCd: 1500,
      doomTimer: 0,
      doomDamage: 0,
      doomColor: 0xff5252,
      bossCycle: 0,
      bossMidSummoned: false,
      bossEnraged: false,
      hpBarBg: hpBg,
      hpBarFill: hpFill,
      postureBarBg,
      postureBarFill,
      armorBarBg,
      armorBarFill,
      armorLabel,
      aura,
    };
    this.enemies.push(ent);

    if (kind === 'dummy') {
      const lbl = this.add
        .text(x, y - 62, '🎯 试刀与弹反练习木桩 (红光按F弹反 · 破防按左键处决)', {
          fontSize: '11px',
          color: '#ffd54f',
          backgroundColor: '#120e1add',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(22);
      this.roomGroup.add(lbl);
    }
  }

  // ============================================================================
  // Core Combat: Parry, Posture Break, Execution, Backstab & Mutations
  // ============================================================================
  private getAimAngle(): number {
    if (this.autoAim && this.enemies.length > 0) {
      let best: EnemyEntity | null = null;
      let bestD = Infinity;
      for (const e of this.enemies) {
        if (!e.sprite.active) continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
        if (d < bestD && d < 620) {
          bestD = d;
          best = e;
        }
      }
      if (best) {
        return Phaser.Math.Angle.Between(this.player.x, this.player.y, best.sprite.x, best.sprite.y);
      }
    }
    const ptr = this.input.activePointer;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    return Phaser.Math.Angle.Between(this.player.x, this.player.y, wp.x, wp.y);
  }

  private getGlobalDmgMult(): number {
    return 1 + this.save.mirror.might * 0.12;
  }

  private getMoveInputVector(): { mx: number; my: number } {
    const right = this.heldCodes.has('KeyD') || this.heldCodes.has('ArrowRight') || this.keys.D.isDown;
    const left = this.heldCodes.has('KeyA') || this.heldCodes.has('ArrowLeft') || this.keys.A.isDown;
    const down = this.heldCodes.has('KeyS') || this.heldCodes.has('ArrowDown') || this.keys.S.isDown;
    const up = this.heldCodes.has('KeyW') || this.heldCodes.has('ArrowUp') || this.keys.W.isDown;
    return {
      mx: (right ? 1 : 0) - (left ? 1 : 0),
      my: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }

  private triggerSlowMo(scale: number, realDurationMs: number) {
    this.time.timeScale = scale;
    this.slowMoRealUntil = Math.max(this.slowMoRealUntil, performance.now() + realDurationMs);
  }

  private resolveSafePlayerPos(fromX: number, fromY: number, targetX: number, targetY: number): { x: number; y: number } {
    let x = Phaser.Math.Clamp(targetX, TILE + 24, ARENA_W - TILE - 24);
    let y = Phaser.Math.Clamp(targetY, TILE * 2 + 24, ARENA_H - TILE - 24);

    if (this.isInsidePit(x, y, -12)) {
      for (const t of [0.8, 0.6, 0.4, 0.2, 0]) {
        const cx = Phaser.Math.Linear(fromX, x, t);
        const cy = Phaser.Math.Linear(fromY, y, t);
        if (!this.isInsidePit(cx, cy, -12)) {
          x = cx;
          y = cy;
          break;
        }
      }
    }

    for (const p of this.pillarCenters) {
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = Math.hypot(dx, dy);
      const minR = p.r + 16;
      if (dist < minR) {
        const ang = dist > 0.01 ? Math.atan2(dy, dx) : Math.atan2(fromY - p.y, fromX - p.x);
        x = p.x + Math.cos(ang) * minR;
        y = p.y + Math.sin(ang) * minR;
      }
    }

    return {
      x: Phaser.Math.Clamp(x, TILE + 24, ARENA_W - TILE - 24),
      y: Phaser.Math.Clamp(y, TILE * 2 + 24, ARENA_H - TILE - 24),
    };
  }

  private depentratePlayerFromHazards() {
    for (const p of this.pillarCenters) {
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minR = p.r + 8;
      if (dist < minR) {
        const ang = dist > 0.01 ? Math.atan2(dy, dx) : 0;
        this.player.x = Phaser.Math.Clamp(p.x + Math.cos(ang) * minR, TILE + 22, ARENA_W - TILE - 22);
        this.player.y = Phaser.Math.Clamp(p.y + Math.sin(ang) * minR, TILE * 2 + 22, ARENA_H - TILE - 22);
      }
    }
    const inPit = this.isInsidePit(this.player.x, this.player.y, -8);
    if (inPit) {
      const dl = Math.abs(this.player.x - inPit.x);
      const dr = Math.abs(inPit.x + inPit.w - this.player.x);
      const dt = Math.abs(this.player.y - inPit.y);
      const db = Math.abs(inPit.y + inPit.h - this.player.y);
      const m = Math.min(dl, dr, dt, db);
      if (m === dl) this.player.x = inPit.x - 10;
      else if (m === dr) this.player.x = inPit.x + inPit.w + 10;
      else if (m === dt) this.player.y = inPit.y - 10;
      else this.player.y = inPit.y + inPit.h + 10;
    }
  }

  private addStyle(points: number, addCombo = 1) {
    this.styleScore = Phaser.Math.Clamp(this.styleScore + points, 0, 1000);
    this.comboCount += addCombo;
    this.styleFreezeUntil = this.time.now + 2800;
  }

  private getStyleState(): {
    letter: string;
    title: string;
    combo: number;
    pct: number;
    atkSpdBonus: number;
    moveBonus: number;
    slashMult: number;
    critBonus: number;
    colorHex: string;
  } | null {
    const sc = this.styleScore;
    if (sc < 90 && this.comboCount < 3) return null;

    const tiers = [
      { min: 920, max: 1000, letter: 'SSS', title: '冥神降世', atkSpdBonus: 45, moveBonus: 30, slashMult: 1.4, critBonus: 0.25, colorHex: '#ff1744' },
      { min: 800, max: 920, letter: 'SS', title: '修罗', atkSpdBonus: 40, moveBonus: 27, slashMult: 1.32, critBonus: 0.2, colorHex: '#ff5252' },
      { min: 600, max: 800, letter: 'S', title: '暴虐', atkSpdBonus: 35, moveBonus: 24, slashMult: 1.26, critBonus: 0.16, colorHex: '#ff9100' },
      { min: 400, max: 600, letter: 'A', title: '残酷', atkSpdBonus: 26, moveBonus: 18, slashMult: 1.18, critBonus: 0.1, colorHex: '#ffd54f' },
      { min: 220, max: 400, letter: 'B', title: '狂战', atkSpdBonus: 18, moveBonus: 12, slashMult: 1.1, critBonus: 0.06, colorHex: '#4dd0e1' },
      { min: 0, max: 220, letter: 'C', title: '嗜血', atkSpdBonus: 10, moveBonus: 6, slashMult: 1.04, critBonus: 0.03, colorHex: '#b0bec5' },
    ];
    const t = tiers.find((x) => sc >= x.min) ?? tiers[tiers.length - 1];
    const span = Math.max(1, t.max - t.min);
    const pct = t.letter === 'SSS' ? 100 : Phaser.Math.Clamp(((sc - t.min) / span) * 100, 6, 100);
    return {
      letter: t.letter,
      title: t.title,
      combo: this.comboCount,
      pct,
      atkSpdBonus: t.atkSpdBonus,
      moveBonus: t.moveBonus,
      slashMult: t.slashMult,
      critBonus: t.critBonus,
      colorHex: t.colorHex,
    };
  }

  private getStyleAtkCdMult(): number {
    const st = this.getStyleState();
    return st ? 1 / (1 + st.atkSpdBonus / 100) : 1.0;
  }

  private triggerResetShockwave(cx: number, cy: number, radius: number, fodderDmg: number, color: number) {
    this.dashCharges = this.maxDashCharges;
    this.specialCdUntil = 0;
    this.parryCdUntil = 0;
    this.vfx.spawnShockwave(cx, cy, radius, color, 260);
    this.vfx.spawnRadialSparks(cx, cy, color, 14, radius * 0.45, radius * 0.95);

    for (const other of [...this.enemies]) {
      if (!other.sprite.active || other.kind === 'dummy') continue;
      const d = Phaser.Math.Distance.Between(cx, cy, other.sprite.x, other.sprite.y);
      if (d > radius) continue;
      const ang = Phaser.Math.Angle.Between(cx, cy, other.sprite.x, other.sprite.y);
      if (!other.isElite && other.kind !== 'boss' && other.kind !== 'totem') {
        this.damageEnemy(other, fodderDmg, 'proc', ang, 420, true);
      } else {
        this.addPosture(other, 28, true);
      }
    }
  }

  private performParry() {
    const now = this.time.now;
    if (now < this.parryCdUntil || now < this.parryWindowUntil) return;

    this.parryWindowUntil = now + 280;
    this.parryCdUntil = now + 900;
    this.parrySucceededThisWindow = false;
    // 0-frame attack cancel!
    this.attackCdUntil = 0;
    this.playerAnimLockUntil = now + 180;

    if (this.save.selectedWeapon === 'sword') {
      this.player.play('hero_sword_guard', true);
    }

    // Visual dome flash
    this.parryShieldVisual
      .setPosition(this.player.x, this.player.y)
      .setScale(0.88)
      .setAlpha(0.85)
      .setTint(0x80deea);

    // Check immediate parry against enemies currently winding up/striking in melee reach!
    this.checkMeleeParries(now);
    this.syncHud();
  }

  private checkMeleeParries(now: number) {
    if (now >= this.parryWindowUntil) return;
    for (const e of [...this.enemies]) {
      if (!e.sprite.active || e.brokenUntil > now) continue;
      if (e.aiState !== 'windup' && e.aiState !== 'strike') continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
      const parryReach = e.kind === 'boss' ? 145 : e.kind === 'imp' ? 125 : 108;
      if (dist <= parryReach) {
        const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
        this.succeedParry(ang);
        e.aiState = 'recover';
        e.aiTimer = 850;
        e.laserG?.clear();
        e.jumpReticle?.destroy();
        e.jumpReticle = undefined;
        // Parrying breaks Shield Knights instantly or deals 75% max posture!
        this.addPosture(e, e.kind === 'ice' ? e.maxPosture : Math.round(e.maxPosture * 0.72), true);
        if (e.kind !== 'boss' && e.kind !== 'dummy') {
          const b = e.sprite.body as Phaser.Physics.Arcade.Body;
          b.setVelocity(Math.cos(ang) * 260, Math.sin(ang) * 260);
        }
      }
    }
  }

  private succeedParry(sourceAngle: number) {
    const now = this.time.now;
    this.parryCdUntil = 0; // Reset parry CD immediately on skilled deflect!
    this.invulnUntil = Math.max(this.invulnUntil, now + 380);
    if (!this.parrySucceededThisWindow) {
      this.parrySucceededThisWindow = true;
      this.hp = Math.min(this.maxHp, this.hp + 4);
      this.wrath = Math.min(100, this.wrath + 20);
      this.hitstopRealUntil = Math.max(this.hitstopRealUntil, performance.now() + 35);
      this.cameraPunch(0.038, 120, 0.0065);
      this.vfx.spawnParrySuccess(this.player.x, this.player.y, sourceAngle);
      this.addStyle(220, 3);
      this.triggerResetShockwave(this.player.x, this.player.y, 185, 65 * this.getGlobalDmgMult(), 0xffd54f);
      if (this.save.selectedWeapon === 'sword' && this.getAspectLevel('sword') === 2) {
        this.nemesisBuffUntil = now + 3500;
        this.floatText(this.player.x, this.player.y - 46, '⚔️ 涅墨西斯复仇! 全技能已刷新', '#ffd54f', 16);
      } else {
        this.floatText(this.player.x, this.player.y - 46, '🛡️ 精准弹反! 全技能刷新 +4❤️', '#ffd54f', 16);
      }
      this.syncHud();
    }
  }

  private addPosture(e: EnemyEntity, amount: number, bypassShield = false) {
    if (!e.sprite.active || e.brokenUntil > this.time.now) return;
    if (!e.isElite && e.kind !== 'boss' && e.kind !== 'dummy') return;
    if (e.kind === 'ice' && !bypassShield) {
      amount *= 0.2;
    }
    e.posture = Math.min(e.maxPosture, e.posture + amount);
    e.postureDecayAt = this.time.now + 3200;
    if (e.posture >= e.maxPosture) {
      this.breakEnemyPosture(e);
    }
  }

  private breakEnemyPosture(e: EnemyEntity) {
    const now = this.time.now;
    e.posture = e.maxPosture;
    e.brokenUntil = now + 3200;
    e.aiState = 'recover';
    e.aiTimer = 3200;
    e.laserG?.clear();
    e.jumpReticle?.destroy();
    e.jumpReticle = undefined;
    sfx.playPostureBreak();
    this.vfx.spawnShockwave(e.sprite.x, e.sprite.y, 92, 0xffd54f, 240);
    this.floatText(e.sprite.x, e.sprite.y - 52, '💫 破防失衡! (左键处决)', '#ffd54f', 16);

    if (!e.execMark) {
      e.execMark = this.add
        .image(e.sprite.x, e.sprite.y + e.hpBarYOff - 22, 'tex_exec_mark')
        .setScale(0.62)
        .setDepth(24);
    }
  }

  private triggerPrimaryAction() {
    if (this.isDead || this.ui.hasModal()) return;
    const now = this.time.now;
    const brokenNear = this.enemies
      .filter((e) => e.sprite.active && e.brokenUntil > now)
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(this.player.x, this.player.y, a.sprite.x, a.sprite.y) -
          Phaser.Math.Distance.Between(this.player.x, this.player.y, b.sprite.x, b.sprite.y)
      )[0];
    if (
      brokenNear &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, brokenNear.sprite.x, brokenNear.sprite.y) <= 128
    ) {
      this.performExecution(brokenNear);
      return;
    }
    this.performAttack();
  }

  private performSwordIaijutsu(isPerfect: boolean) {
    const now = this.time.now;
    const angle = this.getAimAngle();
    this.attackCdUntil = now + 110;
    this.invulnUntil = Math.max(this.invulnUntil, now + (isPerfect ? 260 : 140));
    this.player.setFlipX(Math.cos(angle) < 0);
    this.playHeroActionAnim('attack2');

    const startX = this.player.x;
    const startY = this.player.y;
    const distDash = isPerfect ? 195 : 135;
    const safeDest = this.resolveSafePlayerPos(
      startX,
      startY,
      startX + Math.cos(angle) * distDash,
      startY + Math.sin(angle) * distDash
    );
    const destX = safeDest.x;
    const destY = safeDest.y;
    this.player.setPosition(destX, destY);

    sfx.playChargeRelease(isPerfect);
    const col = this.getSlotColor('attack', 0xffd54f);
    this.vfx.spawnIaijutsuDash(startX, startY, destX, destY, col, isPerfect);
    this.floatText(destX, destY - 48, isPerfect ? '⚡ 完美居合·一闪!' : '⚔️ 蓄力拔刀斩', isPerfect ? '#ffd54f' : '#80deea', isPerfect ? 17 : 13);

    const aspectMult = this.getAspectLevel('sword') === 2 ? 1.2 : 1.0;
    const dmg = WEAPONS.sword.baseDamage * (isPerfect ? 2.85 : 1.8) * aspectMult * this.getGlobalDmgMult();
    const postureHit = isPerfect ? 64 : 38;
    const midX = (startX + destX) / 2;
    const midY = (startY + destY) / 2;

    this.checkBarrelsHit(destX, destY, 130, angle, Math.PI);
    for (const e of [...this.enemies]) {
      const dMid = Phaser.Math.Distance.Between(midX, midY, e.sprite.x, e.sprite.y);
      const dEnd = Phaser.Math.Distance.Between(destX, destY, e.sprite.x, e.sprite.y);
      if (dMid <= 115 || dEnd <= 105) {
        this.addPosture(e, postureHit, isPerfect);
        this.damageEnemy(e, dmg, 'attack', angle, isPerfect ? 320 : 210, isPerfect);
      }
    }
    if (isPerfect) {
      this.cameraPunch(0.048, 160, 0.008);
    }
  }

  private performBowPowerShot(isPerfect: boolean) {
    const now = this.time.now;
    const angle = this.getAimAngle();
    this.attackCdUntil = now + 110;
    this.player.setFlipX(Math.cos(angle) < 0);
    this.playHeroActionAnim('attack1');

    sfx.playChargeRelease(isPerfect);
    this.vfx.spawnPowerShotFlash(this.player.x, this.player.y, angle, isPerfect);
    this.floatText(this.player.x, this.player.y - 44, isPerfect ? '🏹 完美强力穿心箭!' : '🏹 蓄力穿刺箭', isPerfect ? '#ffd54f' : '#80deea', isPerfect ? 16 : 13);

    let dmg = WEAPONS.bow.baseDamage * (isPerfect ? 2.7 : 1.65) * this.getGlobalDmgMult();
    const demAtk = this.boons.get('demeter_attack');
    if (demAtk) dmg *= 1 + demAtk.value / 100;
    const speed = isPerfect ? 980 : 780;
    const canBounce = this.hammers.has('bow_ricochet') ? 1 : 0;
    const isExplosive = this.hammers.has('bow_explosive');
    if (isPerfect) this.guaranteedNextCrit = true;

    if (this.hammers.has('bow_burst')) {
      this.spawnPlayerProjectile(angle - 0.04, dmg * 0.75, speed, 'attack', 6, false, canBounce, isExplosive, false, undefined, isPerfect);
      this.spawnPlayerProjectile(angle + 0.04, dmg * 0.75, speed, 'attack', 6, false, canBounce, isExplosive, false, undefined, isPerfect);
    } else {
      this.spawnPlayerProjectile(angle, dmg, speed, 'attack', 6, false, canBounce, isExplosive, false, undefined, isPerfect);
    }
    if (isPerfect) this.cameraPunch(0.032, 110, 0.006);
  }

  private performBladesBlitz(isPerfect: boolean) {
    const now = this.time.now;
    const angle = this.getAimAngle();
    this.attackCdUntil = now + 100;
    this.invulnUntil = Math.max(this.invulnUntil, now + 220);
    this.player.setFlipX(Math.cos(angle) < 0);
    this.playHeroActionAnim('special');

    const safeDest = this.resolveSafePlayerPos(
      this.player.x,
      this.player.y,
      this.player.x + Math.cos(angle) * 115,
      this.player.y + Math.sin(angle) * 115
    );
    const destX = safeDest.x;
    const destY = safeDest.y;
    this.vfx.spawnIaijutsuDash(this.player.x, this.player.y, destX, destY, 0xce93d8, isPerfect);
    this.player.setPosition(destX, destY);

    sfx.playChargeRelease(isPerfect);
    this.floatText(destX, destY - 46, isPerfect ? '⚡ 完美飞雷神影袭!' : '🗡️ 影刃突袭', isPerfect ? '#ffd54f' : '#ce93d8', isPerfect ? 16 : 13);

    const dmg = WEAPONS.blades.baseDamage * (isPerfect ? 2.5 : 1.65) * this.getGlobalDmgMult();
    for (const e of [...this.enemies]) {
      const d = Phaser.Math.Distance.Between(destX, destY, e.sprite.x, e.sprite.y);
      if (d <= 125) {
        this.addPosture(e, isPerfect ? 52 : 30, isPerfect);
        this.damageEnemy(e, dmg, 'attack', angle, 150, isPerfect);
      }
    }
    if (isPerfect) {
      for (const off of [-0.22, 0.22]) {
        this.spawnPlayerProjectile(angle + off, dmg * 0.55, 520, 'special', 99, true);
      }
      this.cameraPunch(0.035, 120, 0.006);
    }
  }

  private performExecution(target: EnemyEntity) {
    const now = this.time.now;
    const tx = target.sprite.x;
    const ty = target.sprite.y;
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, tx, ty);

    this.invulnUntil = Math.max(this.invulnUntil, now + 480);
    this.attackCdUntil = now + 260;
    this.player.setFlipX(Math.cos(ang) < 0);
    this.playHeroActionAnim('special');

    // Blink close to target safely (never inside pillars or pits!)
    const safePos = this.resolveSafePlayerPos(
      this.player.x,
      this.player.y,
      tx - Math.cos(ang) * 34,
      ty - Math.sin(ang) * 28
    );
    this.player.setPosition(safePos.x, safePos.y);

    this.hitstopRealUntil = Math.max(this.hitstopRealUntil, performance.now() + 48);
    this.cameraPunch(0.06, 200, 0.01);
    this.vfx.spawnExecutionFinisher(tx, ty);
    this.floatText(tx, ty - 56, '⚔️ 致命处决!', '#ff1744', 21);

    // Clear broken posture
    target.brokenUntil = 0;
    target.posture = 0;
    target.execMark?.destroy();
    target.execMark = undefined;

    this.addStyle(280, 4);
    this.triggerResetShockwave(tx, ty, 240, 120 * this.getGlobalDmgMult(), 0xff1744);

    const wpn = WEAPONS[this.save.selectedWeapon];
    const execDmg =
      target.kind === 'boss'
        ? Math.max(220, target.maxHp * 0.25)
        : wpn.baseDamage * 4.5 * this.getGlobalDmgMult();

    // Duo: Ares × Nyx spawns a Blade Rift + 2 Traveling Blade Wheels on Execution!
    const duoAN = this.boons.get('duo_ares_nyx');
    if (duoAN) {
      this.vfx.spawnBladeRift(tx, ty, 'epic', 950);
      this.spawnTravelingBladeWheel(tx, ty, ang - 0.35, 28 * this.getGlobalDmgMult(), 'epic');
      this.spawnTravelingBladeWheel(tx, ty, ang + 0.35, 28 * this.getGlobalDmgMult(), 'epic');
    }

    this.damageEnemy(target, execDmg, 'special', ang, 280, true);
    for (const other of [...this.enemies]) {
      if (other.id !== target.id && other.sprite.active && other.kind !== 'dummy') {
        if (Phaser.Math.Distance.Between(tx, ty, other.sprite.x, other.sprite.y) <= 130) {
          const pushA = Phaser.Math.Angle.Between(tx, ty, other.sprite.x, other.sprite.y);
          this.damageEnemy(other, execDmg * 0.45, 'proc', pushA, 260, true);
        }
      }
    }
    this.syncHud();
  }

  private playHeroActionAnim(kind: 'attack1' | 'attack2' | 'special') {
    const wpn = this.save.selectedWeapon;
    this.playerAnimLockUntil = this.time.now + (wpn === 'blades' ? 130 : 195);
    if (wpn === 'bow') {
      this.player.play('hero_bow_shoot', true);
    } else if (wpn === 'blades') {
      this.player.play(kind === 'attack2' ? 'hero_blades_atk2' : 'hero_blades_atk1', true);
    } else {
      this.player.play(kind === 'attack2' || kind === 'special' ? 'hero_sword_atk2' : 'hero_sword_atk1', true);
    }
  }

  private performAttack() {
    const now = this.time.now;
    const wpn = WEAPONS[this.save.selectedWeapon];
    const cdMult = this.getBoonAtkCdMult() * this.getStyleAtkCdMult();
    if (now < this.attackCdUntil) return;

    // Check Execution Finisher priority when near a posture-broken enemy!
    const brokenNear = this.enemies
      .filter((e) => e.sprite.active && e.brokenUntil > now)
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(this.player.x, this.player.y, a.sprite.x, a.sprite.y) -
          Phaser.Math.Distance.Between(this.player.x, this.player.y, b.sprite.x, b.sprite.y)
      )[0];
    if (
      brokenNear &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, brokenNear.sprite.x, brokenNear.sprite.y) <= 128
    ) {
      this.performExecution(brokenNear);
      return;
    }

    const isDashStrike = now < this.dashingUntil + 130;
    this.attackCdUntil = now + wpn.attackCooldownMs * cdMult;
    const angle = this.getAimAngle();
    this.player.setFlipX(Math.cos(angle) < 0);

    let dmg = wpn.baseDamage * this.getGlobalDmgMult();
    const demAtk = this.boons.get('demeter_attack');
    if (demAtk) dmg *= 1 + demAtk.value / 100;

    if (isDashStrike) {
      const nyxDash = this.boons.get('nyx_dash');
      dmg *= 1.4 + (nyxDash ? nyxDash.value / 100 : 0);
      if (this.hammers.has('sword_lunge') && wpn.id === 'sword') {
        this.guaranteedNextCrit = true;
      }
    }

    const styleState = this.getStyleState();
    const slashMult = (styleState?.slashMult ?? 1.0) * (demAtk ? 1.2 : 1.0);

    if (wpn.id === 'bow') {
      this.playHeroActionAnim('attack1');
      sfx.playBowShot();
      const arrowCol = this.getSlotColor('attack', wpn.accentColor);
      this.vfx.spawnBowRelease(this.player.x, this.player.y, angle, arrowCol, false);
      const isExplosive = this.hammers.has('bow_explosive');
      const canBounce = this.hammers.has('bow_ricochet') ? 1 : 0;
      if (this.hammers.has('bow_burst')) {
        this.spawnPlayerProjectile(angle - 0.05, dmg * 0.72, 650, 'attack', 2, false, canBounce, isExplosive);
        this.spawnPlayerProjectile(angle + 0.05, dmg * 0.72, 650, 'attack', 2, false, canBounce, isExplosive);
      } else {
        this.spawnPlayerProjectile(angle, dmg, 650, 'attack', 3, false, canBounce, isExplosive);
      }
      this.triggerOnAttackMutations(angle, dmg, slashMult, true);
      return;
    }

    // Melee weapons
    this.comboStep = (this.comboStep % 3) + 1;
    sfx.playSlash(this.comboStep);

    const isHeavy = wpn.id === 'sword' && this.comboStep === 3;
    if (isHeavy) dmg *= 1.55;
    this.playHeroActionAnim(this.comboStep % 2 === 0 || isHeavy ? 'attack2' : 'attack1');

    const { mx: moveX, my: moveY } = this.getMoveInputVector();
    if ((moveX === 0 && moveY === 0) || isDashStrike) {
      const lungeSpeed = isDashStrike ? (this.hammers.has('sword_lunge') ? 440 : 260) : 135;
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(angle) * lungeSpeed, Math.sin(angle) * lungeSpeed);
    }

    const slashColor = this.getSlotColor('attack', wpn.accentColor);
    this.vfx.spawnMeleeSlash({
      x: this.player.x,
      y: this.player.y,
      angle,
      color: slashColor,
      comboStep: this.comboStep,
      isHeavy,
      isDashStrike,
      isBlades: wpn.id === 'blades',
      scaleMult: slashMult,
    });

    // Hammer: Sword Crescent Projectile Wave!
    if (wpn.id === 'sword' && this.hammers.has('sword_wave')) {
      this.spawnPlayerProjectile(angle, dmg * 0.65, 500, 'attack', 4, false, 0, false, true);
    }

    // Check barrels hit
    this.checkBarrelsHit(this.player.x, this.player.y, wpn.range * slashMult + 20, angle, 1.5);

    const isSwordNemesis = this.save.selectedWeapon === 'sword' && this.getAspectLevel('sword') === 2;
    const is360Whirl = isHeavy && wpn.id === 'sword' && this.hammers.has('sword_whirl');
    const reach = wpn.range * (isHeavy ? 1.35 : isDashStrike ? 1.2 : 1.0) * (isSwordNemesis ? 1.25 : 1.0) * slashMult;
    const cone = is360Whirl ? Math.PI : isHeavy ? 1.65 : 1.3;
    const postureHit = (isHeavy ? 34 : 20) * (isDashStrike && this.hammers.has('sword_lunge') ? 2.0 : 1.0);

    let hitAny = false;
    for (const e of [...this.enemies]) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
      if (dist <= reach + (e.kind === 'boss' ? 32 : 14)) {
        const angToE = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
        const diff = Math.abs(Phaser.Math.Angle.Wrap(angToE - angle));
        if (diff <= cone || dist < 40) {
          this.addPosture(e, postureHit, is360Whirl);
          this.damageEnemy(e, dmg, 'attack', angle, isHeavy ? 290 : 145, is360Whirl);
          if (is360Whirl) this.hp = Math.min(this.maxHp, this.hp + 2);
          hitAny = true;
        }
      }
    }

    this.triggerOnAttackMutations(angle, dmg, slashMult, false);

    // Hammer: Blades Phantom Flurry on every 3rd hit
    if (wpn.id === 'blades' && this.hammers.has('blades_flurry')) {
      this.bladesFlurryCounter++;
      if (this.bladesFlurryCounter >= 3) {
        this.bladesFlurryCounter = 0;
        this.vfx.spawnShockwave(this.player.x, this.player.y, 120, 0xce93d8, 220);
        for (const e of [...this.enemies]) {
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y) <= 130) {
            this.addPosture(e, 26, true);
            this.damageEnemy(e, dmg * 0.9, 'special', angle, 120, true);
          }
        }
      }
    }

    if (hitAny && isHeavy) {
      this.cameraPunch(0.025, 95, 0.005);
    }
  }

  private performSpecial() {
    const now = this.time.now;
    const wpn = WEAPONS[this.save.selectedWeapon];
    if (now < this.specialCdUntil) return;

    const isDashSpecial = now < this.dashingUntil + 220 || now - this.lastDashAt <= 340;
    if (isDashSpecial) {
      this.specialCdUntil = now + Math.round(wpn.specialCooldownMs * 0.85 * this.getStyleAtkCdMult());
      if (wpn.id === 'sword') {
        this.performSwordIaijutsu(true);
      } else if (wpn.id === 'bow') {
        this.performBowPowerShot(true);
      } else {
        this.performBladesBlitz(true);
      }
      return;
    }

    this.specialCdUntil = now + Math.round(wpn.specialCooldownMs * this.getStyleAtkCdMult());

    const angle = this.getAimAngle();
    this.player.setFlipX(Math.cos(angle) < 0);
    this.playHeroActionAnim('special');

    let dmg = wpn.baseDamage * 1.45 * this.getGlobalDmgMult();
    const aresSp = this.boons.get('ares_special');
    if (aresSp) dmg *= 1.25;

    const col = this.getSlotColor('special', wpn.accentColor);

    if (wpn.id === 'sword') {
      sfx.playExplosion();
      this.cameraPunch(0.032, 145, 0.007);
      this.vfx.spawnGroundSlam(this.player.x, this.player.y, 140, col);
      this.checkBarrelsHit(this.player.x, this.player.y, 150, angle, Math.PI);
      for (const e of [...this.enemies]) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
        if (d <= 150) {
          const pushAng = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
          this.addPosture(e, 44, true);
          this.damageEnemy(e, dmg * 1.25, 'special', pushAng, 310, true);
        }
      }
    } else if (wpn.id === 'bow') {
      sfx.playBowShot();
      this.vfx.spawnBowRelease(this.player.x, this.player.y, angle, col, true);
      const count = this.hammers.has('bow_ricochet') ? 3 : 2;
      const bounce = this.hammers.has('bow_ricochet') ? 1 : 0;
      const isChiron = this.getAspectLevel('bow') === 2;
      const markTarget = isChiron
        ? this.enemies.find((e) => e.id === this.chironMarkedId && e.sprite.active && e.chironMarkUntil > now)
        : undefined;
      for (let i = -count; i <= count; i++) {
        this.spawnPlayerProjectile(
          angle + i * 0.14,
          dmg * (isChiron && markTarget ? 0.85 : 0.72),
          570,
          'special',
          1,
          false,
          bounce,
          false,
          false,
          markTarget?.id
        );
      }
    } else {
      sfx.playSlash(3);
      if (this.hammers.has('blades_fan')) {
        for (const off of [-0.26, 0, 0.26]) {
          this.spawnPlayerProjectile(angle + off, dmg * 0.85, 490, 'special', 99, true);
        }
      } else {
        this.spawnPlayerProjectile(angle, dmg * 0.95, 490, 'special', 99, true);
      }
    }

    if (aresSp) {
      const wheelDirs = aresSp.rarity === 'epic' ? [-0.24, 0, 0.24] : [-0.24, 0.24];
      for (const off of wheelDirs) {
        this.spawnTravelingBladeWheel(this.player.x, this.player.y, angle + off, aresSp.value, aresSp.rarity);
      }
    }

    const nyxSp = this.boons.get('nyx_special');
    if (nyxSp) {
      const swCount = nyxSp.rarity === 'epic' ? 5 : nyxSp.rarity === 'rare' ? 4 : 3;
      for (let i = 0; i < swCount; i++) {
        const off = (i - (swCount - 1) / 2) * 0.28;
        this.spawnHomingSoulSword(this.player.x, this.player.y, angle + off, nyxSp.value);
      }
    }

    const demSp = this.boons.get('demeter_special');
    if (demSp) {
      this.vfx.spawnFrostNova(this.player.x, this.player.y, this.getBoonRarity('demeter_special'));
      const vx = this.player.x + Math.cos(angle) * 105;
      const vy = this.player.y + Math.sin(angle) * 105;
      this.spawnHazardZone('demeter_vortex', vx, vy, 175, demSp.value, demSp.rarity, 2200);
      for (const e of [...this.enemies]) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y) <= 135) {
          this.applyChill(e, 2);
          this.damageEnemy(e, demSp.value, 'special', angle, 80);
        }
      }
    }
  }

  private performDash() {
    const now = this.time.now;
    if (this.dashCharges <= 0 || now < this.dashingUntil - 65) return;

    // 0-frame attack cancel!
    this.playerAnimLockUntil = 0;
    this.attackCdUntil = Math.min(this.attackCdUntil, now + 35);
    this.lastDashAt = now;
    this.dashCharges--;
    const nyxDash = this.boons.get('nyx_dash');
    const rechargeMs = nyxDash ? Math.round(850 * 0.78) : 850;
    if (this.dashRechargeAt <= now) {
      this.dashRechargeAt = now + rechargeMs;
    }

    const startX = this.player.x;
    const startY = this.player.y;

    // Phantom Perfect Dodge check against nearby windup/strike enemies or incoming projectiles!
    const nearThreat = this.enemies.some(
      (e) =>
        e.sprite.active &&
        e.kind !== 'dummy' &&
        e.kind !== 'totem' &&
        ((e.aiState === 'windup' && e.aiTimer <= 320) || e.aiState === 'strike') &&
        Phaser.Math.Distance.Between(startX, startY, e.sprite.x, e.sprite.y) <= 145
    );
    const nearProj = this.enemyProjectiles.some(
      (ep) => !ep.practiceOnly && Phaser.Math.Distance.Between(startX, startY, ep.sprite.x, ep.sprite.y) <= 78
    );
    if (now >= this.phantomDodgeCdUntil && (nearThreat || nearProj)) {
      this.phantomDodgeCdUntil = now + 950;
      this.dashCharges = Math.min(this.maxDashCharges, this.dashCharges + 1);
      this.specialCdUntil = 0;
      this.guaranteedNextCrit = true;
      this.addStyle(165, 2);
      this.vfx.spawnPhantomAfterimage(
        startX,
        startY,
        this.player.texture.key,
        this.player.frame.name,
        this.player.flipX,
        HERO_SCALE,
        0x00e5ff
      );
      this.vfx.spawnShockwave(startX, startY, 92, 0x00e5ff, 210);
      this.floatText(startX, startY - 46, '👻 极限幻影闪避! 特技已刷新', '#00e5ff', 15);
      this.triggerSlowMo(0.38, 130);
    }

    // Hammer: Twin Blades Shadowstep teleports directly behind nearby enemy!
    if (this.save.selectedWeapon === 'blades' && this.hammers.has('blades_shadowstep')) {
      const target = this.enemies
        .filter((e) => e.sprite.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y) <= 220)
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(this.player.x, this.player.y, a.sprite.x, a.sprite.y) -
            Phaser.Math.Distance.Between(this.player.x, this.player.y, b.sprite.x, b.sprite.y)
        )[0];
      if (target) {
        const safeStep = this.resolveSafePlayerPos(
          this.player.x,
          this.player.y,
          target.sprite.x - Math.cos(target.facingAngle) * 44,
          target.sprite.y - Math.sin(target.facingAngle) * 44
        );
        this.player.setPosition(safeStep.x, safeStep.y);
        this.guaranteedNextCrit = true;
        this.vfx.spawnNyxVoidCrit(safeStep.x, safeStep.y, target.facingAngle, 'epic');
        this.floatText(safeStep.x, safeStep.y - 36, '👤 鬼影瞬步!', '#ce93d8', 14);
      }
    }

    const mv = this.getMoveInputVector();
    let dx = mv.mx;
    let dy = mv.my;
    if (dx === 0 && dy === 0) {
      const ang = this.getAimAngle();
      dx = Math.cos(ang);
      dy = Math.sin(ang);
    }
    this.dashDir.set(dx, dy).normalize();
    this.dashingUntil = now + (this.hammers.has('sword_lunge') && this.save.selectedWeapon === 'sword' ? 230 : 185);
    this.invulnUntil = Math.max(this.invulnUntil, now + 260);
    sfx.playDash();

    const dashColor = this.getSlotColor('dash', 0x4dd0e1);

    const dust = this.add.sprite(startX, startY + 20, 'env_dust').setScale(1.1).setAlpha(0.75).setDepth(7);
    dust.play('env_dust_anim');
    dust.once('animationcomplete', () => dust.destroy());

    const zeusDash = this.boons.get('zeus_dash');
    if (zeusDash) {
      sfx.playThunder();
      this.vfx.spawnSkyThunder(startX, startY, zeusDash.rarity);
      this.spawnHazardZone('zeus_storm', startX, startY, 110, Math.round(zeusDash.value * 0.75), zeusDash.rarity, 2200);
      const zapTargets = this.enemies
        .filter((e) => e.sprite.active && Phaser.Math.Distance.Between(startX, startY, e.sprite.x, e.sprite.y) <= 220)
        .slice(0, 3);
      for (const e of zapTargets) {
        this.vfx.spawnLightningBolt(startX, startY, e.sprite.x, e.sprite.y, zeusDash.rarity);
        this.triggerDuoZeusAres(e);
        this.damageEnemy(e, zeusDash.value, 'proc', 0, 110, true);
      }
    }
    const aresDash = this.boons.get('ares_dash');
    if (aresDash) {
      this.vfx.spawnBladeRift(startX, startY, aresDash.rarity, 720);
      this.spawnHazardZone('ares_vortex', startX, startY, 95, aresDash.value, aresDash.rarity, 1800);
    }
    const demDash = this.boons.get('demeter_dash');
    if (demDash) {
      this.vfx.spawnFrostNova(startX, startY, demDash.rarity);
      this.spawnHazardZone('demeter_vortex', startX, startY, 165, demDash.value, demDash.rarity, 1700);
    }
    if (nyxDash) {
      const swCount = nyxDash.rarity === 'epic' ? 3 : 2;
      const aimAng = Math.atan2(this.dashDir.y, this.dashDir.x);
      for (let i = 0; i < swCount; i++) {
        this.spawnHomingSoulSword(startX, startY, aimAng + (i - (swCount - 1) / 2) * 0.45, nyxDash.value);
      }
    }

    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 40, () => {
        if (this.isDead) return;
        const ghost = this.add
          .image(this.player.x, this.player.y, this.player.texture.key, this.player.frame.name)
          .setScale(HERO_SCALE)
          .setFlipX(this.player.flipX)
          .setTint(dashColor)
          .setAlpha(0.55)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(8);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => ghost.destroy() });
      });
    }
    this.syncHud();
  }

  private performGodCall() {
    if (this.wrath < 100) return;
    this.wrath = 0;

    const domGod = this.getDominantGod();
    const ultMeta: Record<GodId, { icon: string; title: string; sub: string; hex: string; rgb: [number, number, number] }> = {
      zeus: { icon: '⚡', title: '奥林匹斯 · 万雷天牢', sub: '宙斯神罚降临 · 高频追踪落雷轰击全场', hex: '#ffd54f', rgb: [255, 224, 130] },
      ares: { icon: '🔥', title: '斯巴达 · 血战剑域', sub: '阿瑞斯神罚降临 · 剑刃旋风与灭世巨剑齐落', hex: '#ff5252', rgb: [255, 95, 82] },
      demeter: { icon: '❄️', title: '极北 · 永冬冰狱', sub: '德墨忒尔神罚降临 · 极寒冰柱连环碎裂冻结一切', hex: '#4dd0e1', rgb: [100, 225, 240] },
      nyx: { icon: '🩸', title: '塔尔塔罗斯 · 冥夜次元斩', sub: '倪克斯神罚降临 · 空间裂隙撕碎万象并汲取魂魄', hex: '#ce93d8', rgb: [206, 147, 216] },
    };
    const m = ultMeta[domGod];
    const [r, g, b] = m.rgb;

    sfx.playThunder();
    sfx.playExplosion();
    this.cameras.main.flash(240, r, g, b);
    this.cameraPunch(0.055, 320, 0.013);
    this.ui.triggerUltimateBanner(m.icon, m.title, m.sub, m.hex);

    this.triggerSlowMo(0.36, 260);

    const coords = this.enemies.map((e) => ({ x: e.sprite.x, y: e.sprite.y }));
    this.vfx.spawnUltimateGodCall(domGod, this.player.x, this.player.y, ARENA_W, ARENA_H, coords);

    const callDmg = 115 * this.getGlobalDmgMult();
    for (const e of [...this.enemies]) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
      if (d <= 440) {
        const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
        this.addPosture(e, 48, true);
        this.damageEnemy(e, callDmg, 'special', ang, 340, true);
        if (domGod === 'demeter') this.applyChill(e, 4);
      }
    }
    this.syncHud();
  }

  private getBoonAtkCdMult(): number {
    let m = 1.0;
    if (this.boons.has('zeus_attack')) m *= 0.82;
    if (this.boons.has('zeus_passive')) m *= 0.87;
    if (this.boons.has('nyx_attack')) m *= 0.87;
    return m;
  }

  private triggerOnAttackMutations(angle: number, dmg: number, slashMult: number, isBow: boolean) {
    const aresAtk = this.boons.get('ares_attack');
    if (aresAtk) {
      this.aresWheelCounter++;
      if (this.aresWheelCounter % 2 === 0) {
        this.spawnTravelingBladeWheel(
          this.player.x,
          this.player.y,
          angle,
          Math.round(aresAtk.value * 0.72 * this.getGlobalDmgMult()),
          aresAtk.rarity
        );
      }
    }

    const nyxAtk = this.boons.get('nyx_attack');
    if (nyxAtk) {
      this.spawnNyxAttackEcho(angle, dmg * 0.55, slashMult, isBow);
    }
  }

  private spawnNyxAttackEcho(angle: number, echoDmg: number, slashMult: number, isBow: boolean) {
    const sx = this.player.x - Math.cos(angle) * 14;
    const sy = this.player.y - Math.sin(angle) * 14;
    this.vfx.spawnPhantomAfterimage(
      sx,
      sy,
      this.player.texture.key,
      this.player.frame.name,
      Math.cos(angle) < 0,
      HERO_SCALE,
      0xe040fb
    );

    this.time.delayedCall(85, () => {
      if (this.isDead || this.ui.hasModal()) return;
      if (isBow) {
        this.vfx.spawnBowRelease(sx, sy, angle, 0xe040fb, false);
        this.spawnPlayerProjectile(angle, echoDmg, 680, 'proc', 3, false, 0, false, false);
        return;
      }
      const wpn = WEAPONS[this.save.selectedWeapon];
      this.vfx.spawnMeleeSlash({
        x: sx,
        y: sy,
        angle,
        color: 0xe040fb,
        comboStep: 2,
        isHeavy: false,
        isDashStrike: false,
        isBlades: wpn.id === 'blades',
        scaleMult: slashMult * 1.05,
      });
      const reach = wpn.range * slashMult * 1.05;
      for (const e of [...this.enemies]) {
        const dist = Phaser.Math.Distance.Between(sx, sy, e.sprite.x, e.sprite.y);
        if (dist <= reach + (e.kind === 'boss' ? 32 : 14)) {
          const angToE = Phaser.Math.Angle.Between(sx, sy, e.sprite.x, e.sprite.y);
          if (Math.abs(Phaser.Math.Angle.Wrap(angToE - angle)) <= 1.35 || dist < 40) {
            this.damageEnemy(e, echoDmg, 'proc', angle, 80, false);
          }
        }
      }
    });
  }

  private spawnHazardZone(
    kind: HazardZone['kind'],
    x: number,
    y: number,
    radius: number,
    damage: number,
    rarity: Rarity,
    durationMs: number
  ) {
    const zx = Phaser.Math.Clamp(x, TILE * 1.8, ARENA_W - TILE * 1.8);
    const zy = Phaser.Math.Clamp(y, TILE * 2.4, ARENA_H - TILE * 1.8);
    if (this.hazardZones.length >= 8) {
      const old = this.hazardZones.shift();
      old?.ringObj.destroy();
      old?.coreObj.destroy();
    }

    let ringTex = 'tex_magic_circle';
    let coreTex = 'tex_circle_glow';
    let ringCol = 0xffd54f;
    let coreCol = 0xffe082;
    let ringScale = radius / 115;
    let coreScale = radius / 65;
    let coreAlpha = 0.35;
    let tickInterval = 420;

    if (kind === 'ares_vortex') {
      ringTex = 'tex_blade_rift';
      coreTex = 'tex_slash_thin';
      ringCol = 0xff3d00;
      coreCol = 0xffab40;
      ringScale = radius / 85;
      coreScale = radius / 95;
      coreAlpha = 0.75;
      tickInterval = 270;
    } else if (kind === 'demeter_vortex') {
      ringTex = 'tex_snowflake_ring';
      coreTex = 'tex_void_rift';
      ringCol = 0x4dd0e1;
      coreCol = 0x00e5ff;
      ringScale = radius / 95;
      coreScale = radius / 80;
      coreAlpha = 0.55;
      tickInterval = 400;
    }

    const ringObj = this.add
      .image(zx, zy, ringTex)
      .setTint(ringCol)
      .setScale(ringScale)
      .setAlpha(0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(5);
    const coreObj = this.add
      .image(zx, zy, coreTex)
      .setTint(coreCol)
      .setScale(coreScale)
      .setAlpha(coreAlpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(5);

    this.hazardZones.push({
      kind,
      x: zx,
      y: zy,
      radius,
      damage,
      rarity,
      lifeMs: durationMs,
      tickCd: 90,
      tickInterval,
      ringObj,
      coreObj,
    });
  }

  private updateHazardZones(delta: number) {
    const dt = delta / 1000;
    for (let i = this.hazardZones.length - 1; i >= 0; i--) {
      const z = this.hazardZones[i];
      z.lifeMs -= delta;
      z.tickCd -= delta;

      if (z.kind === 'ares_vortex') {
        z.ringObj.rotation += 14 * dt;
        z.coreObj.rotation -= 18 * dt;
      } else if (z.kind === 'demeter_vortex') {
        z.ringObj.rotation -= 7 * dt;
        z.coreObj.rotation += 5 * dt;
        // Gravity pull enemies toward frost black-hole center!
        for (const e of this.enemies) {
          if (!e.sprite.active || e.kind === 'boss' || e.kind === 'dummy' || e.kind === 'totem') continue;
          const dist = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, z.x, z.y);
          if (dist > 22 && dist <= z.radius * 1.25) {
            const pullAng = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, z.x, z.y);
            const nx = Phaser.Math.Clamp(e.sprite.x + Math.cos(pullAng) * 145 * dt, TILE * 1.5, ARENA_W - TILE * 1.5);
            const ny = Phaser.Math.Clamp(e.sprite.y + Math.sin(pullAng) * 145 * dt, TILE * 2.2, ARENA_H - TILE * 1.5);
            if (!this.isInsidePit(nx, ny, 4)) {
              e.sprite.setPosition(nx, ny);
            }
          }
        }
      } else {
        z.ringObj.rotation += 2.5 * dt;
      }

      if (z.lifeMs < 350) {
        const fade = Math.max(0, z.lifeMs / 350);
        z.ringObj.setAlpha(0.75 * fade);
        z.coreObj.setAlpha(0.45 * fade);
      }

      if (z.tickCd <= 0) {
        z.tickCd = z.tickInterval;
        if (z.kind === 'zeus_storm') {
          const targets = this.enemies
            .filter((e) => e.sprite.active && Phaser.Math.Distance.Between(z.x, z.y, e.sprite.x, e.sprite.y) <= z.radius)
            .slice(0, 4);
          for (const e of targets) {
            this.vfx.spawnLightningBolt(z.x, z.y, e.sprite.x, e.sprite.y, z.rarity);
            this.triggerDuoZeusAres(e);
            this.damageEnemy(e, z.damage, 'proc', 0, 0, true);
          }
        } else if (z.kind === 'ares_vortex') {
          this.vfx.spawnRadialSparks(z.x, z.y, 0xff5252, 5, 25, z.radius * 0.8);
          for (const e of [...this.enemies]) {
            if (e.sprite.active && Phaser.Math.Distance.Between(z.x, z.y, e.sprite.x, e.sprite.y) <= z.radius) {
              this.damageEnemy(e, z.damage, 'proc', 0, 30, true);
            }
          }
        } else {
          let duoZapped = 0;
          const hasDuoZD = this.boons.has('duo_zeus_demeter');
          for (const e of [...this.enemies]) {
            if (e.sprite.active && Phaser.Math.Distance.Between(z.x, z.y, e.sprite.x, e.sprite.y) <= z.radius) {
              this.applyChill(e, 1);
              this.damageEnemy(e, z.damage, 'proc', 0, 0, true);
              if (hasDuoZD && duoZapped < 2 && e.sprite.active) {
                duoZapped++;
                this.vfx.spawnLightningBolt(z.x, z.y, e.sprite.x, e.sprite.y, 'epic');
                this.damageEnemy(e, 24 * this.getGlobalDmgMult(), 'proc', 0, 0, true);
              }
            }
          }
        }
      }

      if (z.lifeMs <= 0) {
        z.ringObj.destroy();
        z.coreObj.destroy();
        this.hazardZones.splice(i, 1);
      }
    }
  }

  private trimProjectilesIfNeeded() {
    if (this.playerProjectiles.length >= 65) {
      const old = this.playerProjectiles.shift();
      old?.sprite.destroy();
    }
  }

  private spawnTravelingBladeWheel(x: number, y: number, angle: number, damage: number, rarity: Rarity) {
    this.trimProjectilesIfNeeded();
    sfx.playBladeRift();
    const sp = this.physics.add
      .image(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, 'tex_blade_rift')
      .setScale(rarity === 'epic' ? 0.78 : 0.62)
      .setTint(0xff3d00)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14);
    this.playerProjectiles.push({
      sprite: sp,
      vx: Math.cos(angle) * 235,
      vy: Math.sin(angle) * 235,
      damage,
      postureDmg: 10,
      source: 'proc',
      pierce: 99,
      bouncesLeft: 1,
      hitIds: new Set(),
      lifeMs: 1450,
      trailCd: 0,
      spinSpeed: 18,
      isBladeWheel: true,
      rehitCd: 300,
    });
  }

  private spawnHomingSoulSword(x: number, y: number, launchAngle: number, damage: number) {
    this.trimProjectilesIfNeeded();
    const sp = this.physics.add
      .image(x + Math.cos(launchAngle) * 18, y + Math.sin(launchAngle) * 18, 'wpn_sword')
      .setScale(2.0)
      .setRotation(launchAngle + Math.PI / 4)
      .setTint(0xe040fb)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.playerProjectiles.push({
      sprite: sp,
      vx: Math.cos(launchAngle) * 620,
      vy: Math.sin(launchAngle) * 620,
      damage,
      postureDmg: 14,
      source: 'proc',
      pierce: 2,
      bouncesLeft: 0,
      hitIds: new Set(),
      lifeMs: 1600,
      trailCd: 0,
      isSoulSword: true,
      bypassShield: true,
    });
  }

  private spawnFrostLanceBurst(x: number, y: number, damage: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.trimProjectilesIfNeeded();
      const ang = (Math.PI * 2 * i) / count;
      const sp = this.physics.add
        .image(x + Math.cos(ang) * 18, y + Math.sin(ang) * 18, 'tex_ice_shard')
        .setScale(1.15)
        .setRotation(ang + Math.PI / 2)
        .setTint(0x80deea)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(14);
      this.playerProjectiles.push({
        sprite: sp,
        vx: Math.cos(ang) * 540,
        vy: Math.sin(ang) * 540,
        damage,
        postureDmg: 8,
        source: 'proc',
        pierce: 4,
        bouncesLeft: 0,
        hitIds: new Set(),
        lifeMs: 850,
        trailCd: 0,
        isFrostLance: true,
      });
    }
  }

  private spawnPlayerProjectile(
    angle: number,
    damage: number,
    speed: number,
    source: 'attack' | 'special' | 'proc',
    pierce: number,
    boomerang: boolean,
    bouncesLeft = 0,
    explosive = false,
    isWave = false,
    homingTargetId?: number,
    bypassShield = false
  ) {
    this.trimProjectilesIfNeeded();
    const tex = isWave ? 'tex_slash_thin' : boomerang ? 'wpn_blades' : 'hd_arrow';
    const demAtkBoost = source === 'attack' && this.boons.has('demeter_attack') ? 1.2 : 1.0;
    const col = homingTargetId
      ? 0xffd54f
      : source === 'proc'
      ? 0xe040fb
      : this.getSlotColor(source, isWave ? 0xff5252 : boomerang ? 0xce93d8 : 0x80deea);
    const sp = this.physics.add
      .image(this.player.x + Math.cos(angle) * 24, this.player.y + Math.sin(angle) * 24, tex)
      .setScale((isWave ? 0.65 : boomerang ? 2.5 : homingTargetId || bypassShield ? 0.86 : 0.72) * demAtkBoost)
      .setRotation(boomerang ? angle + Math.PI / 2 : angle)
      .setTint(col)
      .setBlendMode(isWave || bypassShield || source === 'proc' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL)
      .setDepth(13);

    this.playerProjectiles.push({
      sprite: sp,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      postureDmg: isWave ? 12 : bypassShield ? 30 : 16,
      source,
      pierce,
      bouncesLeft,
      explosive,
      hitIds: new Set(),
      lifeMs: boomerang ? 1400 : isWave ? 650 : homingTargetId ? 1350 : 950,
      trailCd: 0,
      boomerang,
      returning: false,
      spinSpeed: boomerang ? 18 : 0,
      homingTargetId,
      bypassShield,
    });
  }

  private getSlotColor(slot: 'attack' | 'special' | 'dash' | 'proc', fallback: number): number {
    if (slot === 'proc') return fallback;
    for (const b of this.boons.values()) {
      if (b.def.slot === slot) return b.def.colorNum;
    }
    return fallback;
  }

  private checkBarrelsHit(x: number, y: number, reach: number, angle: number, cone: number) {
    for (const b of [...this.barrels]) {
      if (b.triggered) continue;
      const d = Phaser.Math.Distance.Between(x, y, b.x, b.y);
      if (d <= reach) {
        const angToB = Phaser.Math.Angle.Between(x, y, b.x, b.y);
        if (Math.abs(Phaser.Math.Angle.Wrap(angToB - angle)) <= cone || d < 42) {
          this.triggerBarrel(b);
        }
      }
    }
  }

  private damageEnemy(
    e: EnemyEntity,
    rawDmg: number,
    source: 'attack' | 'special' | 'proc',
    knockAng: number,
    knockForce: number,
    bypassShield = false
  ) {
    if (!e.sprite.active || e.hp <= 0) return;

    // 1. Check Shield Knight frontal block (unless broken or bypassed/backstabbed)
    let isBackstab = false;
    if (e.kind !== 'dummy' && e.kind !== 'totem') {
      const angFromEnemyToPlayer = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y);
      const facingDiff = Math.abs(Phaser.Math.Angle.Wrap(angFromEnemyToPlayer - e.facingAngle));

      if (e.kind === 'ice' && !bypassShield && e.brokenUntil <= this.time.now && facingDiff < 1.32) {
        sfx.playShieldBlock();
        this.vfx.spawnHitImpact(e.sprite.x, e.sprite.y, angFromEnemyToPlayer, 0x4dd0e1, false);
        this.floatText(e.sprite.x, e.sprite.y - 38, '🛡️ 正面格挡!', '#80deea', 12);
        const blockedDmg = Math.max(1, Math.round(rawDmg * 0.15));
        e.hp -= blockedDmg;
        if (e.hp <= 0) this.killEnemy(e);
        return;
      }

      if (facingDiff > 2.0) {
        isBackstab = true;
      }
    }

    // 2. Check Ward Totem protection!
    let wardMult = 1.0;
    if (e.kind !== 'totem' && e.kind !== 'dummy') {
      const hasTotem = this.enemies.some((t) => t.kind === 'totem' && t.sprite.active);
      if (hasTotem) wardMult = 0.55;
    }

    // 3. Duo Zeus × Demeter chilled vulnerability
    let chillVuln = 1.0;
    const duoZD = this.boons.get('duo_zeus_demeter');
    if (duoZD && e.chillUntil > this.time.now) {
      chillVuln = 1 + duoZD.value / 100;
    }

    let critChance = 0.05 + (this.getStyleState()?.critBonus ?? 0);
    if (this.save.selectedWeapon === 'sword' && this.getAspectLevel('sword') === 2 && source !== 'proc') {
      critChance += 0.2;
    }
    const nyxAtk = this.boons.get('nyx_attack');
    const nyxSp = this.boons.get('nyx_special');
    if (source === 'attack' && nyxAtk) critChance += nyxAtk.value / 100;
    if (source === 'special' && nyxSp) critChance += nyxSp.value / 100;

    const nemesisActive =
      this.save.selectedWeapon === 'sword' &&
      this.getAspectLevel('sword') === 2 &&
      this.time.now < this.nemesisBuffUntil &&
      source !== 'proc';

    let isCrit = source !== 'proc' && (nemesisActive || Math.random() < critChance || this.guaranteedNextCrit);
    if (source !== 'proc' && this.guaranteedNextCrit) {
      this.guaranteedNextCrit = false;
      isCrit = true;
    }
    if (nemesisActive) {
      this.hp = Math.min(this.maxHp, this.hp + 2);
    }

    const backMult = isBackstab ? 1.35 : 1.0;
    const finalDmg = Math.max(
      1,
      Math.round(rawDmg * wardMult * chillVuln * backMult * (isCrit ? 2.2 : 1.0))
    );

    // Elite Super-Armor absorbs damage & blocks knockback until shattered!
    if (e.armorHp > 0 && e.kind !== 'dummy') {
      const armorDmg = Math.round(finalDmg * (source === 'special' || bypassShield ? 2.2 : 1.0));
      e.armorHp = Math.max(0, e.armorHp - armorDmg);
      knockForce = 0;
      this.floatText(e.sprite.x, e.sprite.y - 42, `🛡️-${armorDmg}`, '#00e5ff', isCrit ? 15 : 12);
      if (e.armorHp === 0) {
        sfx.playArmorBreak();
        this.vfx.spawnArmorShatter(e.sprite.x, e.sprite.y);
        e.armorBarBg?.destroy();
        e.armorBarBg = undefined;
        e.armorBarFill?.destroy();
        e.armorBarFill = undefined;
        e.armorLabel?.destroy();
        e.armorLabel = undefined;
        this.addPosture(e, Math.round(e.maxPosture * 0.55), true);
        this.floatText(e.sprite.x, e.sprite.y - 58, '💥 霸体击碎!', '#00e5ff', 17);
      }
    } else if (e.kind !== 'dummy') {
      e.hp -= finalDmg;
    }

    // Chiron Aspect II Bow Mark on Left-Click Arrows
    if (this.save.selectedWeapon === 'bow' && this.getAspectLevel('bow') === 2 && source === 'attack' && e.kind !== 'totem') {
      this.chironMarkedId = e.id;
      e.chironMarkUntil = this.time.now + 4000;
    }

    // Gilgamesh Aspect II Claw Maim/Bleed on hits
    if (this.save.selectedWeapon === 'blades' && this.getAspectLevel('blades') === 2 && source !== 'proc' && e.kind !== 'totem') {
      e.maimTimer = 1400;
      e.maimDmg = Math.round(42 * this.getGlobalDmgMult());
    }

    e.sprite.setTintFill(0xffffff);
    this.time.delayedCall(75, () => {
      if (e.sprite.active) {
        if (e.chillUntil > this.time.now) e.sprite.setTint(0x80deea);
        else if (e.kind === 'ghoul') e.sprite.setTint(0xff8a80);
        else e.sprite.clearTint();
      }
    });

    this.tweens.killTweensOf(e.sprite);
    e.sprite.setScale(e.baseScale * 1.18, e.baseScale * 0.84);
    this.tweens.add({
      targets: e.sprite,
      scaleX: e.baseScale,
      scaleY: e.baseScale,
      duration: 120,
      ease: 'Back.easeOut',
    });

    const impactColor =
      source === 'proc'
        ? 0x80deea
        : this.getSlotColor(source === 'special' ? 'special' : 'attack', WEAPONS[this.save.selectedWeapon].accentColor);
    const hitAngle = knockForce > 0 ? knockAng : Phaser.Math.Angle.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
    this.vfx.spawnHitImpact(e.sprite.x, e.sprite.y, hitAngle, impactColor, isCrit);

    if (isBackstab && source !== 'proc') {
      this.addPosture(e, 14, true);
      this.floatText(e.sprite.x, e.sprite.y - 52, '🗡️ 背刺!', '#ce93d8', 12);
    }

    const nyxP = this.boons.get('nyx_passive');
    if (isCrit) {
      this.cameraPunch(0.02, 85, 0.0045);
      if (nyxAtk || nyxSp) {
        const nr = nyxSp && source === 'special' ? nyxSp.rarity : nyxAtk?.rarity ?? 'rare';
        this.vfx.spawnNyxVoidCrit(e.sprite.x, e.sprite.y, hitAngle, nr);
      }
      if (nyxP && this.time.now - this.lastCritSwordAt >= 150) {
        this.lastCritSwordAt = this.time.now;
        this.spawnHomingSoulSword(
          this.player.x,
          this.player.y,
          hitAngle + Phaser.Math.FloatBetween(-0.5, 0.5),
          nyxP.value
        );
      }
      // Duo Ares × Nyx spawns Blade Rift & Traveling Blade Wheel on crit!
      if (this.boons.has('duo_ares_nyx') && source !== 'proc') {
        this.vfx.spawnBladeRift(e.sprite.x, e.sprite.y, 'epic', 650);
        this.spawnTravelingBladeWheel(e.sprite.x, e.sprite.y, hitAngle, 28 * this.getGlobalDmgMult(), 'epic');
      }
    }

    if (e.kind !== 'boss' && e.kind !== 'dummy' && e.kind !== 'totem' && knockForce > 0) {
      const kf = knockForce * (e.kind === 'ghoul' ? 1.55 : 1.0);
      const b = e.sprite.body as Phaser.Physics.Arcade.Body;
      b.setVelocity(Math.cos(knockAng) * kf, Math.sin(knockAng) * kf);
    }

    sfx.playHit(isCrit);
    this.addStyle(source === 'proc' ? 8 : 26, source === 'proc' ? 0 : 1);
    this.floatText(
      e.sprite.x + Phaser.Math.Between(-12, 12),
      e.sprite.y - 34,
      isCrit ? `${finalDmg}!` : `${finalDmg}`,
      isCrit ? '#ffd54f' : source === 'proc' ? '#80deea' : '#ffffff',
      isCrit ? 18 : 13
    );

    const zeusP = this.boons.get('zeus_passive');
    this.wrath = Math.min(100, this.wrath + (zeusP ? 5.8 : 4.0));

    if (source !== 'proc') {
      if (zeusP) {
        this.zeusOverloadCounter++;
        if (this.zeusOverloadCounter >= 5) {
          this.zeusOverloadCounter = 0;
          const boltTarget = e.sprite.active ? e : this.enemies.find((x) => x.sprite.active);
          if (boltTarget) {
            sfx.playThunder();
            this.vfx.spawnSkyThunder(boltTarget.sprite.x, boltTarget.sprite.y, zeusP.rarity);
            this.triggerDuoZeusAres(boltTarget);
            this.damageEnemy(boltTarget, zeusP.value, 'proc', 0, 60, true);
          }
        }
      }

      const zAtk = this.boons.get('zeus_attack');
      const zSp = this.boons.get('zeus_special');
      if (source === 'attack' && zAtk) {
        this.triggerChainLightning(e, zAtk.value, zAtk.rarity);
      } else if (source === 'special' && zSp) {
        sfx.playThunder();
        this.vfx.spawnSkyThunder(e.sprite.x, e.sprite.y, zSp.rarity);
        this.triggerDuoZeusAres(e);
        if (this.time.now - this.lastStormZoneAt >= 260) {
          this.lastStormZoneAt = this.time.now;
          this.spawnHazardZone('zeus_storm', e.sprite.x, e.sprite.y, 115, Math.round(zSp.value * 0.65), zSp.rarity, 2400);
        }
        this.damageEnemy(e, zSp.value, 'proc', 0, 0, true);
      }

      const aAtk = this.boons.get('ares_attack');
      const aSp = this.boons.get('ares_special');
      if ((source === 'attack' && aAtk) || (source === 'special' && aSp)) {
        const dVal = aAtk ? aAtk.value : Math.round((aSp?.value ?? 24) * 1.1);
        e.doomTimer = 620;
        e.doomDamage = dVal;
        e.doomColor = 0xff5252;
        e.doomRarity = aAtk ? aAtk.rarity : aSp?.rarity ?? 'common';
      }

      if (source === 'attack' && this.boons.has('demeter_attack')) {
        this.applyChill(e, 2);
      }
    }

    // NightBorne Boss 75% HP Pack Summon & Phase 2 Awakening at 50% HP!
    if (e.kind === 'boss' && !e.bossMidSummoned && e.hp <= e.maxHp * 0.75 && e.hp > 0) {
      e.bossMidSummoned = true;
      this.floatText(e.sprite.x, e.sprite.y - 68, '🔥 魔王召唤亡灵狂潮!', '#ff9100', 17);
      for (const ox of [-110, -45, 45, 110]) {
        this.spawnEnemy(
          'ghoul',
          Phaser.Math.Clamp(e.sprite.x + ox, TILE * 2, ARENA_W - TILE * 2),
          Phaser.Math.Clamp(e.sprite.y + 40, TILE * 2.5, ARENA_H - TILE * 2),
          false
        );
      }
    }

    if (e.kind === 'boss' && !e.bossEnraged && e.hp <= e.maxHp * 0.5 && e.hp > 0) {
      e.bossEnraged = true;
      bgm.setMode('boss_p2');
      sfx.playBossRoar();
      this.cameraPunch(0.055, 280, 0.012);
      this.ui.triggerUltimateBanner('👹', '夜魔觉醒 · 永夜狂暴', '魔王解除封印：三连暗影冲锋 + 冥渊十字死光!', '#ff1744');
      this.vfx.spawnGroundSlam(e.sprite.x, e.sprite.y, 180, 0xff1744);
      e.speed *= 1.28;
      e.aura?.setTint(0xe040fb).setScale(2.9);
      this.spawnEnemy('imp', Phaser.Math.Clamp(e.sprite.x - 95, TILE * 2, ARENA_W - TILE * 2), e.sprite.y, true);
      for (const ox of [-60, 0, 60]) {
        this.spawnEnemy(
          'ghoul',
          Phaser.Math.Clamp(e.sprite.x + ox, TILE * 2, ARENA_W - TILE * 2),
          Phaser.Math.Clamp(e.sprite.y + 52, TILE * 2.5, ARENA_H - TILE * 2),
          false
        );
      }
    }

    if (e.hp <= 0 && e.kind !== 'dummy') {
      this.killEnemy(e);
    }
  }

  private triggerDuoZeusAres(e: EnemyEntity) {
    const duoZA = this.boons.get('duo_zeus_ares');
    if (duoZA && e.doomTimer > 0 && e.sprite.active) {
      e.doomTimer = 0;
      e.doomSigil?.destroy();
      e.doomSigil = undefined;
      this.vfx.spawnDoomDetonation(e.sprite.x, e.sprite.y, 'epic');
      this.vfx.spawnSkyThunder(e.sprite.x, e.sprite.y, 'epic');
      this.floatText(e.sprite.x, e.sprite.y - 54, '⚡🔥 雷火天劫!', '#ffb300', 15);
      this.damageEnemy(e, e.doomDamage + duoZA.value, 'proc', 0, 60, true);
    }
  }

  private triggerChainLightning(origin: EnemyEntity, boltDmg: number, rarity: Rarity = 'common') {
    sfx.playThunder();
    const maxTargets = rarity === 'epic' ? 8 : rarity === 'rare' ? 6 : 4;
    const candidates = this.enemies
      .filter((other) => other.id !== origin.id && other.sprite.active)
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(origin.sprite.x, origin.sprite.y, a.sprite.x, a.sprite.y) -
          Phaser.Math.Distance.Between(origin.sprite.x, origin.sprite.y, b.sprite.x, b.sprite.y)
      )
      .slice(0, maxTargets);

    let prevX = origin.sprite.x;
    let prevY = origin.sprite.y;
    let chained = 0;
    for (const target of candidates) {
      if (Phaser.Math.Distance.Between(prevX, prevY, target.sprite.x, target.sprite.y) > 420) break;
      this.vfx.spawnLightningBolt(prevX, prevY, target.sprite.x, target.sprite.y, rarity);
      this.triggerDuoZeusAres(target);
      this.damageEnemy(target, boltDmg, 'proc', 0, 0, true);
      prevX = target.sprite.x;
      prevY = target.sprite.y;
      chained++;
    }

    if (chained === 0) {
      const branches = rarity === 'epic' ? 3 : 2;
      for (let i = 0; i < branches; i++) {
        const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.vfx.spawnLightningBolt(origin.sprite.x, origin.sprite.y, origin.sprite.x + Math.cos(ang) * 95, origin.sprite.y + Math.sin(ang) * 75, rarity);
      }
      this.triggerDuoZeusAres(origin);
    }
  }

  private applyChill(e: EnemyEntity, stacks: number) {
    e.chillStacks += stacks;
    e.chillUntil = this.time.now + 3000;
    e.sprite.setTint(0x80deea);

    if (!e.chillBase) {
      e.chillBase = this.add
        .image(e.sprite.x, e.sprite.y + 20, 'tex_snowflake_ring')
        .setTint(0x4dd0e1)
        .setAlpha(0.62)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4);
    }
    e.chillBase.setScale(0.24 + Math.min(3, e.chillStacks) * 0.08);

    if (e.chillStacks >= 4) {
      e.chillStacks = 0;
      e.chillBase?.destroy();
      e.chillBase = undefined;
      const demP = this.boons.get('demeter_passive');
      const demAtk = this.boons.get('demeter_attack');
      const r: Rarity = demP?.rarity ?? demAtk?.rarity ?? 'common';
      const shatterDmg = demP ? demP.value : 32;
      this.vfx.spawnIceShatter(e.sprite.x, e.sprite.y, r);
      this.floatText(e.sprite.x, e.sprite.y - 40, '❄️ 碎冰!', '#4dd0e1', 15);

      this.chillShatterDepth++;
      try {
        if (demP && this.chillShatterDepth <= 2) {
          this.spawnFrostLanceBurst(e.sprite.x, e.sprite.y, Math.round(shatterDmg * 0.65), r === 'epic' ? 8 : 6);
        }

        const duoDN = this.boons.get('duo_demeter_nyx');
        if (duoDN) {
          this.vfx.spawnNyxVoidCrit(e.sprite.x, e.sprite.y, 0, 'epic');
          this.hp = Math.min(this.maxHp, this.hp + duoDN.value);
          for (let i = 0; i < 3; i++) {
            this.spawnHomingSoulSword(e.sprite.x, e.sprite.y, (Math.PI * 2 * i) / 3, 28 * this.getGlobalDmgMult());
          }
        }

        for (const other of [...this.enemies]) {
          if (Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, other.sprite.x, other.sprite.y) <= 125) {
            this.damageEnemy(other, shatterDmg, 'proc', 0, 80, true);
          }
        }
      } finally {
        this.chillShatterDepth--;
      }
    }
  }

  private killEnemy(e: EnemyEntity, ringOut = false) {
    const ex = e.sprite.x;
    const ey = e.sprite.y;
    const flip = e.sprite.flipX;
    const isBoss = e.kind === 'boss';
    const isElite = e.isElite;
    const isMinion = e.isMinion;
    const kind = e.kind;
    const affixes = [...e.affixes];

    e.hpBarBg?.destroy();
    e.hpBarFill?.destroy();
    e.postureBarBg?.destroy();
    e.postureBarFill?.destroy();
    e.armorBarBg?.destroy();
    e.armorBarFill?.destroy();
    e.armorLabel?.destroy();
    e.aura?.destroy();
    e.shadow?.destroy();
    e.doomSigil?.destroy();
    e.chillBase?.destroy();
    e.frontShield?.destroy();
    e.execMark?.destroy();
    e.laserG?.destroy();
    e.jumpReticle?.destroy();
    e.sprite.destroy();
    this.enemies = this.enemies.filter((x) => x.id !== e.id);

    if (!ringOut) {
      const aresP = this.boons.get('ares_passive');
      if (aresP && kind !== 'totem') {
        sfx.playExplosion();
        this.vfx.spawnDoomDetonation(ex, ey, aresP.rarity);
        for (const other of [...this.enemies]) {
          if (other.sprite.active && Phaser.Math.Distance.Between(ex, ey, other.sprite.x, other.sprite.y) <= 145) {
            const pushAng = Phaser.Math.Angle.Between(ex, ey, other.sprite.x, other.sprite.y);
            other.doomTimer = 550;
            other.doomDamage = Math.round(aresP.value * 0.75);
            other.doomColor = 0xff5252;
            other.doomRarity = aresP.rarity;
            this.damageEnemy(other, aresP.value, 'proc', pushAng, 180, true);
          }
        }
      }

      const nyxP = this.boons.get('nyx_passive');
      if (nyxP && kind !== 'totem') {
        this.hp = Math.min(this.maxHp, this.hp + 3);
        this.vfx.spawnSoulSiphon(ex, ey, () => ({ x: this.player.x, y: this.player.y }), nyxP.rarity);
      }

      const corpse = this.add
        .sprite(ex, ey, isBoss ? 'boss_nightborne' : 'unit_dead')
        .setScale(isBoss ? 2.05 : 0.65)
        .setFlipX(flip)
        .setDepth(8);
      if (kind !== 'totem') {
        corpse.play(isBoss ? 'boss_nb_death' : 'unit_dead_anim');
        corpse.once('animationcomplete', () => {
          this.tweens.add({ targets: corpse, alpha: 0, duration: 280, onComplete: () => corpse.destroy() });
        });
      } else {
        corpse.destroy();
      }
      this.vfx.spawnDeathBurst(ex, ey, isBoss);
    } else {
      // Abyss Ring-Out sink visual!
      const falling = this.add.image(ex, ey, 'tex_circle_glow').setTint(0x9c27b0).setScale(1.1).setDepth(5);
      this.tweens.add({ targets: falling, scale: 0.1, alpha: 0, duration: 360, onComplete: () => falling.destroy() });
    }

    // Splitter Elite Affix: spawns 2 fast mini shadow imps on death!
    if (!ringOut && affixes.includes('splitter') && kind !== 'totem') {
      this.floatText(ex, ey - 36, '🪲 死亡分裂!', '#80deea', 14);
      for (const ox of [-28, 28]) {
        const sx = Phaser.Math.Clamp(ex + ox, TILE * 2, ARENA_W - TILE * 2);
        const sy = Phaser.Math.Clamp(ey + Phaser.Math.Between(-16, 16), TILE * 2.5, ARENA_H - TILE * 2);
        this.spawnEnemy('imp', sx, sy, false);
        const child = this.enemies[this.enemies.length - 1];
        if (child) {
          child.maxHp = Math.round(child.maxHp * 0.55);
          child.hp = child.maxHp;
          child.sprite.setScale(child.baseScale * 0.78);
          child.baseScale *= 0.78;
        }
      }
    }

    this.kills++;
    this.gold += isBoss ? 80 : isElite ? 24 : 9;
    const baseDark = isBoss ? 50 : isElite ? 10 : 3;
    const dGain = Math.round(baseDark * DIFFICULTY.darknessRewardMult);
    this.runDarkness += dGain;
    this.save.darkness += dGain;
    this.addStyle(isElite ? 135 : 52, 1);
    if (!isMinion && kind !== 'totem') {
      this.lastKillPos = {
        x: Phaser.Math.Clamp(ex, TILE * 2, ARENA_W - TILE * 2),
        y: Phaser.Math.Clamp(ey, TILE * 2.5, ARENA_H - TILE * 2),
      };
    }

    this.checkWaveOrClear(isBoss);
    this.syncHud();
  }

  private checkWaveOrClear(wasBoss = false) {
    const activeCombatants = this.enemies.filter((x) => x.kind !== 'totem' && x.kind !== 'dummy');
    if (this.wavesRemaining > 0 && !this.waveSpawning && activeCombatants.length <= 2) {
      this.wavesRemaining--;
      this.floatText(ARENA_W / 2, TILE * 3.2, '🔥 冥渊尸潮增援涌入!', '#ff5252', 18);
      this.spawnChamberWave(this.chamber >= 3 && this.wavesRemaining === 0);
      return;
    }
    if (activeCombatants.length === 0 && !this.waveSpawning && !this.roomCleared) {
      for (const t of [...this.enemies]) {
        if (t.kind === 'totem') this.killEnemy(t, false);
      }
      this.onRoomCleared(wasBoss);
    }
  }

  // ============================================================================
  // Room Clear Rewards, Hammer Mutations & 8-Chamber Progression
  // ============================================================================
  private onRoomCleared(wasBoss: boolean) {
    this.roomCleared = true;
    bgm.setMode('clear');
    if (this.chamber > this.save.bestChamber) {
      this.save.bestChamber = this.chamber;
    }
    writeSave(this.save);

    this.triggerSlowMo(0.45, 300);
    this.floatText(ARENA_W / 2, ARENA_H / 2 - 40, wasBoss ? '👑 魔王陨落! 渊层突破!' : '✨ 区域肃清!', '#ffd54f', 22);

    if (wasBoss) {
      this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.4));
    }

    this.spawnRoomRewardOrb();
  }

  private spawnRoomRewardOrb() {
    if (this.rewardSpawned) return;
    this.rewardSpawned = true;
    const rx = this.lastKillPos.x;
    const ry = this.lastKillPos.y;
    const rw = this.currentReward;

    const sh = this.add.image(rx, ry + 18, 'tex_shadow_oval').setScale(0.7).setDepth(3);
    const glow = this.add
      .image(rx, ry, 'tex_circle_glow')
      .setTint(rw.color)
      .setScale(1.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(5);
    const orbKey = rw.kind === 'gold' ? 'coin_0' : rw.kind === 'heal' || rw.kind === 'maxhp' ? 'flask_red' : 'chest_0';
    const orb = this.add.image(rx, ry, orbKey).setScale(3.0).setDepth(14);
    this.roomGroup.addMultiple([sh, glow, orb]);

    let claimed = false;

    const claim = () => {
      if (claimed || this.isDead) return;
      claimed = true;

      glow.destroy();
      sh.destroy();
      orb.destroy();

      sfx.playPickup();

      // Chapter 8 Boss Victory Ceremony!
      if (this.chamber === 8 && rw.kind === 'boss') {
        const bonus = Math.round(80 * DIFFICULTY.darknessRewardMult);
        this.runDarkness += bonus;
        this.save.darkness += bonus;
        writeSave(this.save);
        this.ui.showVictoryModal(
          {
            kills: this.kills,
            darknessEarned: this.runDarkness,
            boonsCount: this.boons.size,
            hammersCount: this.hammers.size,
          },
          () => {
            this.attackCdUntil = Math.max(this.attackCdUntil, this.time.now + 200);
            this.openExitDoors();
          },
          () => this.loadHub()
        );
        this.syncHud();
        return;
      }

      if (rw.kind === 'hammer') {
        const choices = rollHammerChoices(this.save.selectedWeapon, new Set(Array.from(this.hammers.keys())));
        this.ui.showHammerModal(choices, (picked) => {
          this.attackCdUntil = Math.max(this.attackCdUntil, this.time.now + 200);
          this.hammers.set(picked.id, picked);
          this.vfx.spawnDivineDescent(this.player.x, this.player.y, 'ares', 'epic');
          this.floatText(this.player.x, this.player.y - 46, `🔨 武器改造：${picked.name}`, '#ffca28', 19);
          this.syncHud();
          this.openExitDoors();
        });
      } else if (rw.kind === 'boon' || rw.kind === 'boss') {
        const ownedIds = new Set(Array.from(this.boons.keys()));
        const choices = rollBoonChoices(
          ownedIds,
          this.save.mirror.fortune,
          rw.kind === 'boon' ? rw.god : undefined,
          this.getOwnedGods()
        );
        if (rw.kind === 'boss' && choices[0].rarity !== 'duo') {
          choices[0].rarity = 'epic';
          choices[0].value = Math.round(choices[0].def.baseValue * 1.75);
        }
        this.ui.showBoonModal(choices, (picked) => {
          this.attackCdUntil = Math.max(this.attackCdUntil, this.time.now + 200);
          this.grantBoon(picked.def, picked.rarity, picked.value);
          this.openExitDoors();
        });
      } else if (rw.kind === 'gold') {
        this.gold += 70;
        this.floatText(this.player.x, this.player.y - 34, '+70 🪙 金币!', '#ffca28', 18);
        this.openExitDoors();
      } else if (rw.kind === 'maxhp') {
        this.maxHp += 25;
        this.hp = Math.min(this.maxHp, this.hp + 30);
        this.floatText(this.player.x, this.player.y - 34, '+25 ❤️ 最大生命!', '#ff5252', 18);
        this.openExitDoors();
      } else if (rw.kind === 'heal') {
        this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.45));
        this.floatText(this.player.x, this.player.y - 34, '💚 泉水恢复 45% 生命!', '#81c784', 18);
        this.openExitDoors();
      }
      this.syncHud();
    };

    // Auto-Magnet flight straight into player after 340ms!
    const flight = { t: 0 };
    this.tweens.add({
      targets: flight,
      t: 1,
      duration: 340,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        if (!orb.active) return;
        const nx = Phaser.Math.Linear(rx, this.player.x, flight.t);
        const ny = Phaser.Math.Linear(ry, this.player.y - 10, flight.t);
        orb.setPosition(nx, ny);
        glow.setPosition(nx, ny);
        sh.setPosition(nx, ny + 18);
      },
      onComplete: claim,
    });
  }

  private grantBoon(def: BoonDef, rarity: Rarity, value: number) {
    this.boons.set(def.id, { def, rarity, value });
    this.vfx.spawnDivineDescent(this.player.x, this.player.y, def.god, rarity === 'duo' ? 'epic' : rarity);
    this.cameraPunch(0.032, 130, 0.006);
    this.refreshHeroEnchantVisuals();
    this.floatText(this.player.x, this.player.y - 46, `${def.icon} 神力赐福：${def.name}`, def.colorHex, 19);
    this.syncHud(true);
  }

  private openExitDoors() {
    if (this.doorsOpened) return;
    this.doorsOpened = true;
    const nextChamber = this.chamber + 1;

    // Curated Chapter 8 Final Boss Gate & Endless Bosses
    if (nextChamber === 8 || (nextChamber > 8 && nextChamber % 5 === 0)) {
      const bossRw: RoomRewardType = {
        kind: 'boss',
        label: nextChamber === 8 ? '👹 终极魔王殿 [第8/8层]' : `👹 无尽魔王殿 [第${nextChamber}层]`,
        color: 0xff1744,
      };
      this.createExitDoor(ARENA_W / 2, bossRw, nextChamber);
      return;
    }

    const gods: GodId[] = ['zeus', 'ares', 'demeter', 'nyx'];
    const g1 = gods[Math.floor(Math.random() * gods.length)];
    const g2 = gods[(gods.indexOf(g1) + 1 + Math.floor(Math.random() * 3)) % gods.length];
    const boon1: RoomRewardType = { kind: 'boon', god: g1, label: `${GOD_META[g1].icon} ${GOD_META[g1].name}祝福`, color: GOD_META[g1].colorNum };
    const boon2: RoomRewardType = { kind: 'boon', god: g2, label: `${GOD_META[g2].icon} ${GOD_META[g2].name}祝福`, color: GOD_META[g2].colorNum };
    const hammerRw: RoomRewardType = { kind: 'hammer', label: '🔨 泰坦神匠之锤 (武器质变)', color: 0xffca28 };
    const shopRw: RoomRewardType = { kind: 'shop', label: '🛒 卡戎黑市商店', color: 0xffb74d };

    let chosen: RoomRewardType[];
    if (this.chamber === 1 || this.chamber === 6) {
      chosen = [hammerRw, boon1, this.chamber === 6 ? shopRw : boon2];
    } else if (nextChamber === 6) {
      chosen = [shopRw, { kind: 'heal', label: '💚 治愈生命泉水', color: 0x66bb6a }, boon1];
    } else {
      const extras: RoomRewardType[] = [
        boon2,
        { kind: 'gold', label: '🪙 冥界金库 (+70金币)', color: 0xffca28 },
        { kind: 'maxhp', label: '❤️ 半人马之心 (+25上限)', color: 0xff5252 },
        { kind: 'heal', label: '💚 治愈生命泉水', color: 0x66bb6a },
        shopRw,
      ];
      chosen = [boon1, extras[Math.floor(Math.random() * extras.length)]];
      if (this.chamber % 2 === 0) {
        chosen.push(extras[(Math.floor(Math.random() * extras.length) + 2) % extras.length]);
      }
    }

    const xs = chosen.length === 2 ? [ARENA_W * 0.34, ARENA_W * 0.66] : [ARENA_W * 0.24, ARENA_W * 0.5, ARENA_W * 0.76];
    chosen.forEach((rw, i) => this.createExitDoor(xs[i], rw, nextChamber));
  }

  private createExitDoor(x: number, rw: RoomRewardType, nextChamber: number) {
    const glow = this.add
      .image(x, TILE * 1.95, 'tex_circle_glow')
      .setTint(rw.color)
      .setScale(2.1)
      .setAlpha(0.62)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    const door = this.add.image(x, TILE * 1.48, 'tex_gate_arch').setTint(rw.color).setScale(0.95).setDepth(4);
    this.roomGroup.add(glow);

    this.registerInteractable(
      x,
      TILE * 2.25,
      58,
      rw.label,
      door,
      () => {
        this.currentReward = rw;
        this.enterChamber(nextChamber);
      },
      true
    );
  }

  private registerInteractable(
    x: number,
    y: number,
    radius: number,
    label: string,
    sprite: Phaser.GameObjects.GameObject,
    onTrigger: () => void,
    autoTrigger = false
  ) {
    const text = this.add
      .text(x, y - 54, label, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fff8e1',
        backgroundColor: '#120e1cdd',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(24);
    this.roomGroup.add(sprite);
    const entry: Interactable = { x, y, radius, label, sprite, text, onTrigger, autoTrigger };
    this.interactables.push(entry);
    return entry;
  }

  private tryManualInteract() {
    const now = this.time.now;
    if (now - this.lastInteractAt < 250) return;
    for (const it of [...this.interactables]) {
      if (!it.autoTrigger && Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y) <= it.radius) {
        this.lastInteractAt = now;
        it.onTrigger();
        return;
      }
    }
  }

  // ============================================================================
  // Modals & Player Hurt
  // ============================================================================
  private openMirror() {
    this.ui.showMirrorModal(
      this.save,
      (key) => {
        const item = MIRROR_ITEMS.find((i) => i.key === key);
        if (!item) return;
        const lvl = this.save.mirror[key];
        const cost = getMirrorCost(item, lvl);
        if (lvl < item.maxLevel && this.save.darkness >= cost) {
          this.save.darkness -= cost;
          this.save.mirror[key] = lvl + 1;
          writeSave(this.save);
          this.maxHp = 100 + this.save.mirror.vitality * 25;
          this.hp = this.maxHp;
          this.maxRevives = this.save.mirror.deathDefiance;
          this.revivesLeft = this.maxRevives;
          this.maxDashCharges = this.computeMaxDashes();
          this.dashCharges = this.maxDashCharges;
          this.syncHud();
        }
      },
      () => {
        this.attackCdUntil = Math.max(this.attackCdUntil, this.time.now + 200);
        this.syncHud();
      }
    );
  }

  private openShop() {
    this.ui.showShopModal(
      this.gold,
      (item, cost) => {
        if (this.gold < cost) return false;
        this.gold -= cost;
        if (item === 'heal') {
          this.hp = Math.min(this.maxHp, this.hp + 45);
          this.floatText(this.player.x, this.player.y - 36, '+45 💚 恢复生命', '#81c784');
        } else if (item === 'maxhp') {
          this.maxHp += 25;
          this.hp = Math.min(this.maxHp, this.hp + 25);
          this.floatText(this.player.x, this.player.y - 36, '+25 ❤️ 生命上限', '#ff5252');
        } else if (item === 'boon') {
          const ownedIds = new Set(Array.from(this.boons.keys()));
          const choices = rollBoonChoices(ownedIds, this.save.mirror.fortune, undefined, this.getOwnedGods());
          this.ui.showBoonModal(choices, (picked) => {
            this.attackCdUntil = Math.max(this.attackCdUntil, this.time.now + 200);
            this.grantBoon(picked.def, picked.rarity, picked.value);
          });
        }
        this.syncHud();
        return true;
      },
      () => {
        this.attackCdUntil = Math.max(this.attackCdUntil, this.time.now + 200);
        this.syncHud();
      }
    );
  }

  private hurtPlayer(dmg: number) {
    const now = this.time.now;
    if (now < this.invulnUntil || this.isDead || this.chamber === 0) return;
    if (now < this.parryWindowUntil) {
      this.succeedParry(this.getAimAngle());
      return;
    }

    this.invulnUntil = now + 700;
    this.hp -= dmg;
    this.wrath = Math.min(100, this.wrath + 10);
    this.styleScore = Math.floor(this.styleScore * 0.6);
    this.comboCount = Math.floor(this.comboCount * 0.5);
    sfx.playPlayerHurt();
    this.ui.triggerHurtPulse();
    this.cameraPunch(-0.015, 160, 0.008);
    this.player.setTintFill(0xff5252);
    this.time.delayedCall(120, () => {
      if (this.player.active) this.player.clearTint();
    });
    this.floatText(this.player.x, this.player.y - 36, `-${dmg}`, '#ff5252', 16);

    if (this.hp <= 0) {
      if (this.revivesLeft > 0) {
        this.revivesLeft--;
        this.hp = Math.round(this.maxHp * 0.5);
        this.invulnUntil = now + 1600;
        sfx.playBoonSelect();
        this.cameras.main.flash(260, 255, 213, 79);
        this.spawnShockwave(this.player.x, this.player.y, 190, 0xffd54f);
        this.floatText(this.player.x, this.player.y - 48, '💀 死里逃生!', '#ffd54f', 20);
        for (const e of this.enemies) {
          if (e.kind !== 'boss') {
            const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
            (e.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * 380, Math.sin(ang) * 380);
          }
        }
      } else {
        this.hp = 0;
        this.isDead = true;
        this.heldCodes.clear();
        this.time.timeScale = 1.0;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        if (this.chamber > this.save.bestChamber) {
          this.save.bestChamber = this.chamber;
        }
        writeSave(this.save);
        this.ui.showDeathModal(
          {
            chamber: this.chamber,
            kills: this.kills,
            darknessEarned: this.runDarkness,
            boonsCount: this.boons.size,
            bestChamber: this.save.bestChamber,
          },
          () => this.loadHub()
        );
      }
    }
    this.syncHud(true);
  }

  // ============================================================================
  // Frame Update Loop
  // ============================================================================
  update(_time: number, delta: number) {
    const now = this.time.now;
    const realNow = performance.now();
    delta = Math.min(delta, 50);
    if (this.time.timeScale !== 1.0 && realNow >= this.slowMoRealUntil) {
      this.time.timeScale = 1.0;
    }
    if (this.isDead) return;

    this.updateAmbientMotes(delta);

    if (this.ui.hasModal()) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      for (const e of this.enemies) (e.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }

    const inHitstop = realNow < this.hitstopRealUntil;

    if (this.dashCharges < this.maxDashCharges && now >= this.dashRechargeAt) {
      this.dashCharges++;
      const nyxDash = this.boons.get('nyx_dash');
      this.dashRechargeAt = now + (nyxDash ? Math.round(850 * 0.78) : 850);
      this.hudDirty = true;
    }

    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    const prefix = this.getHeroAnimPrefix();
    let isMoving = false;
    const { mx, my } = this.getMoveInputVector();
    if (now < this.dashingUntil) {
      const dashSpd = this.hammers.has('sword_lunge') && this.save.selectedWeapon === 'sword' ? 820 : 640;
      pBody.setVelocity(this.dashDir.x * dashSpd, this.dashDir.y * dashSpd);
      isMoving = true;
    } else if (mx !== 0 || my !== 0) {
      const st = this.getStyleState();
      const moveMult = (st ? 1 + st.moveBonus / 100 : 1.0) * (this.roomCleared && this.chamber > 0 ? 1.32 : 1.0);
      const moveSpd = 275 * moveMult;
      const dir = new Phaser.Math.Vector2(mx, my).normalize();
      pBody.setVelocity(dir.x * moveSpd, dir.y * moveSpd);
      isMoving = true;
      if (now >= this.playerAnimLockUntil) {
        this.player.setFlipX(mx < 0);
      }
    } else if (now >= this.attackCdUntil - 60) {
      pBody.setVelocity(0, 0);
    }

    if (inHitstop) {
      for (const e of this.enemies) (e.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }

    // Hold Left-Click Auto-Combo / Auto-Execution
    if (this.input.activePointer.leftButtonDown() && !this.isDead && !this.ui.hasModal()) {
      this.triggerPrimaryAction();
    }

    // Style score decay & high-rank S/SS/SSS phantom afterimages
    if (now > this.styleFreezeUntil && this.styleScore > 0) {
      this.styleScore = Math.max(0, this.styleScore - (delta / 1000) * 135);
      if (this.styleScore === 0) {
        this.comboCount = 0;
      }
    }
    const curStyle = this.getStyleState();
    if (curStyle && (curStyle.letter === 'S' || curStyle.letter === 'SS' || curStyle.letter === 'SSS') && isMoving) {
      this.afterimageTick += delta;
      if (this.afterimageTick >= 75) {
        this.afterimageTick = 0;
        const afterTint = curStyle.letter === 'SSS' ? 0xff1744 : curStyle.letter === 'SS' ? 0xff5252 : 0xff9100;
        this.vfx.spawnPhantomAfterimage(
          this.player.x,
          this.player.y,
          this.player.texture.key,
          this.player.frame.name,
          this.player.flipX,
          HERO_SCALE,
          afterTint
        );
      }
    }

    // Depenetrate player safely out of pillars & abyss pits!
    if (now >= this.dashingUntil) {
      this.depentratePlayerFromHazards();
    }

    if (now >= this.playerAnimLockUntil) {
      const desiredAnim = isMoving ? `${prefix}_run` : `${prefix}_idle`;
      if (this.player.anims.currentAnim?.key !== desiredAnim) {
        this.player.play(desiredAnim);
      }
    }

    // Sync Parry Aegis dome
    if (now < this.parryWindowUntil) {
      this.parryShieldVisual.setPosition(this.player.x, this.player.y).setAlpha(0.85);
      this.parryShieldVisual.rotation += (delta / 1000) * 5;
      this.checkMeleeParries(now);
    } else {
      this.parryShieldVisual.setAlpha(0);
    }

    this.playerShadow.setPosition(this.player.x, this.player.y + 24);
    this.playerHalo.setPosition(this.player.x, this.player.y + 10);
    this.playerRuneRing.setPosition(this.player.x, this.player.y + 20);
    if (this.boons.size > 0) {
      this.playerRuneRing.rotation += (delta / 1000) * 1.1;
      this.auraTickTimer += delta;
      if (this.auraTickTimer >= 80) {
        this.auraTickTimer = 0;
        this.vfx.spawnHeroGodAuraParticle(this.player.x, this.player.y, this.getDominantGod(), isMoving);
      }
    }

    for (const pv of this.pillarVisuals) {
      const behind = this.player.y < pv.y - 6 && pv.y - this.player.y < 120 && Math.abs(this.player.x - pv.x) < 46;
      pv.setAlpha(behind ? 0.48 : 1.0);
    }

    this.updateEnemies(now, delta);
    this.updateProjectiles(delta);
    this.updateHazardZones(delta);
    this.updateSpikes(delta);
    this.updateInteractables();

    this.waveWatchdogTimer += delta;
    if (this.waveWatchdogTimer >= 400) {
      this.waveWatchdogTimer = 0;
      if (this.chamber > 0 && !this.roomCleared && !this.waveSpawning && this.currentReward.kind !== 'shop') {
        const aliveCombatants = this.enemies.some((e) => e.sprite.active && e.kind !== 'totem' && e.kind !== 'dummy');
        if (!aliveCombatants) {
          this.checkWaveOrClear(this.chamber === 8 || (this.chamber > 8 && this.chamber % 5 === 0));
        }
      }
    }

    this.hudSyncTimer += delta;
    if (this.hudSyncTimer >= 90 && (this.hudDirty || this.hudSyncTimer >= 160)) {
      this.hudSyncTimer = 0;
      this.syncHud(true);
    }
  }

  private updateAmbientMotes(delta: number) {
    const dt = delta / 1000;
    for (const m of this.ambientMotes) {
      m.obj.x += m.vx * dt;
      m.obj.y += m.vy * dt;
      if (m.obj.y < TILE) {
        m.obj.y = ARENA_H - TILE;
        m.obj.x = Phaser.Math.Between(TILE, ARENA_W - TILE);
      }
    }
  }

  private updateEnemies(now: number, delta: number) {
    // Render Ward Totem beams, Chiron Mark reticle & Molten Link flame tethers
    const totems = this.enemies.filter((t) => t.kind === 'totem' && t.sprite.active);
    if (totems.length > 0) {
      if (!this.wardG) this.wardG = this.add.graphics().setDepth(6);
      this.wardG.clear();
      this.wardG.lineStyle(2.5, 0xe040fb, 0.55);
      for (const t of totems) {
        for (const ally of this.enemies) {
          if (ally.kind !== 'totem' && ally.sprite.active) {
            this.wardG.lineBetween(t.sprite.x, t.sprite.y - 10, ally.sprite.x, ally.sprite.y);
          }
        }
      }
    } else if (this.wardG) {
      this.wardG.clear();
    }

    if (!this.moltenG) this.moltenG = this.add.graphics().setDepth(6);
    this.moltenG.clear();

    for (const e of [...this.enemies]) {
      if (!e.sprite.active) continue;
      const body = e.sprite.body as Phaser.Physics.Arcade.Body;

      // Abyss Pit Ring-Out Check!
      if (e.kind !== 'boss' && e.kind !== 'dummy' && e.kind !== 'totem' && this.isInsidePit(e.sprite.x, e.sprite.y, 12)) {
        this.floatText(e.sprite.x, e.sprite.y - 24, '🕳️ 深渊坠落!', '#ce93d8', 17);
        sfx.playExecution();
        this.killEnemy(e, true);
        continue;
      }

      // Sync HP, Super-Armor & Yellow Posture bars
      if (e.hpBarBg && e.hpBarFill) {
        e.hpBarBg.setPosition(e.sprite.x, e.sprite.y + e.hpBarYOff);
        e.hpBarFill.setPosition(e.sprite.x - ((1 - e.hp / e.maxHp) * 42) / 2, e.sprite.y + e.hpBarYOff);
        e.hpBarFill.width = Math.max(0, 42 * (e.hp / e.maxHp));
      }
      if (e.armorBarBg && e.armorBarFill && e.maxArmorHp > 0 && e.armorHp > 0) {
        const aRatio = e.armorHp / e.maxArmorHp;
        e.armorBarBg.setPosition(e.sprite.x, e.sprite.y + e.hpBarYOff - 6);
        e.armorBarFill.setPosition(e.sprite.x - ((1 - aRatio) * 44) / 2, e.sprite.y + e.hpBarYOff - 6);
        e.armorBarFill.width = Math.max(0, 44 * aRatio);
      }
      if (e.armorLabel) {
        e.armorLabel.setPosition(e.sprite.x, e.sprite.y + e.hpBarYOff - 16);
      }
      if (e.postureBarBg && e.postureBarFill) {
        e.postureBarBg.setPosition(e.sprite.x, e.sprite.y + e.hpBarYOff + 5);
        const pRatio = e.brokenUntil > now ? 1 : e.posture / Math.max(1, e.maxPosture);
        e.postureBarFill.setFillStyle(e.brokenUntil > now ? 0xff1744 : 0xffd54f);
        e.postureBarFill.setPosition(e.sprite.x - ((1 - pRatio) * 42) / 2, e.sprite.y + e.hpBarYOff + 5);
        e.postureBarFill.width = Math.max(0, 42 * pRatio);
      }

      e.aura?.setPosition(e.sprite.x, e.sprite.y + 10);
      e.shadow?.setPosition(e.sprite.x, e.sprite.y + (e.kind === 'boss' ? 30 : 22));

      // Chiron Aspect II Marked Target Ring
      if (this.chironMarkedId === e.id && e.chironMarkUntil > now) {
        this.moltenG.lineStyle(2.2, 0xffd54f, 0.9);
        this.moltenG.strokeCircle(e.sprite.x, e.sprite.y + 6, 28 + Math.sin(now * 0.015) * 3);
      }

      // Gilgamesh Aspect II Bleed/Maim eruption
      if (e.maimTimer > 0) {
        e.maimTimer -= delta;
        if (e.maimTimer <= 0) {
          this.vfx.spawnNyxVoidCrit(e.sprite.x, e.sprite.y, 0, 'epic');
          this.floatText(e.sprite.x, e.sprite.y - 46, '🩸 爪痕撕裂!', '#ff5252', 14);
          this.addPosture(e, 30, true);
          this.damageEnemy(e, e.maimDmg, 'proc', 0, 50, true);
          if (!e.sprite.active) continue;
        }
      }

      // Elite Affix: Molten Link fire tether to nearest living ally
      if (e.affixes.includes('molten_link') && e.kind !== 'dummy' && e.kind !== 'totem') {
        const partner = this.enemies
          .filter((o) => o.id !== e.id && o.sprite.active && o.kind !== 'totem')
          .sort(
            (a, b) =>
              Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, a.sprite.x, a.sprite.y) -
              Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, b.sprite.x, b.sprite.y)
          )[0];
        if (partner && Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, partner.sprite.x, partner.sprite.y) <= 290) {
          this.moltenG.lineStyle(5, 0xff5722, 0.35);
          this.moltenG.lineBetween(e.sprite.x, e.sprite.y, partner.sprite.x, partner.sprite.y);
          this.moltenG.lineStyle(2, 0xffd54f, 0.88);
          this.moltenG.lineBetween(e.sprite.x, e.sprite.y, partner.sprite.x, partner.sprite.y);

          // Point-to-segment distance check for player crossing the laser tether
          const abx = partner.sprite.x - e.sprite.x;
          const aby = partner.sprite.y - e.sprite.y;
          const abLenSq = abx * abx + aby * aby;
          if (abLenSq > 10 && now >= e.moltenCdUntil) {
            const t = Phaser.Math.Clamp(((this.player.x - e.sprite.x) * abx + (this.player.y - e.sprite.y) * aby) / abLenSq, 0, 1);
            const cx = e.sprite.x + abx * t;
            const cy = e.sprite.y + aby * t;
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy) <= 18) {
              e.moltenCdUntil = now + 550;
              this.hurtPlayer(Math.max(12, Math.round(e.damage * 0.75)));
            }
          }
        }
      }

      // Elite Affix: Teleporter blink behind player!
      if (
        e.affixes.includes('teleporter') &&
        e.brokenUntil <= now &&
        e.aiState === 'chase' &&
        now >= e.teleportCdUntil &&
        Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y) > 125
      ) {
        e.teleportCdUntil = now + 2300;
        sfx.playTeleportBlink();
        this.vfx.spawnShockwave(e.sprite.x, e.sprite.y, 44, 0x80deea, 160);
        const blinkAng = Math.atan2(this.player.y - e.sprite.y, this.player.x - e.sprite.x) + Math.PI + Phaser.Math.FloatBetween(-0.6, 0.6);
        const nx = Phaser.Math.Clamp(this.player.x + Math.cos(blinkAng) * 95, TILE * 2, ARENA_W - TILE * 2);
        const ny = Phaser.Math.Clamp(this.player.y + Math.sin(blinkAng) * 95, TILE * 2.4, ARENA_H - TILE * 2);
        e.sprite.setPosition(nx, ny);
        this.vfx.spawnShockwave(nx, ny, 52, 0x00e5ff, 180);
        this.floatText(nx, ny - 44, '⚡ 瞬移突袭!', '#80deea', 12);
      }

      // Execution marker & posture decay
      if (e.brokenUntil > now) {
        e.execMark?.setPosition(e.sprite.x, e.sprite.y + e.hpBarYOff - 22 + Math.sin(now * 0.02) * 3);
        body.setVelocity(0, 0);
        if (e.idleAnim && e.sprite.anims.currentAnim?.key !== e.idleAnim) e.sprite.play(e.idleAnim);
        e.sprite.setTint(0xffd54f);
        continue;
      } else if (e.execMark) {
        e.execMark.destroy();
        e.execMark = undefined;
        e.posture = 0;
        e.sprite.clearTint();
      }

      if (e.posture > 0 && now > e.postureDecayAt) {
        e.posture = Math.max(0, e.posture - (delta / 1000) * 18);
      }

      // Ares Doom countdown
      if (e.doomTimer > 0) {
        if (!e.doomSigil) {
          e.doomSigil = this.add
            .image(e.sprite.x, e.sprite.y + e.hpBarYOff - 32, 'tex_ares_greatsword')
            .setScale(0.38)
            .setTint(0xff3d00)
            .setAlpha(0.92)
            .setDepth(22);
        }
        e.doomSigil.setPosition(e.sprite.x, e.sprite.y + e.hpBarYOff - 32 + Math.sin(now * 0.014) * 4);
        e.doomSigil.setScale(0.36 + (1 - e.doomTimer / 850) * 0.16);
        e.doomTimer -= delta;
        if (e.doomTimer <= 0) {
          e.doomSigil?.destroy();
          e.doomSigil = undefined;
          sfx.playExplosion();
          this.vfx.spawnDoomDetonation(e.sprite.x, e.sprite.y, e.doomRarity ?? 'common');
          this.damageEnemy(e, e.doomDamage, 'proc', 0, 40, true);
          if (!e.sprite.active) continue;
        }
      }

      // Demeter Chill & Duo Zeus×Demeter auto-lightning
      if (e.chillBase) {
        e.chillBase.setPosition(e.sprite.x, e.sprite.y + 20);
        e.chillBase.rotation += (delta / 1000) * 0.9;
        if (e.chillUntil <= now) {
          e.chillBase.destroy();
          e.chillBase = undefined;
          e.chillStacks = 0;
        }
      }
      if (e.chillUntil > now) {
        if (Math.random() < 0.08) {
          const flake = this.add
            .image(e.sprite.x + Phaser.Math.Between(-16, 16), e.sprite.y + Phaser.Math.Between(-18, 12), 'tex_ice_shard')
            .setScale(0.32)
            .setTint(0x80deea)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(14);
          this.tweens.add({ targets: flake, y: flake.y - 16, alpha: 0, duration: 280, onComplete: () => flake.destroy() });
        }
        if (this.boons.has('duo_zeus_demeter')) {
          e.duoBoltCd -= delta;
          if (e.duoBoltCd <= 0) {
            e.duoBoltCd = 2200;
            this.vfx.spawnSkyThunder(e.sprite.x, e.sprite.y, 'epic');
            this.damageEnemy(e, 34 * this.getGlobalDmgMult(), 'proc', 0, 0, true);
            if (!e.sprite.active) continue;
          }
        }
      }

      if (e.kind === 'totem') {
        body.setVelocity(0, 0);
        continue;
      }

      const dist = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y);
      const ang = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y);
      const slowMult = e.chillUntil > now ? 0.6 : 1.0;

      // Practice Dummy Parry Drill State Machine!
      if (e.kind === 'dummy') {
        body.setVelocity(0, 0);
        e.aiTimer -= delta;
        if (e.aiState === 'chase' && e.aiTimer <= 0) {
          e.aiState = 'windup';
          e.aiTimer = 600;
          e.sprite.setTint(0xff5252);
          this.floatText(e.sprite.x, e.sprite.y - 44, '❗ 弹反时机 (按F)', '#ff5252', 12);
        } else if (e.aiState === 'windup' && e.aiTimer <= 0) {
          e.aiState = 'strike';
          e.aiTimer = 180;
          e.sprite.clearTint();
          this.spawnEnemyProjectile(e.sprite.x, e.sprite.y, ang, 180, 0, true);
        } else if (e.aiState === 'strike' && e.aiTimer <= 0) {
          e.aiState = 'chase';
          e.aiTimer = 2600;
        }
        continue;
      }

      // Sync Front Shield visual for Ice Shield Knights
      if (e.frontShield) {
        if (e.aiState === 'chase') {
          const diff = Phaser.Math.Angle.Wrap(ang - e.facingAngle);
          e.facingAngle = Phaser.Math.Angle.Wrap(e.facingAngle + Phaser.Math.Clamp(diff, -3.1 * (delta / 1000), 3.1 * (delta / 1000)));
        }
        e.frontShield
          .setPosition(e.sprite.x + Math.cos(e.facingAngle) * 18, e.sprite.y + Math.sin(e.facingAngle) * 14)
          .setRotation(e.facingAngle);
      } else if (e.aiState === 'chase') {
        e.facingAngle = ang;
      }
      e.sprite.setFlipX(Math.cos(e.facingAngle) < 0);

      // Puzzle Enemy AI State Machines (Fast Swarm Fodder + Fierce Telegraphed Threats!)
      e.aiTimer -= delta;

      if (e.kind === 'boss') {
        this.updateBossAI(e, now, dist, ang, slowMult, body);
      } else if (e.kind === 'ghoul') {
        // Fast Feral Horde Charger!
        if (e.aiState === 'chase') {
          body.setVelocity(Math.cos(ang) * e.speed * slowMult, Math.sin(ang) * e.speed * slowMult);
          if (dist <= 66 && e.aiTimer <= 0) {
            e.aiState = 'windup';
            e.aiTimer = Math.max(200, Math.round(280 * DIFFICULTY.aiCooldownMult));
            e.lockedAngle = ang;
            e.sprite.setTint(0xff5252);
            this.floatText(e.sprite.x, e.sprite.y - 34, '❗', '#ff5252', 12);
          }
        } else if (e.aiState === 'windup') {
          body.setVelocity(0, 0);
          if (e.aiTimer <= 0) {
            e.aiState = 'strike';
            e.aiTimer = 140;
            e.sprite.setTint(0xff8a80);
            e.animLockUntil = now + 260;
            e.sprite.play(e.atkAnim);
            body.setVelocity(Math.cos(e.lockedAngle) * 430, Math.sin(e.lockedAngle) * 430);
            if (dist <= 72) this.hurtPlayer(e.damage);
          }
        } else if (e.aiState === 'strike') {
          if (dist <= 44) this.hurtPlayer(e.damage);
          if (e.aiTimer <= 0) {
            e.aiState = 'recover';
            e.aiTimer = Math.round(340 * DIFFICULTY.aiCooldownMult);
          }
        } else {
          body.setVelocity(0, 0);
          if (e.aiTimer <= 0) {
            e.aiState = 'chase';
            e.aiTimer = Math.round(260 * DIFFICULTY.aiCooldownMult);
          }
        }
      } else if (e.kind === 'necro') {
        // Sniper Necro with tracking red laser sight!
        if (e.aiState === 'chase') {
          if (dist > 290) body.setVelocity(Math.cos(ang) * e.speed * slowMult, Math.sin(ang) * e.speed * slowMult);
          else if (dist < 165) body.setVelocity(-Math.cos(ang) * e.speed * slowMult, -Math.sin(ang) * e.speed * slowMult);
          else body.setVelocity(0, 0);

          if (e.aiTimer <= 0) {
            e.aiState = 'windup';
            e.aiTimer = Math.max(280, Math.round((e.isElite ? 540 : 640) * DIFFICULTY.aiCooldownMult));
            e.lockedAngle = ang;
            if (!e.laserG) e.laserG = this.add.graphics().setDepth(16);
          }
        } else if (e.aiState === 'windup') {
          body.setVelocity(0, 0);
          if (e.aiTimer > 150) e.lockedAngle = ang;
          e.laserG?.clear();
          e.laserG?.lineStyle(e.aiTimer <= 150 ? 3.5 : 1.8, 0xff1744, e.aiTimer <= 150 ? 0.95 : 0.6);
          e.laserG?.lineBetween(
            e.sprite.x,
            e.sprite.y,
            e.sprite.x + Math.cos(e.lockedAngle) * 520,
            e.sprite.y + Math.sin(e.lockedAngle) * 520
          );
          if (e.aiTimer <= 0) {
            e.laserG?.clear();
            e.aiState = 'recover';
            e.aiTimer = Math.round((e.isElite ? 680 : 880) * DIFFICULTY.aiCooldownMult);
            e.animLockUntil = now + 340;
            e.sprite.play(e.atkAnim);
            if (e.isElite) {
              for (const off of [-0.22, -0.07, 0.07, 0.22]) {
                this.spawnEnemyProjectile(e.sprite.x, e.sprite.y, e.lockedAngle + off, 500, e.damage);
              }
            } else {
              for (const off of [-0.08, 0.08]) {
                this.spawnEnemyProjectile(e.sprite.x, e.sprite.y, e.lockedAngle + off, 490, e.damage);
              }
            }
          }
        } else {
          body.setVelocity(0, 0);
          if (e.aiTimer <= 0) {
            e.aiState = 'chase';
            e.aiTimer = Math.round(620 * DIFFICULTY.aiCooldownMult);
          }
        }
      } else if (e.kind === 'imp') {
        // Leap-Slam Berserker Imp!
        if (e.aiState === 'chase') {
          body.setVelocity(Math.cos(ang) * e.speed * slowMult, Math.sin(ang) * e.speed * slowMult);
          if (dist <= 240 && e.aiTimer <= 0) {
            e.aiState = 'windup';
            e.aiTimer = Math.max(240, Math.round((e.isElite ? 380 : 450) * DIFFICULTY.aiCooldownMult));
            e.leapTarget = { x: this.player.x, y: this.player.y };
            e.sprite.setTint(0xff5252);
            e.jumpReticle = this.add.circle(this.player.x, this.player.y, 48, 0xff1744, 0.24).setStrokeStyle(2.5, 0xff5252, 0.9).setDepth(3);
            this.floatText(e.sprite.x, e.sprite.y - 38, '❗', '#ff5252', 16);
          }
        } else if (e.aiState === 'windup') {
          body.setVelocity(0, 0);
          if (e.aiTimer <= 0 && e.leapTarget) {
            e.aiState = 'strike';
            e.aiTimer = 180;
            e.sprite.clearTint();
            const la = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, e.leapTarget.x, e.leapTarget.y);
            const ld = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, e.leapTarget.x, e.leapTarget.y);
            body.setVelocity(Math.cos(la) * Math.min(860, ld * 5.6), Math.sin(la) * Math.min(860, ld * 5.6));
            e.animLockUntil = now + 300;
            e.sprite.play(e.atkAnim);
          }
        } else if (e.aiState === 'strike') {
          if (e.aiTimer <= 0) {
            body.setVelocity(0, 0);
            e.jumpReticle?.destroy();
            e.jumpReticle = undefined;
            this.vfx.spawnGroundCrack(e.sprite.x, e.sprite.y, 0xff5252, 0.62, 450);
            this.vfx.spawnShockwave(e.sprite.x, e.sprite.y, 72, 0xff5252, 200);
            if (Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y) <= 74) {
              this.hurtPlayer(e.damage);
            }
            e.aiState = 'recover';
            e.aiTimer = Math.round((e.isElite ? 420 : 580) * DIFFICULTY.aiCooldownMult);
          }
        } else {
          body.setVelocity(0, 0);
          if (e.aiTimer <= 0) {
            e.aiState = 'chase';
            e.aiTimer = Math.round(460 * DIFFICULTY.aiCooldownMult);
          }
        }
      } else {
        // Melee Striker (Skeleton Sword Knight & Ice Phalanx Knight)
        const triggerDist = e.kind === 'ice' ? 96 : 82;
        if (e.aiState === 'chase') {
          body.setVelocity(Math.cos(ang) * e.speed * slowMult, Math.sin(ang) * e.speed * slowMult);
          if (dist <= triggerDist && e.aiTimer <= 0) {
            e.aiState = 'windup';
            e.aiTimer = Math.max(
              220,
              Math.round((e.kind === 'ice' ? (e.isElite ? 340 : 410) : e.isElite ? 290 : 340) * DIFFICULTY.aiCooldownMult)
            );
            e.lockedAngle = ang;
            e.sprite.setTint(0xff5252);
            this.floatText(e.sprite.x, e.sprite.y - 42, '❗ 攻击', '#ff5252', 13);
          }
        } else if (e.aiState === 'windup') {
          body.setVelocity(0, 0);
          if (e.aiTimer <= 0) {
            e.aiState = 'strike';
            e.aiTimer = 165;
            e.sprite.clearTint();
            e.animLockUntil = now + 310;
            e.sprite.play(e.atkAnim);
            const dashVel = e.kind === 'ice' ? 450 : e.isElite ? 520 : 420;
            body.setVelocity(Math.cos(e.lockedAngle) * dashVel, Math.sin(e.lockedAngle) * dashVel);
            if (dist <= triggerDist + 16) {
              this.hurtPlayer(e.damage);
            }
          }
        } else if (e.aiState === 'strike') {
          if (dist <= 56) this.hurtPlayer(e.damage);
          if (e.aiTimer <= 0) {
            e.aiState = 'recover';
            e.aiTimer = Math.round(
              (e.kind === 'ice' ? (e.isElite ? 380 : 520) : e.isElite ? 310 : 420) * DIFFICULTY.aiCooldownMult
            );
          }
        } else {
          body.setVelocity(0, 0);
          if (e.aiTimer <= 0) {
            e.aiState = 'chase';
            e.aiTimer = Math.round(340 * DIFFICULTY.aiCooldownMult);
          }
        }
      }

      // Soft separation between enemies
      for (const other of this.enemies) {
        if (other.id === e.id || !other.sprite.active || other.kind === 'dummy' || other.kind === 'totem') continue;
        const od = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, other.sprite.x, other.sprite.y);
        if (od > 0 && od < 38) {
          const pushAng = Phaser.Math.Angle.Between(other.sprite.x, other.sprite.y, e.sprite.x, e.sprite.y);
          body.velocity.x += Math.cos(pushAng) * 75;
          body.velocity.y += Math.sin(pushAng) * 75;
        }
      }

      if (now >= e.animLockUntil && e.aiState !== 'windup' && e.idleAnim && e.runAnim) {
        const moving = Math.hypot(body.velocity.x, body.velocity.y) > 12;
        const targetAnim = moving ? e.runAnim : e.idleAnim;
        if (e.sprite.anims.currentAnim?.key !== targetAnim) {
          e.sprite.play(targetAnim);
        }
      }
    }
  }

  private updateBossAI(
    e: EnemyEntity,
    now: number,
    dist: number,
    ang: number,
    slowMult: number,
    body: Phaser.Physics.Arcade.Body
  ) {
    if (e.aiState === 'chase') {
      body.setVelocity(Math.cos(ang) * e.speed * slowMult, Math.sin(ang) * e.speed * slowMult);
      if (e.aiTimer <= 0) {
        e.bossCycle = (e.bossCycle + 1) % 3;
        e.aiState = 'windup';
        e.lockedAngle = ang;
        e.sprite.setTint(e.bossEnraged ? 0xe040fb : 0xff5252);
        if (e.bossCycle === 0) {
          e.aiTimer = Math.max(240, Math.round((e.bossEnraged ? 300 : 390) * DIFFICULTY.aiCooldownMult));
          this.floatText(e.sprite.x, e.sprite.y - 60, '❗ 魔王破空斩!', '#ff5252', 15);
        } else if (e.bossCycle === 1) {
          e.aiTimer = Math.max(240, Math.round((e.bossEnraged ? 310 : 380) * DIFFICULTY.aiCooldownMult));
          this.floatText(e.sprite.x, e.sprite.y - 60, '🔥 炼狱炎弹幕!', '#ffab40', 15);
        } else {
          e.aiTimer = Math.max(230, Math.round((e.bossEnraged ? 290 : 360) * DIFFICULTY.aiCooldownMult));
          this.floatText(e.sprite.x, e.sprite.y - 60, e.bossEnraged ? '⚡ 永夜瞬袭!' : '⚠️ 魔王冲锋!', '#e040fb', 15);
        }
      }
    } else if (e.aiState === 'windup') {
      body.setVelocity(0, 0);
      if (e.aiTimer <= 0) {
        e.sprite.clearTint();
        e.animLockUntil = now + 500;
        e.sprite.play(e.atkAnim);

        if (e.bossCycle === 0) {
          // Sweeping Ground Slam + Parryable Cleave
          this.vfx.spawnGroundSlam(e.sprite.x, e.sprite.y, 138, e.bossEnraged ? 0xe040fb : 0xff1744);
          if (dist <= 148) this.hurtPlayer(e.damage);
          e.aiState = 'recover';
          e.aiTimer = Math.round((e.bossEnraged ? 360 : 520) * DIFFICULTY.aiCooldownMult);
        } else if (e.bossCycle === 1) {
          const bolts = e.bossEnraged ? DIFFICULTY.bossP2Bolts : DIFFICULTY.bossP1Bolts;
          for (let i = 0; i < bolts; i++) {
            this.spawnEnemyProjectile(e.sprite.x, e.sprite.y, (Math.PI * 2 * i) / bolts, 250, e.damage);
          }
          e.aiState = 'recover';
          e.aiTimer = Math.round((e.bossEnraged ? 380 : 520) * DIFFICULTY.aiCooldownMult);
        } else {
          e.aiState = 'strike';
          e.aiTimer = e.bossEnraged ? 480 : 310;
          body.setVelocity(Math.cos(e.lockedAngle) * 480, Math.sin(e.lockedAngle) * 480);
        }
      }
    } else if (e.aiState === 'strike') {
      if (dist <= 62) this.hurtPlayer(e.damage);
      if (e.aiTimer <= 0) {
        body.setVelocity(0, 0);
        if (e.bossEnraged) {
          for (let i = 0; i < DIFFICULTY.bossChargeBolts; i++) {
            this.spawnEnemyProjectile(e.sprite.x, e.sprite.y, ((Math.PI * 2) / DIFFICULTY.bossChargeBolts) * i + 0.4, 310, e.damage);
          }
        }
        e.aiState = 'recover';
        e.aiTimer = Math.round((e.bossEnraged ? 360 : 480) * DIFFICULTY.aiCooldownMult);
      }
    } else {
      body.setVelocity(0, 0);
      if (e.aiTimer <= 0) {
        e.aiState = 'chase';
        e.aiTimer = Math.round((e.bossEnraged ? 620 : 900) * DIFFICULTY.aiCooldownMult);
      }
    }
  }

  private spawnEnemyProjectile(x: number, y: number, ang: number, speed: number, damage: number, practiceOnly = false) {
    const finalSpeed = practiceOnly ? speed : Math.round(speed * DIFFICULTY.projSpeedMult);
    const sp = this.physics.add
      .image(x, y, 'tex_magic_orb')
      .setTint(practiceOnly ? 0xffd54f : 0xff3d00)
      .setScale(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(12);
    this.enemyProjectiles.push({
      sprite: sp,
      vx: Math.cos(ang) * finalSpeed,
      vy: Math.sin(ang) * finalSpeed,
      damage,
      lifeMs: 2600,
      trailCd: 0,
      practiceOnly,
    });
  }

  private updateProjectiles(delta: number) {
    const now = this.time.now;
    const dt = delta / 1000;
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const p = this.playerProjectiles[i];
      p.lifeMs -= delta;
      p.trailCd -= delta;
      if (p.boomerang && !p.returning && p.lifeMs < 750) {
        p.returning = true;
        p.hitIds.clear();
      }
      if (p.boomerang && p.returning) {
        const ang = Phaser.Math.Angle.Between(p.sprite.x, p.sprite.y, this.player.x, this.player.y);
        p.vx = Math.cos(ang) * 560;
        p.vy = Math.sin(ang) * 560;
      } else if (p.isSoulSword) {
        let tgt = p.homingTargetId
          ? this.enemies.find((e) => e.id === p.homingTargetId && e.sprite.active && !p.hitIds.has(e.id))
          : undefined;
        if (!tgt) {
          tgt = this.enemies
            .filter((e) => e.sprite.active && e.kind !== 'totem' && !p.hitIds.has(e.id))
            .sort(
              (a, b) =>
                Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, a.sprite.x, a.sprite.y) -
                Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, b.sprite.x, b.sprite.y)
            )[0];
          p.homingTargetId = tgt?.id;
        }
        if (tgt) {
          const desired = Phaser.Math.Angle.Between(p.sprite.x, p.sprite.y, tgt.sprite.x, tgt.sprite.y);
          const cur = Math.atan2(p.vy, p.vx);
          const spd = Math.hypot(p.vx, p.vy);
          const nextAng = Phaser.Math.Angle.RotateTo(cur, desired, 11.5 * dt);
          p.vx = Math.cos(nextAng) * spd;
          p.vy = Math.sin(nextAng) * spd;
          p.sprite.setRotation(nextAng + Math.PI / 4);
        }
      } else if (p.homingTargetId) {
        const tgt = this.enemies.find((e) => e.id === p.homingTargetId && e.sprite.active);
        if (tgt) {
          const desired = Phaser.Math.Angle.Between(p.sprite.x, p.sprite.y, tgt.sprite.x, tgt.sprite.y);
          const cur = Math.atan2(p.vy, p.vx);
          const spd = Math.hypot(p.vx, p.vy);
          const nextAng = Phaser.Math.Angle.RotateTo(cur, desired, 7.5 * dt);
          p.vx = Math.cos(nextAng) * spd;
          p.vy = Math.sin(nextAng) * spd;
          p.sprite.setRotation(nextAng);
        }
      }
      if (p.isBladeWheel) {
        p.rehitCd = (p.rehitCd ?? 300) - delta;
        if (p.rehitCd <= 0) {
          p.rehitCd = 300;
          p.hitIds.clear();
        }
      }
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      if (p.spinSpeed) p.sprite.rotation += p.spinSpeed * dt;

      if (p.trailCd <= 0) {
        p.trailCd = p.boomerang || p.isBladeWheel ? 42 : 28;
        const col = p.isSoulSword
          ? 0xe040fb
          : p.isFrostLance
          ? 0x80deea
          : p.isBladeWheel
          ? 0xff5252
          : this.getSlotColor(p.source, p.boomerang ? 0xce93d8 : 0x80deea);
        this.vfx.spawnProjectileTrail(p.sprite.x, p.sprite.y, Math.atan2(p.vy, p.vx), col, Boolean(p.boomerang || p.isBladeWheel));
      }

      // Trigger explosive barrels with arrows/projectiles!
      for (const b of [...this.barrels]) {
        if (!b.triggered && Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, b.x, b.y) <= 30) {
          this.triggerBarrel(b);
        }
      }

      for (const e of [...this.enemies]) {
        if (p.hitIds.has(e.id)) continue;
        const hr = p.isBladeWheel ? 54 : e.kind === 'boss' ? 46 : 30;
        if (Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, e.sprite.x, e.sprite.y) <= hr) {
          p.hitIds.add(e.id);
          p.pierce--;
          this.addPosture(e, p.postureDmg, Boolean(p.bypassShield));
          if (p.isFrostLance) {
            this.applyChill(e, 1);
          }
          if (p.isSoulSword && this.boons.has('duo_ares_nyx')) {
            e.doomTimer = 650;
            e.doomDamage = Math.round(28 * this.getGlobalDmgMult());
            e.doomColor = 0xff5252;
            e.doomRarity = 'epic';
          }
          this.damageEnemy(e, p.damage, p.source, Math.atan2(p.vy, p.vx), p.isBladeWheel ? 35 : 110, Boolean(p.bypassShield));

          // Hammer: Explosive Bow Arrows!
          if (p.explosive) {
            this.vfx.spawnBarrelExplosion(p.sprite.x, p.sprite.y);
            for (const other of [...this.enemies]) {
              if (other.id !== e.id && other.sprite.active && Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, other.sprite.x, other.sprite.y) <= 105) {
                this.addPosture(other, 22, true);
                this.damageEnemy(other, p.damage * 0.65, 'proc', 0, 120, true);
              }
            }
          }
          if (p.pierce <= 0) break;
        }
      }

      // Wall bounce check (Hammer: Bow Ricochet)
      if (p.bouncesLeft > 0) {
        if (p.sprite.x <= TILE + 6 || p.sprite.x >= ARENA_W - TILE - 6) {
          p.vx *= -1;
          p.sprite.x = Phaser.Math.Clamp(p.sprite.x, TILE + 8, ARENA_W - TILE - 8);
          p.sprite.setRotation(Math.atan2(p.vy, p.vx));
          p.bouncesLeft--;
        } else if (p.sprite.y <= TILE * 2 + 6 || p.sprite.y >= ARENA_H - TILE - 6) {
          p.vy *= -1;
          p.sprite.y = Phaser.Math.Clamp(p.sprite.y, TILE * 2 + 8, ARENA_H - TILE - 8);
          p.sprite.setRotation(Math.atan2(p.vy, p.vx));
          p.bouncesLeft--;
        }
      }

      const out =
        p.lifeMs <= 0 ||
        p.pierce <= 0 ||
        (p.bouncesLeft <= 0 &&
          (p.sprite.x < TILE || p.sprite.x > ARENA_W - TILE || p.sprite.y < TILE || p.sprite.y > ARENA_H - TILE));
      if (out) {
        p.sprite.destroy();
        this.playerProjectiles.splice(i, 1);
      }
    }

    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.lifeMs -= delta;
      ep.trailCd -= delta;
      ep.sprite.x += ep.vx * dt;
      ep.sprite.y += ep.vy * dt;
      if (ep.trailCd <= 0) {
        ep.trailCd = 36;
        this.vfx.spawnEnemyOrbTrail(ep.sprite.x, ep.sprite.y, ep.practiceOnly ? 0xffd54f : 0xff3d00);
      }

      const distToP = Phaser.Math.Distance.Between(ep.sprite.x, ep.sprite.y, this.player.x, this.player.y);
      // Precision Projectile Deflection!
      if (now < this.parryWindowUntil && distToP <= 56) {
        const refAng = Math.atan2(-ep.vy, -ep.vx);
        this.succeedParry(refAng);
        const deflSpd = Math.hypot(ep.vx, ep.vy) * 2.1;
        this.spawnPlayerProjectile(
          refAng,
          Math.max(55, ep.damage * 3.5) * this.getGlobalDmgMult(),
          deflSpd,
          'special',
          2,
          false
        );
        ep.sprite.destroy();
        this.enemyProjectiles.splice(i, 1);
        continue;
      }

      if (distToP <= 22) {
        if (!ep.practiceOnly) this.hurtPlayer(ep.damage);
        ep.sprite.destroy();
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
      if (
        ep.lifeMs <= 0 ||
        ep.sprite.x < TILE ||
        ep.sprite.x > ARENA_W - TILE ||
        ep.sprite.y < TILE ||
        ep.sprite.y > ARENA_H - TILE
      ) {
        ep.sprite.destroy();
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  private updateSpikes(delta: number) {
    for (const sp of this.spikes) {
      sp.timer -= delta;
      if (sp.phase === 'idle' && sp.timer <= 0) {
        sp.phase = 'warn';
        sp.timer = 650;
        sp.sprite.setTexture('spike_1');
      } else if (sp.phase === 'warn' && sp.timer <= 0) {
        sp.phase = 'active';
        sp.timer = 900;
        sp.sprite.setTexture('spike_3');
      } else if (sp.phase === 'active') {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, sp.x, sp.y) <= 24) {
          this.hurtPlayer(Math.round(8 * DIFFICULTY.damageMult));
        }
        if (sp.timer <= 0) {
          sp.phase = 'idle';
          sp.timer = 2200;
          sp.sprite.setTexture('spike_0');
        }
      }
    }
  }

  private updateInteractables() {
    let prompt: string | null = null;
    for (const it of [...this.interactables]) {
      if (it.consumed) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y);
      if (d <= it.radius) {
        if (it.autoTrigger) {
          it.consumed = true;
          it.onTrigger();
          return;
        }
        prompt = it.label;
      }
    }
    if (prompt !== this.activePrompt) {
      this.activePrompt = prompt;
      this.syncHud();
    }
  }

  // ============================================================================
  // Visual Effects & HUD Sync
  // ============================================================================
  private cameraPunch(zoomDelta = 0.025, shakeMs = 90, shakeIntensity = 0.005) {
    const rNow = performance.now();
    if (zoomDelta < 0.045 && rNow - this.lastCamPunchAt < 65) return;
    this.lastCamPunchAt = rNow;
    const cam = this.cameras.main;
    if (shakeMs > 0) cam.shake(shakeMs, shakeIntensity);
    this.tweens.killTweensOf(cam);
    cam.setZoom(1 + zoomDelta);
    this.tweens.add({
      targets: cam,
      zoom: 1,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
  }

  private spawnShockwave(x: number, y: number, radius: number, color: number) {
    this.vfx.spawnShockwave(x, y, radius, color);
  }

  private floatText(x: number, y: number, msg: string, color = '#ffffff', size = 14) {
    if (this.activeFloatTexts >= 26 && size < 16) return;
    this.activeFloatTexts++;
    const t = this.add
      .text(x, y, msg, {
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#0b0810',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScale(size >= 16 ? 1.45 : 1.16)
      .setDepth(30);
    this.tweens.add({ targets: t, scale: 1, duration: 110, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      delay: 70,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.activeFloatTexts = Math.max(0, this.activeFloatTexts - 1);
        t.destroy();
      },
    });
  }

  private syncHud(immediate = false) {
    if (!immediate) {
      this.hudDirty = true;
      return;
    }
    this.hudDirty = false;
    const now = this.time.now;
    const bossEnt = this.enemies.find((e) => e.kind === 'boss');
    this.ui.renderHud({
      hp: this.hp,
      maxHp: this.maxHp,
      wrath: this.wrath,
      dashCharges: this.dashCharges,
      maxDashCharges: this.maxDashCharges,
      parryReady: now >= this.parryCdUntil,
      revivesLeft: this.revivesLeft,
      maxRevives: this.maxRevives,
      chamber: this.chamber,
      gold: this.gold,
      darkness: this.save.darkness,
      weaponId: this.save.selectedWeapon,
      aspectName: WEAPON_ASPECTS[this.save.selectedWeapon][this.getAspectLevel() - 1].name,
      boons: Array.from(this.boons.values()),
      hammers: Array.from(this.hammers.values()),
      autoAim: this.autoAim,
      styleRank: this.getStyleState(),
      boss: bossEnt
        ? {
            name: bossEnt.bossEnraged
              ? `冥渊夜魔 · 永夜狂暴 [第 ${this.chamber} 层]`
              : `冥渊夜魔领主 · 奈特伯恩 [第 ${this.chamber} 层]`,
            hp: bossEnt.hp,
            maxHp: bossEnt.maxHp,
            posture: bossEnt.posture,
            maxPosture: bossEnt.maxPosture,
            broken: bossEnt.brokenUntil > now,
          }
        : null,
      promptText: this.activePrompt,
    });
  }
}
