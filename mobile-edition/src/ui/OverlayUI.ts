import { AcquiredBoon, BoonDef, GOD_META, RARITY_LABEL, Rarity } from '../data/boons';
import { DIFFICULTY } from '../data/difficulty';
import { ASPECT_UNLOCK_COST, HammerDef, WEAPON_ASPECTS, WEAPONS } from '../data/weapons';
import { sfx } from '../audio/sfx';
import { bgm } from '../audio/bgm';
import { getMirrorCost, MIRROR_ITEMS, SaveData, WeaponId } from '../state/save';

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  wrath: number;
  dashCharges: number;
  maxDashCharges: number;
  parryReady: boolean;
  revivesLeft: number;
  maxRevives: number;
  chamber: number;
  gold: number;
  darkness: number;
  weaponId: WeaponId;
  aspectName: string;
  boons: AcquiredBoon[];
  hammers: HammerDef[];
  autoAim: boolean;
  specialReady: boolean;
  dashSpecialWindow: boolean;
  canExecute: boolean;
  styleRank?: {
    letter: string;
    title: string;
    combo: number;
    pct: number;
    atkSpdBonus: number;
    moveBonus: number;
    colorHex: string;
  } | null;
  boss?: {
    name: string;
    hp: number;
    maxHp: number;
    posture: number;
    maxPosture: number;
    broken: boolean;
  } | null;
  promptText?: string | null;
}

export class OverlayUI {
  private root: HTMLElement;
  private vignetteEl: HTMLElement;
  private bannerEl: HTMLElement;
  private hudWrap: HTMLElement;
  private modalWrap: HTMLElement;
  private onToggleAutoAim: () => boolean;
  private onToggleMute: () => boolean;
  private onOpenMirrorShortcut?: () => void;
  private onMobileMove?: (vx: number, vy: number) => void;
  private onMobileAttackHold?: (held: boolean) => void;
  private onMobileSpecial?: () => void;
  private onMobileDash?: () => void;
  private onMobileParry?: () => void;
  private onMobileUlt?: () => void;
  private onMobileInteract?: () => void;

  // Persistent HUD DOM references (prevents repeat innerHTML rebuilds & focus stealing)
  private hudBuilt = false;
  private wpnBadgeEl!: HTMLElement;
  private hpNumsEl!: HTMLElement;
  private hpFillEl!: HTMLElement;
  private wrathFillEl!: HTMLElement;
  private dashPipsEl!: HTMLElement;
  private parryPipEl!: HTMLElement;
  private revivePipsEl!: HTMLElement;
  private boonStripEl!: HTMLElement;
  private bossWrapEl!: HTMLElement;
  private statDiffEl!: HTMLElement;
  private statChamberEl!: HTMLElement;
  private statGoldEl!: HTMLElement;
  private statDarknessEl!: HTMLElement;
  private autoAimBtn!: HTMLButtonElement;
  private muteBtn!: HTMLButtonElement;
  private fullscreenBtn!: HTMLButtonElement;
  private mirrorBtn!: HTMLButtonElement;
  private styleWrapEl!: HTMLElement;
  private promptWrapEl!: HTMLElement;
  private mobileControlsEl!: HTMLElement;
  private joyZoneEl!: HTMLElement;
  private joyBaseEl!: HTMLElement;
  private joyStickEl!: HTMLElement;
  private mobBtnAtk!: HTMLButtonElement;
  private mobBtnDash!: HTMLButtonElement;
  private mobBtnSpec!: HTMLButtonElement;
  private mobBtnParry!: HTMLButtonElement;
  private mobBtnUlt!: HTMLButtonElement;
  private mobBtnInteract!: HTMLButtonElement;
  private joyTouchId: number | null = null;
  private joyMouseActive = false;
  private joyOriginX = 0;
  private joyOriginY = 0;

  private prevDashKey = '';
  private prevReviveKey = '';
  private prevBoonKey = '';
  private prevBossHtml = '';
  private prevStyleHtml = '';
  private prevPrompt = '';

