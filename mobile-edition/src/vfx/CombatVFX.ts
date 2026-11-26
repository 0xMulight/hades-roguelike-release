import Phaser from 'phaser';
import { GodId, Rarity } from '../data/boons';
import { sfx } from '../audio/sfx';

export interface MeleeSlashOpts {
  x: number;
  y: number;
  angle: number;
  color: number;
  comboStep: number;
  isHeavy: boolean;
  isDashStrike: boolean;
  isBlades: boolean;
  scaleMult?: number;
}

const GOD_COLORS: Record<GodId, { primary: number; epicSub: number }> = {
  zeus: { primary: 0xffd54f, epicSub: 0xe040fb },
  ares: { primary: 0xff3d00, epicSub: 0xffd54f },
  demeter: { primary: 0x4dd0e1, epicSub: 0xb388ff },
  nyx: { primary: 0xce93d8, epicSub: 0xff1744 },
};

function rarityScale(rarity: Rarity = 'common'): number {
  if (rarity === 'epic') return 1.55;
  if (rarity === 'rare') return 1.26;
  return 1.0;
}

export class CombatVFX {
  private scene: Phaser.Scene;
  private burstWindowStart = 0;
  private heavyBurstsInWindow = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private allowFullHeavyBurst(maxPerWindow = 3, windowMs = 60): boolean {
    const now = performance.now();
    if (now - this.burstWindowStart > windowMs) {
      this.burstWindowStart = now;
      this.heavyBurstsInWindow = 0;
    }
    this.heavyBurstsInWindow++;
    return this.heavyBurstsInWindow <= maxPerWindow;
  }

  /** Multi-layered Hades crescent slash ribbon + blade sparks + dash thrust */
  spawnMeleeSlash(opts: MeleeSlashOpts) {
    const { x, y, angle, color, comboStep, isHeavy, isDashStrike, isBlades, scaleMult = 1.0 } = opts;

    const spawnArc = (ang: number, scale: number, flipY: boolean, tex: string, duration = 165) => {
      const s = scale * scaleMult;
      const dist = (isHeavy ? 38 : 30) * Math.max(1, scaleMult * 0.92);
      const sx = x + Math.cos(ang) * dist;
      const sy = y + Math.sin(ang) * dist;

      const outer = this.scene.add
        .image(sx, sy, tex)
        .setRotation(ang)
        .setFlipY(flipY)
        .setScale(s)
        .setTint(color)
        .setAlpha(0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(16);

      const core = this.scene.add
        .image(sx + Math.cos(ang) * 4, sy + Math.sin(ang) * 4, tex)
        .setRotation(ang)
        .setFlipY(flipY)
        .setScale(s * 0.88)
        .setAlpha(0.82)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(17);

      this.scene.tweens.add({
        targets: [outer, core],
        alpha: 0,
        scaleX: s * 1.18,
        scaleY: s * 1.12,
        duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          outer.destroy();
          core.destroy();
        },
      });
    };

    if (isBlades) {
      spawnArc(angle - 0.18, 0.78, comboStep % 2 === 0, 'tex_slash_thin', 125);
      spawnArc(angle + 0.18, 0.78, comboStep % 2 !== 0, 'tex_slash_thin', 125);
    } else {
      const baseScale = isHeavy ? 1.18 : isDashStrike ? 0.98 : 0.84;
      spawnArc(angle, baseScale, comboStep % 2 === 0, 'tex_slash_heavy', isHeavy ? 210 : 155);
    }

    if (isHeavy) {
      const hitX = x + Math.cos(angle) * 58;
      const hitY = y + Math.sin(angle) * 58;
      this.spawnGroundCrack(hitX, hitY, color, 0.72, 720);
      this.spawnShockwave(hitX, hitY, 96, color, 240);
      this.spawnRadialSparks(hitX, hitY, color, 8, 95, 160);
    }

    if (isDashStrike) {
      const tipX = x + Math.cos(angle) * 56;
      const tipY = y + Math.sin(angle) * 56;
      const flare = this.scene.add
        .image(tipX, tipY, 'tex_star_flare')
        .setRotation(angle)
        .setScale(1.25, 0.55)
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(18);
      this.scene.tweens.add({
        targets: flare,
        x: tipX + Math.cos(angle) * 28,
        y: tipY + Math.sin(angle) * 28,
        scaleX: 1.7,
        alpha: 0,
        duration: 165,
        onComplete: () => flare.destroy(),
      });
    }
  }