  constructor(
    root: HTMLElement,
    callbacks: {
      onToggleAutoAim: () => boolean;
      onToggleMute: () => boolean;
      onOpenMirrorShortcut?: () => void;
      onMobileMove?: (vx: number, vy: number) => void;
      onMobileAttackHold?: (held: boolean) => void;
      onMobileSpecial?: () => void;
      onMobileDash?: () => void;
      onMobileParry?: () => void;
      onMobileUlt?: () => void;
      onMobileInteract?: () => void;
    }
  ) {
    this.root = root;
    this.onToggleAutoAim = callbacks.onToggleAutoAim;
    this.onToggleMute = callbacks.onToggleMute;
    this.onOpenMirrorShortcut = callbacks.onOpenMirrorShortcut;
    this.onMobileMove = callbacks.onMobileMove;
    this.onMobileAttackHold = callbacks.onMobileAttackHold;
    this.onMobileSpecial = callbacks.onMobileSpecial;
    this.onMobileDash = callbacks.onMobileDash;
    this.onMobileParry = callbacks.onMobileParry;
    this.onMobileUlt = callbacks.onMobileUlt;
    this.onMobileInteract = callbacks.onMobileInteract;

    this.root.innerHTML = '';
    this.vignetteEl = document.createElement('div');
    this.vignetteEl.className = 'arena-vignette';
    this.bannerEl = document.createElement('div');
    this.hudWrap = document.createElement('div');
    this.modalWrap = document.createElement('div');
    this.root.appendChild(this.vignetteEl);
    this.root.appendChild(this.hudWrap);
    this.root.appendChild(this.bannerEl);
    this.root.appendChild(this.modalWrap);

    window.addEventListener('blur', () => this.resetMobileTouchState());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetMobileTouchState();
    });
  }

  private resetMobileTouchState() {
    this.joyTouchId = null;
    this.joyMouseActive = false;
    if (this.joyBaseEl) {
      this.joyBaseEl.classList.remove('active');
      this.joyBaseEl.style.left = '';
      this.joyBaseEl.style.top = '';
    }
    if (this.joyStickEl) {
      this.joyStickEl.style.transform = 'translate(-50%, -50%)';
    }
    this.mobBtnAtk?.classList.remove('pressed');
    if (this.mobileControlsEl) {
      this.mobileControlsEl.style.display = 'none';
    }
    this.onMobileMove?.(0, 0);
    this.onMobileAttackHold?.(false);
  }

  private ensureHudDom() {
    if (this.hudBuilt) return;
    this.hudBuilt = true;
    this.hudWrap.innerHTML = `
      <div class="hud-top-left">
        <div class="hp-panel">
          <div class="hero-crest">
            <img src="/assets/hd/hero_portrait.png" class="hero-portrait-img" alt="冥界王子" />
          </div>
          <div class="hp-bars-col">
            <div class="hp-header">
              <span class="wpn-badge" id="hud-wpn-badge"></span>
              <span class="hp-nums" id="hud-hp-nums"></span>
            </div>
            <div class="hp-bar-outer">
              <div class="hp-bar-fill" id="hud-hp-fill"></div>
            </div>
            <div class="wrath-bar-outer" title="神力大招槽 (Q 释放)">
              <div class="wrath-bar-fill" id="hud-wrath-fill"></div>
            </div>
            <div class="pips-row">
              <div class="dash-pips" id="hud-dash-pips" title="冲刺次数 (空格)"></div>
              <span class="parry-pip" id="hud-parry-pip" title="精准弹反 (F / R)"></span>
              <div class="revive-pips" id="hud-revive-pips"></div>
            </div>
          </div>
        </div>
        <div class="boon-strip" id="hud-boon-strip"></div>
      </div>

      <div id="hud-boss-wrap"></div>

      <div class="hud-top-right">
        <div class="stats-card">
          <span class="stat-diff" id="hud-stat-diff">${DIFFICULTY.label}</span>
          <span class="stat-chamber" id="hud-stat-chamber"></span>
          <span class="stat-gold" id="hud-stat-gold"></span>
          <span class="stat-darkness" id="hud-stat-darkness"></span>
        </div>
        <div class="hud-controls-row">
          <button id="btn-auto-aim" class="btn-hud" tabindex="-1"></button>
          <button id="btn-mute" class="btn-hud" tabindex="-1"></button>
          <button id="btn-fullscreen" class="btn-hud" tabindex="-1">⛶ 全屏</button>
          <button id="btn-mirror-top" class="btn-hud" tabindex="-1">🪞 圣镜</button>
        </div>
      </div>

      <div id="hud-style-wrap"></div>
      <div id="hud-prompt-wrap"></div>

      <div id="mobile-controls" class="mobile-controls" style="display:block">
        <div id="mob-joy-zone" class="mobile-joy-zone">
          <div id="mob-joy-base" class="joy-base">
            <div id="mob-joy-stick" class="joy-stick"></div>
          </div>
        </div>
        <div class="mobile-action-cluster">
          <button id="mob-btn-interact" class="mob-btn mob-interact" tabindex="-1" style="display:none">🖐️ 交互</button>
          <button id="mob-btn-ult" class="mob-btn mob-ult" tabindex="-1">⚡ 0%</button>
          <button id="mob-btn-parry" class="mob-btn mob-parry" tabindex="-1">🛡️ 振刀</button>
          <button id="mob-btn-spec" class="mob-btn mob-spec" tabindex="-1">✨ 特技</button>
          <button id="mob-btn-dash" class="mob-btn mob-dash" tabindex="-1">💨 冲刺</button>
          <button id="mob-btn-atk" class="mob-btn mob-atk" tabindex="-1">⚔️ 狂砍</button>
        </div>
      </div>
    `;

    this.wpnBadgeEl = document.getElementById('hud-wpn-badge')!;
    this.hpNumsEl = document.getElementById('hud-hp-nums')!;
    this.hpFillEl = document.getElementById('hud-hp-fill')!;
    this.wrathFillEl = document.getElementById('hud-wrath-fill')!;
    this.dashPipsEl = document.getElementById('hud-dash-pips')!;
    this.parryPipEl = document.getElementById('hud-parry-pip')!;
    this.revivePipsEl = document.getElementById('hud-revive-pips')!;
    this.boonStripEl = document.getElementById('hud-boon-strip')!;
    this.bossWrapEl = document.getElementById('hud-boss-wrap')!;
    this.statDiffEl = document.getElementById('hud-stat-diff')!;
    this.statChamberEl = document.getElementById('hud-stat-chamber')!;
    this.statGoldEl = document.getElementById('hud-stat-gold')!;
    this.statDarknessEl = document.getElementById('hud-stat-darkness')!;
    this.autoAimBtn = document.getElementById('btn-auto-aim') as HTMLButtonElement;
    this.muteBtn = document.getElementById('btn-mute') as HTMLButtonElement;
    this.fullscreenBtn = document.getElementById('btn-fullscreen') as HTMLButtonElement;
    this.mirrorBtn = document.getElementById('btn-mirror-top') as HTMLButtonElement;
    this.styleWrapEl = document.getElementById('hud-style-wrap')!;
    this.promptWrapEl = document.getElementById('hud-prompt-wrap')!;

    this.mobileControlsEl = document.getElementById('mobile-controls')!;
    this.joyZoneEl = document.getElementById('mob-joy-zone')!;
    this.joyBaseEl = document.getElementById('mob-joy-base')!;
    this.joyStickEl = document.getElementById('mob-joy-stick')!;
    this.mobBtnAtk = document.getElementById('mob-btn-atk') as HTMLButtonElement;
    this.mobBtnDash = document.getElementById('mob-btn-dash') as HTMLButtonElement;
    this.mobBtnSpec = document.getElementById('mob-btn-spec') as HTMLButtonElement;
    this.mobBtnParry = document.getElementById('mob-btn-parry') as HTMLButtonElement;
    this.mobBtnUlt = document.getElementById('mob-btn-ult') as HTMLButtonElement;
    this.mobBtnInteract = document.getElementById('mob-btn-interact') as HTMLButtonElement;

    this.autoAimBtn.onclick = (ev) => {
      (ev.currentTarget as HTMLElement)?.blur();
      bgm.startIfNeeded();
      this.onToggleAutoAim();
    };
    this.muteBtn.onclick = (ev) => {
      (ev.currentTarget as HTMLElement)?.blur();
      bgm.startIfNeeded();
      this.onToggleMute();
    };
    if (!document.fullscreenEnabled) {
      this.fullscreenBtn.style.display = 'none';
    } else {
      this.fullscreenBtn.onclick = (ev) => {
        (ev.currentTarget as HTMLElement)?.blur();
        bgm.startIfNeeded();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      };
    }
    this.mirrorBtn.onclick = (ev) => {
      (ev.currentTarget as HTMLElement)?.blur();
      bgm.startIfNeeded();
      this.onOpenMirrorShortcut?.();
    };

    this.promptWrapEl.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      bgm.startIfNeeded();
      this.onMobileInteract?.();
    });

    this.setupMobileGamepad();
  }

  private setupMobileGamepad() {
    const maxR = 46;
    const applyJoyClient = (clientX: number, clientY: number) => {
      let dx = clientX - this.joyOriginX;
      let dy = clientY - this.joyOriginY;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR && dist > 0.001) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      this.joyStickEl.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
      const normDist = Math.min(1, dist / maxR);
      if (normDist < 0.12) {
        this.onMobileMove?.(0, 0);
      } else {
        this.onMobileMove?.(dx / maxR, dy / maxR);
      }
    };

    const startJoyAt = (clientX: number, clientY: number) => {
      const rect = this.joyZoneEl.getBoundingClientRect();
      const pad = 54;
      const cx = Math.max(rect.left + pad, Math.min(rect.right - pad, clientX));
      const cy = Math.max(rect.top + pad, Math.min(rect.bottom - pad, clientY));
      this.joyOriginX = cx;
      this.joyOriginY = cy;
      this.joyBaseEl.style.left = `${cx - rect.left}px`;
      this.joyBaseEl.style.top = `${cy - rect.top}px`;
      this.joyBaseEl.classList.add('active');
      applyJoyClient(clientX, clientY);
    };

    const endJoy = () => {
      this.joyTouchId = null;
      this.joyMouseActive = false;
      this.joyBaseEl.classList.remove('active');
      this.joyBaseEl.style.left = '';
      this.joyBaseEl.style.top = '';
      this.joyStickEl.style.transform = 'translate(-50%, -50%)';
      this.onMobileMove?.(0, 0);
    };

    this.joyZoneEl.addEventListener(
      'touchstart',
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        bgm.startIfNeeded();
        if (this.joyTouchId !== null) return;
        const t = ev.changedTouches[0];
        if (!t) return;
        this.joyTouchId = t.identifier;
        startJoyAt(t.clientX, t.clientY);
      },
      { passive: false }
    );
    this.joyZoneEl.addEventListener(
      'touchmove',
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (this.joyTouchId === null) return;
        for (let i = 0; i < ev.changedTouches.length; i++) {
          const t = ev.changedTouches[i];
          if (t.identifier === this.joyTouchId) {
            applyJoyClient(t.clientX, t.clientY);
            break;
          }
        }
      },
      { passive: false }
    );
    const onJoyTouchEnd = (ev: TouchEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.joyTouchId === null) return;
      for (let i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === this.joyTouchId) {
          endJoy();
          break;
        }
      }
    };
    this.joyZoneEl.addEventListener('touchend', onJoyTouchEnd, { passive: false });
    this.joyZoneEl.addEventListener('touchcancel', onJoyTouchEnd, { passive: false });

    // Desktop fallback when manually previewing Touch Mode with a mouse
    this.joyZoneEl.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      bgm.startIfNeeded();
      this.joyMouseActive = true;
      startJoyAt(ev.clientX, ev.clientY);
    });
    window.addEventListener('mousemove', (ev) => {
      if (!this.joyMouseActive) return;
      applyJoyClient(ev.clientX, ev.clientY);
    });
    window.addEventListener('mouseup', () => {
      if (this.joyMouseActive) endJoy();
    });

    // Hold-to-Attack Primary Button
    this.mobBtnAtk.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      bgm.startIfNeeded();
      this.mobBtnAtk.classList.add('pressed');
      try {
        this.mobBtnAtk.setPointerCapture(ev.pointerId);
      } catch {
        // Ignore if capture unsupported
      }
      this.onMobileAttackHold?.(true);
    });
    const releaseAtk = (ev?: Event) => {
      ev?.stopPropagation();
      this.mobBtnAtk.classList.remove('pressed');
      this.onMobileAttackHold?.(false);
    };
    this.mobBtnAtk.addEventListener('pointerup', releaseAtk);
    this.mobBtnAtk.addEventListener('pointercancel', releaseAtk);
    this.mobBtnAtk.addEventListener('lostpointercapture', releaseAtk);

    const bindTapBtn = (btn: HTMLButtonElement, fn?: () => void) => {
      btn.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        bgm.startIfNeeded();
        btn.classList.add('pressed');
        fn?.();
      });
      const unpress = () => btn.classList.remove('pressed');
      btn.addEventListener('pointerup', unpress);
      btn.addEventListener('pointercancel', unpress);
      btn.addEventListener('pointerleave', unpress);
    };
    bindTapBtn(this.mobBtnDash, () => this.onMobileDash?.());
    bindTapBtn(this.mobBtnSpec, () => this.onMobileSpecial?.());
    bindTapBtn(this.mobBtnParry, () => this.onMobileParry?.());
    bindTapBtn(this.mobBtnUlt, () => this.onMobileUlt?.());
    bindTapBtn(this.mobBtnInteract, () => this.onMobileInteract?.());
  }

  renderHud(s: HudSnapshot) {
    this.ensureHudDom();

    const hpPct = Math.max(0, Math.min(100, (s.hp / Math.max(1, s.maxHp)) * 100));
    const wrathPct = Math.max(0, Math.min(100, s.wrath));
    const wpn = WEAPONS[s.weaponId];

    this.wpnBadgeEl.textContent = `⚔️ ${wpn.name} · ${s.aspectName}`;
    this.hpNumsEl.textContent = `❤️ ${Math.ceil(s.hp)} / ${s.maxHp}`;
    this.hpFillEl.style.width = `${hpPct}%`;
    this.wrathFillEl.style.width = `${wrathPct}%`;
    this.wrathFillEl.className = `wrath-bar-fill ${wrathPct >= 100 ? 'ready' : ''}`;

    const dashKey = `${s.dashCharges}/${s.maxDashCharges}`;
    if (dashKey !== this.prevDashKey) {
      this.prevDashKey = dashKey;
      let dashHtml = '<span>💨</span>';
      for (let i = 0; i < s.maxDashCharges; i++) {
        dashHtml += `<span class="dash-pip ${i < s.dashCharges ? 'active' : ''}"></span>`;
      }
      this.dashPipsEl.innerHTML = dashHtml;
    }

    this.parryPipEl.className = `parry-pip ${s.parryReady ? 'ready' : ''}`;
    this.parryPipEl.textContent = s.parryReady ? '🛡️ 弹反就绪' : '🛡️ 冷却中';

    const reviveKey = `${s.revivesLeft}/${s.maxRevives}`;
    if (reviveKey !== this.prevReviveKey) {
      this.prevReviveKey = reviveKey;
      let reviveHtml = '';
      for (let i = 0; i < s.maxRevives; i++) {
        reviveHtml += `<span class="revive-skull ${i < s.revivesLeft ? '' : 'spent'}" title="死里逃生次数">💀</span>`;
      }
      this.revivePipsEl.innerHTML = reviveHtml || '<span style="opacity:.45">无</span>';
    }

    const boonKey = `${s.hammers.map((h) => h.id).join(',')}|${s.boons.map((b) => `${b.def.id}:${b.rarity}`).join(',')}`;
    if (boonKey !== this.prevBoonKey) {
      this.prevBoonKey = boonKey;
      const hammerHtml = s.hammers
        .map(
          (h) =>
            `<div class="boon-chip hammer-chip" title="${h.desc}">
              <span>${h.icon}</span>
              <span style="color:#ffd54f">${h.name}</span>
            </div>`
        )
        .join('');
      const boonHtml = s.boons
        .map(
          (b) =>
            `<div class="boon-chip" style="border-color:${b.def.colorHex}" title="${b.def.descTemplate(b.value)}">
              <span>${b.def.icon}</span>
              <span style="color:${b.def.colorHex}">${b.def.name}</span>
            </div>`
        )
        .join('');
      this.boonStripEl.innerHTML = `${hammerHtml}${boonHtml}`;
    }

    const bossHtml = s.boss
      ? `<div class="boss-bar-wrap">
          <div class="boss-name">👹 ${s.boss.name}</div>
          <div class="boss-hp-outer">
            <div class="boss-hp-fill" style="width:${Math.max(0, (s.boss.hp / Math.max(1, s.boss.maxHp)) * 100)}%"></div>
          </div>
          <div class="boss-posture-outer" title="架势条满值后将破防失衡，可按左键直接处决">
            <div class="boss-posture-fill ${s.boss.broken ? 'broken' : ''}" style="width:${
              s.boss.broken ? 100 : Math.max(0, Math.min(100, (s.boss.posture / Math.max(1, s.boss.maxPosture)) * 100))
            }%"></div>
          </div>
          ${s.boss.broken ? '<div class="boss-broken-tag">⚡ 破防失衡 · 靠近按左键处决!</div>' : ''}
        </div>`
      : '';
    if (bossHtml !== this.prevBossHtml) {
      this.prevBossHtml = bossHtml;
      this.bossWrapEl.innerHTML = bossHtml;
    }

    const compactHeader = window.innerWidth <= 680;
    this.statDiffEl.textContent = compactHeader ? '🔥3×' : DIFFICULTY.label;
    this.statChamberEl.textContent =
      s.chamber === 0
        ? compactHeader
          ? '圣殿'
          : '冥界圣殿 (手机版)'
        : s.chamber <= 8
        ? compactHeader
          ? `${s.chamber}/8层`
          : `第 ${s.chamber} / 8 层`
        : compactHeader
        ? `无尽${s.chamber}`
        : `无尽 · 第 ${s.chamber} 层`;
    this.statGoldEl.textContent = `🪙 ${s.gold}`;
    this.statDarknessEl.textContent = `🔮 ${s.darkness}`;

    this.autoAimBtn.className = `btn-hud ${s.autoAim ? 'active' : ''}`;
    this.autoAimBtn.textContent = compactHeader
      ? `🎯 瞄准:${s.autoAim ? '开' : '关'}`
      : `🎯 自动瞄准: ${s.autoAim ? '开' : '关'}`;
    this.muteBtn.textContent = sfx.isMuted() ? '🔇 静音' : '🔊 音效';
    if (document.fullscreenEnabled) {
      this.fullscreenBtn.textContent = document.fullscreenElement ? '⛶ 退出' : '⛶ 全屏';
    }

    const inHub = s.chamber === 0;
    this.mirrorBtn.style.display = inHub && this.onOpenMirrorShortcut ? '' : 'none';
    this.mirrorBtn.textContent = compactHeader ? '🪞 圣镜' : '🪞 夜之圣镜';

    const showTouch = !this.hasModal();
    this.mobileControlsEl.style.display = showTouch ? 'block' : 'none';
    if (showTouch) {
      this.mobBtnAtk.classList.toggle('exec-ready', s.canExecute);
      this.mobBtnAtk.textContent = s.canExecute ? '⚔️ 处决!' : '⚔️ 狂砍';

      this.mobBtnDash.classList.toggle('cooldown', s.dashCharges <= 0);
      this.mobBtnDash.innerHTML = `<span>💨</span><span>冲刺 ×${s.dashCharges}</span>`;

      this.mobBtnSpec.classList.toggle('combo-finisher', s.dashSpecialWindow && s.specialReady);
      this.mobBtnSpec.classList.toggle('cooldown', !s.specialReady);
      this.mobBtnSpec.innerHTML = s.dashSpecialWindow && s.specialReady ? '<span>⚡</span><span>绝技!</span>' : '<span>✨</span><span>特技</span>';

      this.mobBtnParry.classList.toggle('ready', s.parryReady);
      this.mobBtnParry.classList.toggle('cooldown', !s.parryReady);
      this.mobBtnParry.innerHTML = s.parryReady ? '<span>🛡️</span><span>振刀</span>' : '<span>🛡️</span><span>冷却</span>';

      const ultReady = s.wrath >= 100;
      this.mobBtnUlt.classList.toggle('ult-ready', ultReady);
      this.mobBtnUlt.innerHTML = ultReady ? '<span>⚡</span><span>大招!</span>' : `<span>⚡</span><span>${Math.floor(s.wrath)}%</span>`;

      this.mobBtnInteract.style.display = s.promptText ? 'flex' : 'none';
    }

    const styleHtml = s.styleRank
      ? `<div class="style-rank-panel" style="border-color:${s.styleRank.colorHex}">
          <div class="style-top-row">
            <div class="style-letter" style="color:${s.styleRank.colorHex}; text-shadow:0 0 18px ${s.styleRank.colorHex}">${s.styleRank.letter}</div>
            <div class="style-meta">
              <div class="style-title" style="color:${s.styleRank.colorHex}">${s.styleRank.title} · 🔥 ${s.styleRank.combo} 连斩</div>
              <div class="style-bar-outer"><div class="style-bar-fill" style="width:${s.styleRank.pct}%; background:${s.styleRank.colorHex}"></div></div>
            </div>
          </div>
          <div class="style-buffs">⚡攻速 +${s.styleRank.atkSpdBonus}% · 💨移速 +${s.styleRank.moveBonus}%</div>
        </div>`
      : '';
    if (styleHtml !== this.prevStyleHtml) {
      this.prevStyleHtml = styleHtml;
      this.styleWrapEl.innerHTML = styleHtml;
    }

    const promptHtml = s.promptText ? `<div class="prompt-banner">${s.promptText}</div>` : '';
    if (promptHtml !== this.prevPrompt) {
      this.prevPrompt = promptHtml;
      this.promptWrapEl.innerHTML = promptHtml;
    }
  }

  clearModal() {
    this.modalWrap.innerHTML = '';
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (this.mobileControlsEl) {
      this.mobileControlsEl.style.display = 'block';
    }
  }

  triggerHurtPulse() {
    this.vignetteEl.classList.remove('hurt-pulse');
    void this.vignetteEl.offsetWidth;
    this.vignetteEl.classList.add('hurt-pulse');
    setTimeout(() => {
      this.vignetteEl.classList.remove('hurt-pulse');
    }, 240);
  }

  triggerUltimateBanner(icon: string, title: string, subtitle: string, colorHex: string) {
    this.vignetteEl.style.setProperty('--divine-color', colorHex);
    this.vignetteEl.classList.remove('divine-flash');
    void this.vignetteEl.offsetWidth;
    this.vignetteEl.classList.add('divine-flash');
    setTimeout(() => {
      this.vignetteEl.classList.remove('divine-flash');
    }, 520);

    this.bannerEl.innerHTML = `
      <div class="ult-cutin-banner" style="--ult-color:${colorHex}">
        <div class="ult-cutin-icon">${icon}</div>
        <div class="ult-cutin-text">
          <div class="ult-cutin-title">${title}</div>
          <div class="ult-cutin-sub">${subtitle}</div>
        </div>
      </div>
    `;
    setTimeout(() => {
      this.bannerEl.innerHTML = '';
    }, 1500);
  }

  hasModal(): boolean {
    return this.modalWrap.innerHTML.trim().length > 0;
  }

  showBoonModal(
    choices: Array<{ def: BoonDef; rarity: Rarity; value: number }>,
    onPick: (choice: { def: BoonDef; rarity: Rarity; value: number }) => void
  ) {
    this.resetMobileTouchState();
    const cardsHtml = choices
      .map((c, idx) => {
        const meta = GOD_META[c.def.god];
        const badgeColor =
          c.rarity === 'duo'
            ? '#ffd54f'
            : c.rarity === 'epic'
            ? '#ce93d8'
            : c.rarity === 'rare'
            ? '#4fc3f7'
            : '#d5d0dc';
        const tagText = c.def.slot === 'duo' ? `${c.def.icon} ${c.def.godName}` : `${meta.icon} ${meta.name}`;
        return `
          <div class="boon-card rarity-${c.rarity}" data-idx="${idx}">
            <div class="boon-top">
              <span class="boon-god-tag" style="color:${c.def.slot === 'duo' ? c.def.colorHex : meta.colorHex}">${tagText}</span>
              <span class="rarity-badge" style="color:${badgeColor}">${RARITY_LABEL[c.rarity]}</span>
            </div>
            <div class="boon-name">${c.def.name}</div>
            <div class="boon-slot">${c.def.slotLabel}</div>
            <div class="boon-desc">${c.def.descTemplate(c.value)}</div>
          </div>
        `;
      })
      .join('');

    this.modalWrap.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-panel">
          <h2 class="modal-title">✨ 众神赐福 · 选择一项神力</h2>
          <p class="modal-subtitle">凑齐不同主神的祝福有高概率解锁「传奇双神共鸣」！</p>
          <div class="boon-grid">${cardsHtml}</div>
        </div>
      </div>
    `;

    this.modalWrap.querySelectorAll<HTMLElement>('.boon-card').forEach((el) => {
      el.onclick = () => {
        const idx = Number(el.dataset.idx);
        sfx.playBoonSelect();
        this.clearModal();
        onPick(choices[idx]);
      };
    });
  }

  showHammerModal(choices: HammerDef[], onPick: (choice: HammerDef) => void) {
    this.resetMobileTouchState();
    const cardsHtml = choices
      .map(
        (h, idx) => `
        <div class="boon-card rarity-hammer" data-idx="${idx}">
          <div class="boon-top">
            <span class="boon-god-tag" style="color:#ffca28">🔨 泰坦神匠 · 武器质变</span>
            <span class="rarity-badge" style="color:#ffd54f">形态改造</span>
          </div>
          <div class="boon-name">${h.name}</div>
          <div class="boon-slot">${WEAPONS[h.weapon].name}</div>
          <div class="boon-desc">${h.desc}</div>
        </div>
      `
      )
      .join('');

    this.modalWrap.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-panel">
          <h2 class="modal-title">🔨 代达罗斯神匠之锤</h2>
          <p class="modal-subtitle">选择一项彻底改变你当前武器战斗机制的终极锻造改造</p>
          <div class="boon-grid">${cardsHtml}</div>
        </div>
      </div>
    `;

    this.modalWrap.querySelectorAll<HTMLElement>('.boon-card').forEach((el) => {
      el.onclick = () => {
        const idx = Number(el.dataset.idx);
        sfx.playBoonSelect();
        this.clearModal();
        onPick(choices[idx]);
      };
    });
  }

  showAspectModal(
    weaponId: WeaponId,
    save: SaveData,
    onSelectAspect: (lvl: 1 | 2) => void,
    onUnlockAspect: () => boolean,
    onClose: () => void
  ) {
    this.resetMobileTouchState();
    const render = () => {
      const wpn = WEAPONS[weaponId];
      const aspects = WEAPON_ASPECTS[weaponId];
      const curSel = save.selectedAspects[weaponId];
      const unlocked2 = save.unlockedAspects[weaponId];

      const cards = aspects
        .map((a) => {
          const isUnlocked = a.level === 1 || unlocked2;
          const isActive = curSel === a.level;
          const btnHtml = !isUnlocked
            ? `<button class="btn-primary aspect-unlock" ${save.darkness >= ASPECT_UNLOCK_COST ? '' : 'disabled'}>🔮 ${ASPECT_UNLOCK_COST} 解锁觉醒神态</button>`
            : isActive
            ? `<button class="btn-secondary" disabled style="border-color:#ffd54f;color:#ffd54f">✓ 当前正在使用</button>`
            : `<button class="btn-primary aspect-equip" data-lvl="${a.level}">⚡ 切换为此神态</button>`;
          return `
            <div class="boon-card ${isActive ? 'rarity-hammer' : 'rarity-rare'}">
              <div class="boon-top">
                <span class="boon-god-tag" style="color:${a.accentHex}">形态 ${a.level === 1 ? 'I' : 'II'}</span>
                <span class="rarity-badge" style="color:${isActive ? '#ffd54f' : '#b8afaa'}">${isActive ? '已激活' : isUnlocked ? '已解锁' : '未解锁'}</span>
              </div>
              <div class="boon-name">${a.name}</div>
              <div class="boon-slot">${a.tagline}</div>
              <div class="boon-desc">${a.desc}</div>
              <div style="margin-top:8px">${btnHtml}</div>
            </div>
          `;
        })
        .join('');

      this.modalWrap.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal-panel">
            <h2 class="modal-title">⚔️ ${wpn.name} · 武器神态分支</h2>
            <p class="modal-subtitle">当前持有冥晶：<b style="color:#ce93d8">🔮 ${save.darkness}</b> · 切换神态立刻生效</p>
            <div class="aspect-grid">${cards}</div>
            <div class="modal-footer">
              <button class="btn-secondary" id="aspect-close">完成出战</button>
            </div>
          </div>
        </div>
      `;

      this.modalWrap.querySelectorAll<HTMLButtonElement>('.aspect-equip').forEach((btn) => {
        btn.onclick = () => {
          sfx.playBoonSelect();
          onSelectAspect(Number(btn.dataset.lvl) as 1 | 2);
          render();
        };
      });
      this.modalWrap.querySelector<HTMLButtonElement>('.aspect-unlock')?.addEventListener('click', () => {
        if (onUnlockAspect()) {
          sfx.playDivineDescent();
          render();
        }
      });
      document.getElementById('aspect-close')?.addEventListener('click', () => {
        this.clearModal();
        onClose();
      });
    };
    render();
  }

  showMirrorModal(save: SaveData, onUpgrade: (key: keyof SaveData['mirror']) => void, onClose: () => void) {
    this.resetMobileTouchState();
    const renderBody = () => {
      const rowsHtml = MIRROR_ITEMS.map((item) => {
        const lvl = save.mirror[item.key];
        const maxed = lvl >= item.maxLevel;
        const cost = getMirrorCost(item, lvl);
        const canAfford = !maxed && save.darkness >= cost;
        return `
          <div class="upgrade-row">
            <div class="upgrade-info">
              <h4>${item.name} <span style="color:#b8afaa;font-size:12px;">(Lv.${lvl} / ${item.maxLevel})</span></h4>
              <p>${item.desc}</p>
            </div>
            <button class="btn-primary mirror-buy" data-key="${item.key}" ${canAfford ? '' : 'disabled'}>
              ${maxed ? '已满级' : `🔮 ${cost} 升级`}
            </button>
          </div>
        `;
      }).join('');

      this.modalWrap.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal-panel">
            <h2 class="modal-title">🪞 夜之圣镜 · 永久天赋</h2>
            <p class="modal-subtitle">当前拥有冥晶：<b style="color:#ce93d8">🔮 ${save.darkness}</b> · 历史最高层数：<b style="color:#ffd54f">第 ${save.bestChamber} 层</b></p>
            <div class="mirror-list">${rowsHtml}</div>
            <div class="modal-footer">
              <button class="btn-secondary" id="mirror-close">关闭圣镜</button>
            </div>
          </div>
        </div>
      `;

      this.modalWrap.querySelectorAll<HTMLButtonElement>('.mirror-buy').forEach((btn) => {
        btn.onclick = () => {
          const k = btn.dataset.key as keyof SaveData['mirror'];
          sfx.playBoonSelect();
          onUpgrade(k);
          renderBody();
        };
      });
      document.getElementById('mirror-close')?.addEventListener('click', () => {
        this.clearModal();
        onClose();
      });
    };
    renderBody();
  }

  showShopModal(
    gold: number,
    onBuy: (item: 'heal' | 'maxhp' | 'boon', cost: number) => boolean,
    onClose: () => void
  ) {
    this.resetMobileTouchState();
    let curGold = gold;
    const renderShop = () => {
      const items = [
        { id: 'heal' as const, title: '🧪 冥河生命药水', desc: '立刻恢复 45 点生命值。', cost: 40 },
        { id: 'maxhp' as const, title: '❤️ 半人马之心', desc: '永久提升本局最大生命值 +25，并回复 25 生命。', cost: 65 },
        { id: 'boon' as const, title: '🎁 神秘神明祝福', desc: '立刻随机开启一次众神祝福三选一！', cost: 85 },
      ];
      const rows = items
        .map(
          (it) => `
          <div class="upgrade-row">
            <div class="upgrade-info">
              <h4>${it.title}</h4>
              <p>${it.desc}</p>
            </div>
            <button class="btn-primary shop-buy" data-id="${it.id}" data-cost="${it.cost}" ${
            curGold >= it.cost ? '' : 'disabled'
          }>🪙 ${it.cost} 购买</button>
          </div>
        `
        )
        .join('');

      this.modalWrap.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal-panel">
            <h2 class="modal-title">🛒 冥河摆渡人 · 卡戎的黑市</h2>
            <p class="modal-subtitle">当前持有金币：<b style="color:#ffca28">🪙 ${curGold}</b></p>
            <div class="shop-list">${rows}</div>
            <div class="modal-footer">
              <button class="btn-secondary" id="shop-close">离开商店</button>
            </div>
          </div>
        </div>
      `;

      this.modalWrap.querySelectorAll<HTMLButtonElement>('.shop-buy').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.id as 'heal' | 'maxhp' | 'boon';
          const cost = Number(btn.dataset.cost);
          if (onBuy(id, cost)) {
            curGold -= cost;
            sfx.playPickup();
            if (id === 'boon') {
              return;
            }
            renderShop();
          }
        };
      });
      document.getElementById('shop-close')?.addEventListener('click', () => {
        this.clearModal();
        onClose();
      });
    };
    renderShop();
  }

  showDeathModal(
    stats: { chamber: number; kills: number; darknessEarned: number; boonsCount: number; bestChamber: number },
    onReturnHub: () => void
  ) {
    this.resetMobileTouchState();
    this.modalWrap.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-panel">
          <h2 class="modal-title" style="color:#ff5252">💀 冥血归位 · 闯关结束</h2>
          <p class="modal-subtitle">冥界之魂重归冥河，你带回了宝贵的冥晶用于升级夜之圣镜</p>
          <div class="summary-stats">
            <div class="summary-box"><div class="val">第 ${stats.chamber} 层</div><div class="lbl">本局到达层数</div></div>
            <div class="summary-box"><div class="val">${stats.kills}</div><div class="lbl">击杀冥界魔物</div></div>
            <div class="summary-box"><div class="val">+${stats.darknessEarned}</div><div class="lbl">🔮 收获冥晶</div></div>
            <div class="summary-box"><div class="val">第 ${stats.bestChamber} 层</div><div class="lbl">历史最高记录</div></div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" id="btn-return-hub">🔥 返回冥界圣殿 (升级后再战)</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('btn-return-hub')?.addEventListener('click', () => {
      sfx.playBoonSelect();
      this.clearModal();
      onReturnHub();
    });
  }

  showVictoryModal(
    stats: { kills: number; darknessEarned: number; boonsCount: number; hammersCount: number },
    onContinueEndless: () => void,
    onReturnHub: () => void
  ) {
    this.resetMobileTouchState();
    this.modalWrap.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-panel">
          <h2 class="modal-title" style="color:#ffd54f">👑 冥渊破晓 · 逃离成功!</h2>
          <p class="modal-subtitle">你斩杀了二阶段觉醒的夜魔领主·奈特伯恩，彻底征服了塔尔塔罗斯第 8 层！</p>
          <div class="summary-stats">
            <div class="summary-box"><div class="val">${stats.kills}</div><div class="lbl">本局击杀魔物</div></div>
            <div class="summary-box"><div class="val">${stats.boonsCount} / ${stats.hammersCount}</div><div class="lbl">神明祝福 / 神匠锤</div></div>
            <div class="summary-box"><div class="val">+${stats.darknessEarned}</div><div class="lbl">🔮 胜利奖赏冥晶</div></div>
            <div class="summary-box"><div class="val">第 8 层</div><div class="lbl">精品章完美通关</div></div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" id="btn-continue-endless">🔥 挑战无尽模式 (第 9 层+)</button>
            <button class="btn-secondary" id="btn-victory-hub">🏠 凯旋返回圣殿</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('btn-continue-endless')?.addEventListener('click', () => {
      sfx.playBoonSelect();
      this.clearModal();
      onContinueEndless();
    });
    document.getElementById('btn-victory-hub')?.addEventListener('click', () => {
      sfx.playBoonSelect();
      this.clearModal();
      onReturnHub();
    });
  }
}