  /** Bow release flash */
  spawnBowRelease(x: number, y: number, angle: number, color: number, isVolley = false) {
    const mx = x + Math.cos(angle) * 26;
    const my = y + Math.sin(angle) * 26;
    const flare = this.scene.add
      .image(mx, my, 'tex_star_flare')
      .setRotation(angle)
      .setScale(isVolley ? 1.15 : 0.72, isVolley ? 0.85 : 0.52)
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17);
    this.scene.tweens.add({
      targets: flare,
      scaleX: isVolley ? 1.55 : 1.0,
      scaleY: 0.15,
      alpha: 0,
      duration: 150,
      onComplete: () => flare.destroy(),
    });
  }

  /** Throttled projectile trail segment */
  spawnProjectileTrail(x: number, y: number, angle: number, color: number, isBoomerang: boolean) {
    if (isBoomerang) {
      const ring = this.scene.add
        .image(x, y, 'tex_slash_thin')
        .setRotation(Math.random() * Math.PI * 2)
        .setScale(0.46)
        .setTint(color)
        .setAlpha(0.7)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12);
      this.scene.tweens.add({
        targets: ring,
        rotation: ring.rotation + 1.8,
        alpha: 0,
        scale: 0.62,
        duration: 150,
        onComplete: () => ring.destroy(),
      });
      return;
    }

    const streak = this.scene.add
      .image(x, y, 'tex_hit_streak')
      .setRotation(angle)
      .setScale(0.85, 0.55)
      .setTint(color)
      .setAlpha(0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(12);
    this.scene.tweens.add({
      targets: streak,
      alpha: 0,
      scaleX: 0.25,
      scaleY: 0.2,
      duration: 135,
      onComplete: () => streak.destroy(),
    });
  }

  /** Enemy dark-magic projectile orb trail */
  spawnEnemyOrbTrail(x: number, y: number, color = 0xff3d00) {
    const mote = this.scene.add
      .image(x + Phaser.Math.Between(-3, 3), y + Phaser.Math.Between(-3, 3), 'tex_spark')
      .setScale(0.55)
      .setTint(color)
      .setAlpha(0.65)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(11);
    this.scene.tweens.add({
      targets: mote,
      alpha: 0,
      scale: 0.1,
      duration: 180,
      onComplete: () => mote.destroy(),
    });
  }

  /** Directional hit sparks + bright impact star flare + X-cross crit flash */
  spawnHitImpact(x: number, y: number, angle: number, color: number, isCrit: boolean) {
    const flare = this.scene.add
      .image(x, y, 'tex_star_flare')
      .setRotation(angle)
      .setScale(isCrit ? 1.15 : 0.68)
      .setTint(isCrit ? 0xffd54f : color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19);
    this.scene.tweens.add({
      targets: flare,
      alpha: 0,
      scale: isCrit ? 1.55 : 0.95,
      duration: isCrit ? 190 : 120,
      onComplete: () => flare.destroy(),
    });

    if (!this.allowFullHeavyBurst(5, 45)) {
      return;
    }

    const sparkCount = isCrit ? 11 : 6;
    for (let i = 0; i < sparkCount; i++) {
      const ang = angle + Phaser.Math.FloatBetween(-0.75, 0.75);
      const dist = Phaser.Math.Between(isCrit ? 48 : 30, isCrit ? 98 : 66);
      const streak = this.scene.add
        .image(x, y, 'tex_hit_streak')
        .setRotation(ang)
        .setScale(isCrit ? 1.0 : 0.72, isCrit ? 0.75 : 0.55)
        .setTint(i % 2 === 0 ? 0xffffff : isCrit ? 0xffd54f : color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(18);
      this.scene.tweens.add({
        targets: streak,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        scaleX: 0.15,
        alpha: 0,
        duration: Phaser.Math.Between(140, 230),
        ease: 'Cubic.easeOut',
        onComplete: () => streak.destroy(),
      });
    }

    if (isCrit) {
      for (const rot of [Math.PI / 4, -Math.PI / 4]) {
        const beam = this.scene.add
          .image(x, y, 'tex_star_flare')
          .setRotation(rot)
          .setScale(1.45, 0.34)
          .setTint(0xffd54f)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(20);
        this.scene.tweens.add({
          targets: beam,
          scaleX: 1.9,
          scaleY: 0.08,
          alpha: 0,
          duration: 210,
          onComplete: () => beam.destroy(),
        });
      }
      this.spawnShockwave(x, y, 56, 0xffd54f, 190);
    }
  }

  /** Sword Special Ground Slam */
  spawnGroundSlam(x: number, y: number, radius: number, color: number) {
    this.spawnGroundCrack(x, y, color, radius / 95, 950);
    this.spawnShockwave(x, y, radius, color, 280);
    this.spawnShockwave(x, y, radius * 0.65, 0xffffff, 210);

    const exp = this.scene.add
      .sprite(x, y - 10, 'fx_explosion1')
      .setScale(radius / 95)
      .setTint(color)
      .setAlpha(0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17);
    exp.play('fx_exp1_anim');
    exp.once('animationcomplete', () => exp.destroy());

    this.spawnRadialSparks(x, y, color, 12, radius * 0.55, radius * 1.05);
  }

  // =========================================================================
  // Pillar 3: "Divine Descent" Boon Acquisition Ceremony
  // =========================================================================
  spawnDivineDescent(x: number, y: number, god: GodId, rarity: Rarity = 'rare') {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS[god];
    const col = rarity === 'epic' ? epicSub : primary;
    sfx.playDivineDescent();

    // Towering Sky-to-Earth Light Column
    const colG = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(21);
    colG.fillStyle(primary, 0.24);
    colG.fillRect(x - 36 * rScale, y - 450, 72 * rScale, 460);
    colG.fillStyle(col, 0.38);
    colG.fillRect(x - 18 * rScale, y - 450, 36 * rScale, 460);
    colG.fillStyle(0xffffff, 0.65);
    colG.fillRect(x - 7, y - 450, 14, 460);
    this.scene.tweens.add({
      targets: colG,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => colG.destroy(),
    });

    // Giant Expanding Spinning Mandala Seal on the Floor
    const mandala = this.scene.add
      .image(x, y + 8, 'tex_magic_circle')
      .setScale(0.25)
      .setTint(primary)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.scene.tweens.add({
      targets: mandala,
      scale: 1.35 * rScale,
      angle: 130,
      alpha: 0,
      duration: 920,
      ease: 'Cubic.easeOut',
      onComplete: () => mandala.destroy(),
    });

    const aura = this.scene.add
      .sprite(x, y - 8, 'fx_heal')
      .setScale(1.15 * rScale)
      .setTint(primary)
      .setAlpha(0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(18);
    aura.play('fx_aura_anim');
    aura.once('animationcomplete', () => aura.destroy());

    // God-specific ring flourish around player
    if (god === 'zeus') {
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 + Math.PI / 4;
        this.spawnSkyThunder(x + Math.cos(a) * 85, y + Math.sin(a) * 65, rarity);
      }
    } else if (god === 'ares') {
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 + Math.PI / 4;
        this.spawnGreatswordDropOnly(x + Math.cos(a) * 82, y + Math.sin(a) * 60, rarity, i * 45);
      }
    } else if (god === 'demeter') {
      this.spawnIceShatter(x, y, rarity);
    } else {
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4;
        this.spawnSingleVoidRift(x + Math.cos(a) * 70, y + Math.sin(a) * 55, a + Math.PI / 3, rarity);
      }
    }
  }

  // =========================================================================
  // Pillar 1 & 4: Zeus Multi-Flicker Chain Web & Lock-On Reticle Sky Thunder
  // =========================================================================
  private drawJaggedBolt(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, primary: number, subColor: number, isEpic: boolean) {
    g.clear();
    const pts: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
    const segs = 7;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const jit = Phaser.Math.FloatBetween(-22, 22);
      pts.push({ x: x1 + dx * t + nx * jit, y: y1 + dy * t + ny * jit });
    }
    pts.push({ x: x2, y: y2 });

    const strokePts = (w: number, col: number, a: number, pList = pts) => {
      g.lineStyle(w, col, a);
      g.beginPath();
      g.moveTo(pList[0].x, pList[0].y);
      for (let i = 1; i < pList.length; i++) g.lineTo(pList[i].x, pList[i].y);
      g.strokePath();
    };

    strokePts(isEpic ? 12 : 9, isEpic ? subColor : primary, 0.25);
    strokePts(isEpic ? 5.5 : 4.2, primary, 0.85);
    strokePts(2, 0xffffff, 1.0);

    // Secondary braided lightning filament
    const pts2 = pts.map((p, idx) =>
      idx === 0 || idx === pts.length - 1
        ? p
        : { x: p.x + Phaser.Math.FloatBetween(-14, 14), y: p.y + Phaser.Math.FloatBetween(-14, 14) }
    );
    strokePts(2.2, isEpic ? subColor : 0x80deea, 0.72, pts2);
  }

  spawnLightningBolt(x1: number, y1: number, x2: number, y2: number, rarity: Rarity = 'common') {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS.zeus;
    const isEpic = rarity === 'epic';
    const g = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(20);

    // Flicker/re-draw 3 times over 220ms for live crackling electricity!
    this.drawJaggedBolt(g, x1, y1, x2, y2, primary, epicSub, isEpic);
    this.scene.time.delayedCall(65, () => {
      if (g.active) this.drawJaggedBolt(g, x1, y1, x2, y2, primary, epicSub, isEpic);
    });
    this.scene.time.delayedCall(135, () => {
      if (g.active) this.drawJaggedBolt(g, x1, y1, x2, y2, primary, epicSub, isEpic);
    });
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      delay: 140,
      duration: 180,
      onComplete: () => g.destroy(),
    });

    // Residual static sparks crackling at target
    const flare = this.scene.add
      .image(x2, y2, 'tex_star_flare')
      .setScale(0.78 * rScale)
      .setTint(isEpic ? epicSub : primary)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(20);
    this.scene.tweens.add({
      targets: flare,
      alpha: 0,
      scale: 1.25 * rScale,
      duration: 210,
      onComplete: () => flare.destroy(),
    });
  }

  spawnSkyThunder(x: number, y: number, rarity: Rarity = 'common') {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS.zeus;
    const isEpic = rarity === 'epic';
    const tint = isEpic ? epicSub : primary;

    if (!this.allowFullHeavyBurst(3, 65)) {
      this.spawnLightningBolt(x, y - 340, x, y, rarity);
      this.spawnShockwave(x, y, 72 * rScale, primary, 210);
      return;
    }

    // 1. Flash Lock-on Target Reticle briefly before strike!
    const ret = this.scene.add
      .image(x, y + 6, 'tex_target_reticle')
      .setScale(1.1 * rScale)
      .setTint(primary)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.scene.tweens.add({
      targets: ret,
      scale: 0.45,
      angle: 90,
      alpha: 0,
      duration: 240,
      onComplete: () => ret.destroy(),
    });

    // 2. Massive Dual-Arc Sky Lightning Pillar
    this.spawnLightningBolt(x + Phaser.Math.Between(-24, 24), y - 420, x, y, rarity);
    if (rarity !== 'common') {
      this.spawnLightningBolt(x + Phaser.Math.Between(-50, 50), y - 420, x, y, rarity);
    }

    // 3. Electric Crater & Ball-Lightning Detonation
    this.spawnGroundCrack(x, y, tint, 0.72 * rScale, 750);
    this.spawnShockwave(x, y, 82 * rScale, primary, 260);
    if (isEpic) this.spawnShockwave(x, y, 108 * rScale, epicSub, 300);

    const exp = this.scene.add
      .sprite(x, y - 14, 'fx_explosion1')
      .setScale(0.68 * rScale)
      .setTint(tint)
      .setAlpha(0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(18);
    exp.play('fx_exp1_anim');
    exp.once('animationcomplete', () => exp.destroy());
  }

  // =========================================================================
  // Pillar 1 & 4: Ares Colossal Greatsword Drop & Spinning Blade Rift Vortices
  // =========================================================================
  private spawnGreatswordDropOnly(x: number, y: number, rarity: Rarity, delayMs = 0) {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS.ares;
    const tint = rarity === 'epic' ? epicSub : primary;

    if (!this.allowFullHeavyBurst(3, 70)) {
      this.spawnShockwave(x, y, 85 * rScale, primary, 200);
      return;
    }

    this.scene.time.delayedCall(delayMs, () => {
      sfx.playBladeDrop();
      const sword = this.scene.add
        .image(x, y - 240, 'tex_ares_greatsword')
        .setScale(0.78 * rScale)
        .setTint(primary)
        .setAlpha(0.95)
        .setDepth(21);

      this.scene.tweens.add({
        targets: sword,
        y: y - 42,
        duration: 85,
        ease: 'Expo.easeIn',
        onComplete: () => {
          this.spawnGroundCrack(x, y, tint, 0.78 * rScale, 800);
          this.spawnShockwave(x, y, 86 * rScale, primary, 250);
          if (rarity === 'epic') this.spawnShockwave(x, y, 114 * rScale, epicSub, 300);

          const exp = this.scene.add
            .sprite(x, y - 10, 'fx_explosion1')
            .setScale(0.76 * rScale)
            .setTint(primary)
            .setAlpha(0.8)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(19);
          exp.play('fx_exp1_anim');
          exp.once('animationcomplete', () => exp.destroy());

          this.spawnRadialSparks(x, y, tint, rarity === 'epic' ? 16 : 11, 45, 110 * rScale);

          // Hold embedded sword briefly and dissolve
          this.scene.tweens.add({
            targets: sword,
            alpha: 0,
            delay: 230,
            duration: 210,
            onComplete: () => sword.destroy(),
          });
        },
      });
    });
  }

  spawnDoomDetonation(x: number, y: number, rarity: Rarity = 'common') {
    this.spawnGreatswordDropOnly(x, y, rarity, 0);
  }

  /** Hades-style Spinning Crimson Blade Rift Vortex */
  spawnBladeRift(x: number, y: number, rarity: Rarity = 'common', durationMs = 680) {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS.ares;
    const isEpic = rarity === 'epic';
    sfx.playBladeRift();

    const rift = this.scene.add
      .image(x, y, 'tex_blade_rift')
      .setScale(0.35)
      .setTint(primary)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16);

    const inner = this.scene.add
      .image(x, y, 'tex_slash_thin')
      .setScale(0.55 * rScale)
      .setTint(isEpic ? epicSub : 0xff8a65)
      .setAlpha(0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17);

    this.scene.tweens.add({
      targets: rift,
      scale: 0.92 * rScale,
      angle: 680,
      duration: durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: rift,
          alpha: 0,
          scale: 0.3,
          duration: 160,
          onComplete: () => rift.destroy(),
        });
      },
    });
    this.scene.tweens.add({
      targets: inner,
      angle: -720,
      alpha: 0,
      duration: durationMs + 120,
      onComplete: () => inner.destroy(),
    });
    this.spawnRadialSparks(x, y, isEpic ? epicSub : primary, 10, 40, 88 * rScale);
  }

  // =========================================================================
  // Pillar 1 & 4: Demeter Erupting Ice Spikes & Hex-Snowflake Mandala
  // =========================================================================
  spawnFrostNova(x: number, y: number, rarity: Rarity = 'common') {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS.demeter;
    const tint = rarity === 'epic' ? epicSub : primary;

    const snow = this.scene.add
      .image(x, y + 6, 'tex_snowflake_ring')
      .setScale(0.3)
      .setTint(primary)
      .setAlpha(0.88)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.scene.tweens.add({
      targets: snow,
      scale: 0.95 * rScale,
      angle: 75,
      alpha: 0,
      duration: 460,
      ease: 'Cubic.easeOut',
      onComplete: () => snow.destroy(),
    });

    this.spawnGroundCrack(x, y, tint, 0.72 * rScale, 680);
    this.spawnShockwave(x, y, 120 * rScale, primary, 260);
    this.spawnIceSplinters(x, y, rarity === 'epic' ? 12 : 8, 95 * rScale, tint);
  }

  private spawnIceSplinters(x: number, y: number, count: number, maxDist: number, subTint: number) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.18, 0.18);
      const dist = Phaser.Math.Between(Math.round(maxDist * 0.5), Math.round(maxDist));
      const shard = this.scene.add
        .image(x, y, 'tex_ice_shard')
        .setRotation(ang + Math.PI / 2)
        .setScale(Phaser.Math.FloatBetween(0.75, 1.25))
        .setTint(i % 2 === 0 ? subTint : 0xffffff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(19);
      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        rotation: shard.rotation + 1.5,
        alpha: 0,
        scale: 0.25,
        duration: 340,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  spawnIceShatter(x: number, y: number, rarity: Rarity = 'common') {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS.demeter;
    const isEpic = rarity === 'epic';
    const tint = isEpic ? epicSub : primary;
    sfx.playIceShatter();

    // Expanding Hex Snowflake Mandala
    const snow = this.scene.add
      .image(x, y + 8, 'tex_snowflake_ring')
      .setScale(0.35)
      .setTint(primary)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.scene.tweens.add({
      targets: snow,
      scale: 0.92 * rScale,
      angle: 60,
      alpha: 0,
      duration: 540,
      onComplete: () => snow.destroy(),
    });

    // Ring of Towering Jagged Glacial Spikes erupting from ground!
    const spikeCount = isEpic ? 8 : 6;
    for (let i = 0; i < spikeCount; i++) {
      const ang = (Math.PI * 2 * i) / spikeCount;
      const sx = x + Math.cos(ang) * 34 * rScale;
      const sy = y + Math.sin(ang) * 24 * rScale + 12;
      const spike = this.scene.add
        .image(sx, sy, 'tex_ice_spike')
        .setOrigin(0.5, 0.92)
        .setRotation(Math.cos(ang) * 0.28)
        .setScale(0.58 * rScale, 0.08)
        .setTint(i % 2 === 0 ? primary : isEpic ? epicSub : 0xe0f7fa)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(18);
      this.scene.tweens.add({
        targets: spike,
        scaleY: 0.65 * rScale,
        duration: 95,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: spike,
            alpha: 0,
            scaleX: 0.9 * rScale,
            scaleY: 0.2,
            delay: 140,
            duration: 180,
            onComplete: () => spike.destroy(),
          });
        },
      });
    }

    this.spawnGroundCrack(x, y, tint, 0.85 * rScale, 820);
    this.spawnShockwave(x, y, 108 * rScale, primary, 280);
    this.spawnIceSplinters(x, y, isEpic ? 18 : 12, 125 * rScale, tint);
  }

  // =========================================================================
  // Pillar 1 & 4: Nyx Dimensional Void-Rift Space Tears & Soul Butterflies
  // =========================================================================
  private spawnSingleVoidRift(x: number, y: number, angle: number, rarity: Rarity, scaleMult = 1) {
    const rScale = rarityScale(rarity) * scaleMult;
    const { primary, epicSub } = GOD_COLORS.nyx;
    const rift = this.scene.add
      .image(x, y, 'tex_void_rift')
      .setRotation(angle)
      .setScale(0.2 * rScale, 0.1)
      .setTint(rarity === 'epic' ? epicSub : primary)
      .setAlpha(0.92)
      .setDepth(20);
    this.scene.tweens.add({
      targets: rift,
      scaleX: 0.95 * rScale,
      scaleY: 0.72 * rScale,
      duration: 95,
      ease: 'Expo.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: rift,
          scaleY: 0.04,
          alpha: 0,
          delay: 160,
          duration: 180,
          onComplete: () => rift.destroy(),
        });
      },
    });
  }

  spawnNyxVoidCrit(x: number, y: number, angle: number, rarity: Rarity = 'common') {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS.nyx;
    sfx.playVoidSlash();

    this.spawnSingleVoidRift(x, y, angle + 0.55, rarity);
    this.spawnSingleVoidRift(x, y, angle - 0.55, rarity);
    if (rarity === 'epic') {
      this.spawnSingleVoidRift(x, y, angle, rarity, 1.15);
    }

    const crescent = this.scene.add
      .image(x, y, 'tex_slash_heavy')
      .setRotation(angle)
      .setScale(0.75 * rScale)
      .setTint(rarity === 'epic' ? epicSub : primary)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19);
    this.scene.tweens.add({
      targets: crescent,
      scale: 1.05 * rScale,
      alpha: 0,
      duration: 220,
      onComplete: () => crescent.destroy(),
    });
  }

  spawnSoulSiphon(fromX: number, fromY: number, getTarget: () => { x: number; y: number }, rarity: Rarity = 'common') {
    const rScale = rarityScale(rarity);
    const { primary, epicSub } = GOD_COLORS.nyx;
    const flyCount = rarity === 'epic' ? 5 : 3;

    const seal = this.scene.add
      .image(fromX, fromY + 6, 'tex_magic_circle')
      .setScale(0.32 * rScale)
      .setTint(primary)
      .setAlpha(0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14);
    this.scene.tweens.add({
      targets: seal,
      angle: 90,
      alpha: 0,
      scale: 0.65 * rScale,
      duration: 420,
      onComplete: () => seal.destroy(),
    });

    for (let i = 0; i < flyCount; i++) {
      const fly = this.scene.add
        .image(fromX + Phaser.Math.Between(-16, 16), fromY + Phaser.Math.Between(-16, 16), 'tex_soul_butterfly')
        .setScale(0.55 * rScale)
        .setTint(i % 2 === 0 ? primary : epicSub)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(19);

      const sx = fly.x;
      const sy = fly.y;
      const midA = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const cx = sx + Math.cos(midA) * 85;
      const cy = sy + Math.sin(midA) * 85;
      const state = { t: 0 };
      this.scene.tweens.add({
        targets: state,
        t: 1,
        delay: i * 50,
        duration: 400,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          if (!fly.active) return;
          const p = getTarget();
          const u = 1 - state.t;
          fly.x = u * u * sx + 2 * u * state.t * cx + state.t * state.t * p.x;
          fly.y = u * u * sy + 2 * u * state.t * cy + state.t * state.t * p.y;
          fly.setScale(0.55 * rScale * (0.85 + Math.sin(state.t * 28) * 0.25), 0.55 * rScale);
        },
        onComplete: () => {
          fly.destroy();
          if (i === 0) {
            const p = getTarget();
            const aura = this.scene.add
              .sprite(p.x, p.y - 6, 'fx_heal')
              .setScale(0.65 * rScale)
              .setTint(primary)
              .setAlpha(0.75)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(16);
            aura.play('fx_aura_anim');
            aura.once('animationcomplete', () => aura.destroy());
          }
        },
      });
    }
  }

  // =========================================================================
  // Pillar 2: Persistent Demigod Enchantment Aura Emitter
  // =========================================================================
  spawnHeroGodAuraParticle(x: number, y: number, god: GodId, isMoving: boolean) {
    const { primary, epicSub } = GOD_COLORS[god];
    if (god === 'zeus') {
      // Static electric arcs sparking around hero
      const g = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(13);
      const ax = x + Phaser.Math.Between(-24, 24);
      const ay = y + Phaser.Math.Between(-26, 18);
      const bx = ax + Phaser.Math.Between(-20, 20);
      const by = ay + Phaser.Math.Between(-20, 20);
      g.lineStyle(2.2, primary, 0.85);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo((ax + bx) / 2 + Phaser.Math.Between(-7, 7), (ay + by) / 2 + Phaser.Math.Between(-7, 7));
      g.lineTo(bx, by);
      g.strokePath();
      this.scene.tweens.add({ targets: g, alpha: 0, duration: 130, onComplete: () => g.destroy() });
    } else if (god === 'ares') {
      const ember = this.scene.add
        .image(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-10, 22), 'tex_spark')
        .setScale(Phaser.Math.FloatBetween(0.32, 0.6))
        .setTint(Math.random() < 0.3 ? epicSub : primary)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12);
      this.scene.tweens.add({
        targets: ember,
        y: ember.y - Phaser.Math.Between(22, 38),
        alpha: 0,
        scale: 0.1,
        duration: 340,
        onComplete: () => ember.destroy(),
      });
    } else if (god === 'demeter') {
      const shard = this.scene.add
        .image(x + Phaser.Math.Between(-24, 24), y + Phaser.Math.Between(-20, 18), 'tex_ice_shard')
        .setScale(0.32)
        .setRotation(Math.random() * Math.PI)
        .setTint(primary)
        .setAlpha(0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12);
      this.scene.tweens.add({
        targets: shard,
        y: shard.y - 16,
        alpha: 0,
        rotation: shard.rotation + 1,
        duration: 360,
        onComplete: () => shard.destroy(),
      });
      if (isMoving && Math.random() < 0.35) {
        const foot = this.scene.add
          .image(x, y + 22, 'tex_snowflake_ring')
          .setScale(0.16)
          .setTint(primary)
          .setAlpha(0.45)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(2);
        this.scene.tweens.add({ targets: foot, alpha: 0, scale: 0.24, duration: 350, onComplete: () => foot.destroy() });
      }
    } else {
      const fly = this.scene.add
        .image(x + Phaser.Math.Between(-22, 22), y + Phaser.Math.Between(-18, 18), 'tex_soul_butterfly')
        .setScale(0.32)
        .setTint(Math.random() < 0.35 ? epicSub : primary)
        .setAlpha(0.72)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12);
      this.scene.tweens.add({
        targets: fly,
        y: fly.y - 22,
        x: fly.x + Phaser.Math.Between(-14, 14),
        alpha: 0,
        duration: 420,
        onComplete: () => fly.destroy(),
      });
    }
  }

  // =========================================================================
  // Pillar 5: 4 Distinct Full-Screen God Call Ultimates
  // =========================================================================
  spawnUltimateGodCall(
    god: GodId,
    px: number,
    py: number,
    arenaW: number,
    arenaH: number,
    enemyCoords: Array<{ x: number; y: number }>
  ) {
    const { primary, epicSub } = GOD_COLORS[god];
    const seal = this.scene.add
      .image(px, py + 8, 'tex_magic_circle')
      .setScale(0.4)
      .setTint(primary)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.scene.tweens.add({
      targets: seal,
      scale: 2.3,
      angle: 180,
      alpha: 0,
      duration: 1050,
      onComplete: () => seal.destroy(),
    });

    if (god === 'zeus') {
      // ⚡ 万雷天牢: 10 staggered Sky Thunder pillars across arena & enemies
      for (let i = 0; i < 10; i++) {
        this.scene.time.delayedCall(i * 65, () => {
          const t = enemyCoords[i % Math.max(1, enemyCoords.length)];
          const tx = t ? t.x + Phaser.Math.Between(-45, 45) : Phaser.Math.Between(140, arenaW - 140);
          const ty = t ? t.y + Phaser.Math.Between(-35, 35) : Phaser.Math.Between(160, arenaH - 120);
          sfx.playThunder();
          this.spawnSkyThunder(tx, ty, 'epic');
          if (i > 0) this.spawnLightningBolt(px, py, tx, ty, 'epic');
        });
      }
    } else if (god === 'ares') {
      // 🔥 血战剑域: 5 spiraling Blade Rifts + 6 colossal Greatswords dropping across screen
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5;
        this.spawnBladeRift(px + Math.cos(a) * 145, py + Math.sin(a) * 105, 'epic', 920);
      }
      for (let i = 0; i < 6; i++) {
        const t = enemyCoords[i % Math.max(1, enemyCoords.length)];
        const tx = t ? t.x + Phaser.Math.Between(-40, 40) : px + Math.cos((Math.PI * 2 * i) / 6) * 190;
        const ty = t ? t.y + Phaser.Math.Between(-30, 30) : py + Math.sin((Math.PI * 2 * i) / 6) * 130;
        this.spawnGreatswordDropOnly(tx, ty, 'epic', i * 85);
      }
    } else if (god === 'demeter') {
      // ❄️ 永冬冰狱: Arena-wide Snowflake Seal + 7 Giant Ice Shatters sweeping outward
      const snow = this.scene.add
        .image(arenaW / 2, arenaH / 2, 'tex_snowflake_ring')
        .setScale(0.6)
        .setTint(primary)
        .setAlpha(0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(15);
      this.scene.tweens.add({
        targets: snow,
        scale: 3.5,
        angle: 90,
        alpha: 0,
        duration: 1100,
        onComplete: () => snow.destroy(),
      });
      this.spawnIceShatter(px, py, 'epic');
      for (let i = 0; i < 6; i++) {
        this.scene.time.delayedCall(90 + i * 75, () => {
          const t = enemyCoords[i % Math.max(1, enemyCoords.length)];
          const tx = t ? t.x : px + Math.cos((Math.PI * 2 * i) / 6) * 170;
          const ty = t ? t.y : py + Math.sin((Math.PI * 2 * i) / 6) * 120;
          this.spawnIceShatter(tx, ty, 'epic');
        });
      }
    } else {
      // 🩸 冥夜次元斩: 10 crisscrossing full-screen Void-Rift spatial tears + Butterfly swarm
      sfx.playVoidSlash();
      for (let i = 0; i < 10; i++) {
        this.scene.time.delayedCall(i * 45, () => {
          const t = enemyCoords[i % Math.max(1, enemyCoords.length)];
          const tx = t ? t.x + Phaser.Math.Between(-45, 45) : Phaser.Math.Between(160, arenaW - 160);
          const ty = t ? t.y + Phaser.Math.Between(-35, 35) : Phaser.Math.Between(160, arenaH - 120);
          this.spawnSingleVoidRift(tx, ty, Phaser.Math.FloatBetween(0, Math.PI), 'epic', 1.45);
          this.spawnShockwave(tx, ty, 95, i % 2 === 0 ? primary : epicSub, 240);
          if (i % 2 === 0) sfx.playVoidSlash();
        });
      }
    }
  }

  /** Enemy / Boss Death Dark-Soul Detonation */
  spawnDeathBurst(x: number, y: number, isBoss: boolean) {
    if (!isBoss && !this.allowFullHeavyBurst(4, 60)) {
      this.spawnShockwave(x, y, 42, 0xba68c8, 170);
      return;
    }
    const exp = this.scene.add
      .sprite(x, y - 8, 'fx_explosion2')
      .setScale(isBoss ? 1.55 : 0.65)
      .setTint(isBoss ? 0xff1744 : 0xba68c8)
      .setAlpha(0.85)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17);
    exp.play('fx_exp2_anim');
    exp.once('animationcomplete', () => exp.destroy());

    this.spawnRadialSparks(x, y, isBoss ? 0xff5252 : 0xffab40, isBoss ? 18 : 8, 40, isBoss ? 150 : 72);
  }

  spawnGroundCrack(x: number, y: number, color: number, scale = 0.8, duration = 750) {
    const decal = this.scene.add
      .image(x, y + 8, 'tex_ground_crack')
      .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
      .setScale(scale)
      .setTint(color)
      .setAlpha(0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    this.scene.tweens.add({
      targets: decal,
      alpha: 0,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => decal.destroy(),
    });
    return decal;
  }

  spawnShockwave(x: number, y: number, radius: number, color: number, duration = 260) {
    const ring = this.scene.add.circle(x, y, 16, color, 0.18).setStrokeStyle(4, color, 0.92).setDepth(15);
    this.scene.tweens.add({
      targets: ring,
      scale: radius / 16,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  spawnRadialSparks(x: number, y: number, color: number, count: number, minDist: number, maxDist: number) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.2, 0.2);
      const dist = Phaser.Math.Between(Math.round(minDist), Math.round(maxDist));
      const sp = this.scene.add
        .image(x, y, 'tex_hit_streak')
        .setRotation(ang)
        .setScale(0.75, 0.55)
        .setTint(i % 2 === 0 ? 0xffffff : color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(17);
      this.scene.tweens.add({
        targets: sp,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0,
        scaleX: 0.15,
        duration: Phaser.Math.Between(180, 310),
        ease: 'Cubic.easeOut',
        onComplete: () => sp.destroy(),
      });
    }
  }

  // =========================================================================
  // Phase 3 Combat Mechanic VFX: Parry, Execution & Barrel Detonation
  // =========================================================================
  spawnParrySuccess(x: number, y: number, angle: number) {
    sfx.playParryClang();
    const dome = this.scene.add
      .image(x, y, 'tex_parry_shield')
      .setScale(0.75)
      .setTint(0xffd54f)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(22);
    this.scene.tweens.add({
      targets: dome,
      scale: 1.45,
      alpha: 0,
      angle: 35,
      duration: 240,
      ease: 'Cubic.easeOut',
      onComplete: () => dome.destroy(),
    });

    const flare = this.scene.add
      .image(x + Math.cos(angle) * 26, y + Math.sin(angle) * 26, 'tex_star_flare')
      .setScale(1.45)
      .setTint(0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(23);
    this.scene.tweens.add({
      targets: flare,
      scale: 2.1,
      alpha: 0,
      duration: 210,
      onComplete: () => flare.destroy(),
    });

    this.spawnShockwave(x, y, 135, 0xffd54f, 240);
    this.spawnRadialSparks(x, y, 0xffd54f, 14, 60, 125);
  }

  spawnExecutionFinisher(x: number, y: number) {
    sfx.playExecution();
    this.spawnGroundCrack(x, y, 0xff1744, 1.05, 950);
    this.spawnShockwave(x, y, 140, 0xff1744, 300);
    this.spawnShockwave(x, y, 95, 0xffd54f, 220);

    for (const rot of [Math.PI / 4, -Math.PI / 4]) {
      const slash = this.scene.add
        .image(x, y, 'tex_slash_heavy')
        .setRotation(rot)
        .setScale(1.2)
        .setTint(0xff1744)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(23);
      this.scene.tweens.add({
        targets: slash,
        scale: 1.55,
        alpha: 0,
        duration: 250,
        onComplete: () => slash.destroy(),
      });
    }

    const exp = this.scene.add
      .sprite(x, y - 10, 'fx_explosion2')
      .setScale(1.1)
      .setTint(0xffd54f)
      .setAlpha(0.88)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(21);
    exp.play('fx_exp2_anim');
    exp.once('animationcomplete', () => exp.destroy());

    this.spawnRadialSparks(x, y, 0xffd54f, 16, 65, 145);
  }

  spawnBarrelExplosion(x: number, y: number) {
    sfx.playExplosion();
    this.spawnGroundCrack(x, y, 0xff5252, 1.15, 1000);
    this.spawnShockwave(x, y, 160, 0xff5252, 300);
    this.spawnShockwave(x, y, 110, 0xffca28, 220);

    const exp = this.scene.add
      .sprite(x, y - 14, 'fx_explosion1')
      .setScale(1.35)
      .setTint(0xff7043)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(20);
    exp.play('fx_exp1_anim');
    exp.once('animationcomplete', () => exp.destroy());

    this.spawnRadialSparks(x, y, 0xffab40, 18, 75, 165);
  }

  /** Sword Charged Iaijutsu Dash Beam */
  spawnIaijutsuDash(x1: number, y1: number, x2: number, y2: number, color: number, isPerfect: boolean) {
    sfx.playChargeRelease();
    const g = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(22);
    g.lineStyle(isPerfect ? 24 : 16, color, 0.42);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(isPerfect ? 8 : 5, 0xffffff, 0.96);
    g.lineBetween(x1, y1, x2, y2);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });

    const ang = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    this.spawnGroundCrack(x2, y2, color, isPerfect ? 1.05 : 0.8, 800);
    const flare = this.scene.add
      .image(midX, midY, 'tex_star_flare')
      .setRotation(ang)
      .setScale(isPerfect ? 2.1 : 1.5, 0.7)
      .setTint(isPerfect ? 0xffd54f : color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(23);
    this.scene.tweens.add({ targets: flare, alpha: 0, scaleX: 2.8, duration: 220, onComplete: () => flare.destroy() });
  }

  /** Bow Perfect Power-Shot Sonic Boom */
  spawnPowerShotFlash(x: number, y: number, angle: number, isPerfect: boolean) {
    sfx.playChargeRelease();
    const col = isPerfect ? 0xffd54f : 0x4dd0e1;
    this.spawnBowRelease(x, y, angle, col, true);
    for (let i = 0; i < 2; i++) {
      const rx = x + Math.cos(angle) * (24 + i * 24);
      const ry = y + Math.sin(angle) * (24 + i * 24);
      const ring = this.scene.add.ellipse(rx, ry, 14, 42, col, 0.25).setStrokeStyle(3, col, 0.95).setRotation(angle).setDepth(18);
      this.scene.tweens.add({ targets: ring, scaleX: 1.8, scaleY: 1.6, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
    }
  }

  /** Elite Super-Armor Shatter Burst */
  spawnArmorShatter(x: number, y: number) {
    sfx.playArmorBreak();
    this.spawnShockwave(x, y, 105, 0x4dd0e1, 260);
    this.spawnIceShatter(x, y, 'rare');
  }

  /** Phantom Dodge & High Style-Rank Afterimage */
  spawnPhantomAfterimage(
    x: number,
    y: number,
    textureKey: string,
    frameKey: string | number | undefined,
    flipX: boolean,
    scale: number,
    tint = 0x80deea
  ) {
    const ghost = this.scene.add
      .image(x, y, textureKey, frameKey)
      .setFlipX(flipX)
      .setScale(scale)
      .setTint(tint)
      .setAlpha(0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: scale * 1.08,
      duration: 240,
      ease: 'Cubic.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }
}
