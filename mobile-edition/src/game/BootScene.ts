import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.setPath('/assets/');

    // Legacy item / prop / pickup sprites
    this.load.image('wpn_sword', 'items/weapon/weapon_red_gem_sword.png');
    this.load.image('wpn_bow', 'items/weapon/weapon_bow.png');
    this.load.image('wpn_arrow', 'items/weapon/weapon_arrow.png');
    this.load.image('wpn_blades', 'items/weapon/weapon_katana.png');

    for (let i = 0; i < 4; i++) {
      this.load.image(`coin_${i}`, `Entities/coins/coin_anim_f${i}.png`);
    }
    this.load.image('chest_0', 'tiles/chest/chest_full_open_anim_f0.png');
    this.load.image('chest_2', 'tiles/chest/chest_full_open_anim_f2.png');
    this.load.image('flask_red', 'items/flask/flask_big_red.png');
    this.load.image('flask_blue', 'items/flask/flask_big_blue.png');
    this.load.image('skull', 'skull.png');

    // =========================================================================
    // HD Dark-Fantasy Characters, Enemies, Boss & Environment Assets
    // =========================================================================
    // Player: Sword Form (Crimson Stygian Knight - 192x192)
    this.load.spritesheet('hero_sword_idle', 'hd/hero_sword_idle.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_sword_run', 'hd/hero_sword_run.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_sword_atk1', 'hd/hero_sword_atk1.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_sword_atk2', 'hd/hero_sword_atk2.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_sword_guard', 'hd/hero_sword_guard.png', { frameWidth: 192, frameHeight: 192 });

    // Player: Bow Form (Phantom Soul-Archer - 192x192)
    this.load.spritesheet('hero_bow_idle', 'hd/hero_bow_idle.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_bow_run', 'hd/hero_bow_run.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_bow_shoot', 'hd/hero_bow_shoot.png', { frameWidth: 192, frameHeight: 192 });
    this.load.image('hd_arrow', 'hd/hd_arrow.png');

    // Player: Twin Blades Form (Violet Night-Assassin - 192x192)
    this.load.spritesheet('hero_blades_idle', 'hd/hero_blades_idle.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_blades_run', 'hd/hero_blades_run.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_blades_atk1', 'hd/hero_blades_atk1.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('hero_blades_atk2', 'hd/hero_blades_atk2.png', { frameWidth: 192, frameHeight: 192 });

    // Enemies
    this.load.spritesheet('en_knight_idle', 'hd/en_knight_idle.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('en_knight_run', 'hd/en_knight_run.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('en_knight_atk', 'hd/en_knight_atk.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('en_dummy_idle', 'hd/en_dummy_idle.png', { frameWidth: 192, frameHeight: 192 });

    this.load.spritesheet('en_imp_sheet', 'hd/en_imp_sheet.png', { frameWidth: 192, frameHeight: 192 });

    this.load.spritesheet('en_lancer_idle', 'hd/en_lancer_idle.png', { frameWidth: 320, frameHeight: 320 });
    this.load.spritesheet('en_lancer_run', 'hd/en_lancer_run.png', { frameWidth: 320, frameHeight: 320 });
    this.load.spritesheet('en_lancer_atk', 'hd/en_lancer_atk.png', { frameWidth: 320, frameHeight: 320 });

    this.load.spritesheet('en_monk_idle', 'hd/en_monk_idle.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('en_monk_run', 'hd/en_monk_run.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('en_monk_cast', 'hd/en_monk_cast.png', { frameWidth: 192, frameHeight: 192 });

    // Boss: NightBorne (1840x400 -> 23x5 of 80x80)
    this.load.spritesheet('boss_nightborne', 'hd/boss_nightborne.png', { frameWidth: 80, frameHeight: 80 });

    // Death & Environment FX
    this.load.spritesheet('unit_dead', 'hd/unit_dead.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('env_fire', 'hd/env_fire.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('env_dust', 'hd/env_dust.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('env_rock1', 'hd/env_rock1.png');
    this.load.image('env_rock2', 'hd/env_rock2.png');
    this.load.image('env_rock3', 'hd/env_rock3.png');
    this.load.image('env_gold_stone', 'hd/env_gold_stone.png');

    // Bespoke Underworld Floor & Hero Portrait
    this.load.image('underworld_floor_tile', 'hd/underworld_floor_tile.png');
    this.load.image('hero_portrait', 'hd/hero_portrait.png');

    // Combat VFX Spritesheets
    this.load.spritesheet('fx_explosion1', 'hd/fx_explosion1.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('fx_explosion2', 'hd/fx_explosion2.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('fx_heal', 'hd/fx_heal.png', { frameWidth: 192, frameHeight: 192 });
  }

  create() {
    this.createProceduralTextures();

    const anim = (key: string, sheet: string, start: number, end: number, frameRate: number, repeat = -1) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheet, { start, end }),
        frameRate,
        repeat,
      });
    };

    // Player Animations
    anim('hero_sword_idle', 'hero_sword_idle', 0, 7, 10);
    anim('hero_sword_run', 'hero_sword_run', 0, 5, 13);
    anim('hero_sword_atk1', 'hero_sword_atk1', 0, 3, 18, 0);
    anim('hero_sword_atk2', 'hero_sword_atk2', 0, 3, 17, 0);
    anim('hero_sword_guard', 'hero_sword_guard', 0, 5, 10);

    anim('hero_bow_idle', 'hero_bow_idle', 0, 5, 10);
    anim('hero_bow_run', 'hero_bow_run', 0, 3, 12);
    anim('hero_bow_shoot', 'hero_bow_shoot', 0, 7, 22, 0);

    anim('hero_blades_idle', 'hero_blades_idle', 0, 7, 11);
    anim('hero_blades_run', 'hero_blades_run', 0, 5, 15);
    anim('hero_blades_atk1', 'hero_blades_atk1', 0, 3, 22, 0);
    anim('hero_blades_atk2', 'hero_blades_atk2', 0, 3, 22, 0);

    // Enemy Animations
    anim('en_knight_idle', 'en_knight_idle', 0, 7, 9);
    anim('en_knight_run', 'en_knight_run', 0, 5, 11);
    anim('en_knight_atk', 'en_knight_atk', 0, 3, 14, 0);
    anim('en_dummy_idle', 'en_dummy_idle', 0, 5, 8);

    anim('en_imp_idle', 'en_imp_sheet', 0, 6, 10);
    anim('en_imp_run', 'en_imp_sheet', 7, 12, 13);
    anim('en_imp_atk', 'en_imp_sheet', 14, 19, 16, 0);

    anim('en_lancer_idle', 'en_lancer_idle', 0, 11, 10);
    anim('en_lancer_run', 'en_lancer_run', 0, 5, 11);
    anim('en_lancer_atk', 'en_lancer_atk', 0, 2, 12, 0);

    anim('en_monk_idle', 'en_monk_idle', 0, 5, 9);
    anim('en_monk_run', 'en_monk_run', 0, 3, 10);
    anim('en_monk_cast', 'en_monk_cast', 0, 10, 16, 0);

    // Boss: NightBorne (23 cols x 5 rows of 80x80)
    anim('boss_nb_idle', 'boss_nightborne', 0, 8, 10);
    anim('boss_nb_run', 'boss_nightborne', 23, 28, 12);
    anim('boss_nb_atk', 'boss_nightborne', 46, 57, 16, 0);
    anim('boss_nb_hurt', 'boss_nightborne', 69, 73, 14, 0);
    anim('boss_nb_death', 'boss_nightborne', 92, 114, 15, 0);

    // Shared FX / Pickups
    anim('unit_dead_anim', 'unit_dead', 0, 13, 14, 0);
    anim('env_fire_anim', 'env_fire', 0, 7, 12, -1);
    anim('env_dust_anim', 'env_dust', 0, 7, 18, 0);
    anim('fx_exp1_anim', 'fx_explosion1', 0, 7, 20, 0);
    anim('fx_exp2_anim', 'fx_explosion2', 0, 9, 22, 0);
    anim('fx_aura_anim', 'fx_heal', 0, 10, 20, 0);

    this.anims.create({
      key: 'coin_spin',
      frames: [0, 1, 2, 3].map((i) => ({ key: `coin_${i}` })),
      frameRate: 9,
      repeat: -1,
    });

    this.scene.start('DungeonScene');
  }

  private createProceduralTextures() {
    // 1. Soft radial glow orb
    const gGlow = this.make.graphics({ x: 0, y: 0 });
    for (let r = 48; r >= 4; r -= 4) {
      gGlow.fillStyle(0xffffff, (52 - r) / 260);
      gGlow.fillCircle(48, 48, r);
    }
    gGlow.generateTexture('tex_circle_glow', 96, 96);
    gGlow.destroy();

    // 2. Crisp crescent slash arc
    const gSlash = this.make.graphics({ x: 0, y: 0 });
    for (let i = 0; i < 6; i++) {
      gSlash.lineStyle(12 - i * 1.7, 0xffffff, 0.92 - i * 0.12);
      gSlash.beginPath();
      gSlash.arc(64, 64, 48 - i * 2.5, Phaser.Math.DegToRad(-64), Phaser.Math.DegToRad(64), false);
      gSlash.strokePath();
    }
    gSlash.generateTexture('tex_slash_arc', 128, 128);
    gSlash.destroy();

    // 3. Spark particle
    const gSpark = this.make.graphics({ x: 0, y: 0 });
    gSpark.fillStyle(0xffffff, 1);
    gSpark.fillCircle(8, 8, 6);
    gSpark.generateTexture('tex_spark', 16, 16);
    gSpark.destroy();

    // 4. Soft grounded contact shadow oval
    const gShadow = this.make.graphics({ x: 0, y: 0 });
    for (let s = 5; s >= 1; s--) {
      gShadow.fillStyle(0x040208, 0.14);
      gShadow.fillEllipse(48, 22, 62 + s * 6, 22 + s * 3.5);
    }
    gShadow.generateTexture('tex_shadow_oval', 96, 44);
    gShadow.destroy();

    // 5. Ornate underworld bronze/obsidian brazier bowl
    const gBrazier = this.make.graphics({ x: 0, y: 0 });
    gBrazier.fillStyle(0x16111e, 1);
    gBrazier.fillEllipse(28, 42, 34, 14);
    gBrazier.fillStyle(0x2a2035, 1);
    gBrazier.fillRoundedRect(16, 22, 24, 18, 4);
    gBrazier.fillStyle(0x8c682b, 1);
    gBrazier.fillEllipse(28, 22, 38, 14);
    gBrazier.fillStyle(0xd4af37, 0.85);
    gBrazier.lineStyle(2, 0xd4af37, 0.85);
    gBrazier.strokeEllipse(28, 22, 38, 14);
    gBrazier.fillStyle(0x2c0d0d, 1);
    gBrazier.fillEllipse(28, 22, 28, 9);
    gBrazier.fillStyle(0xff6d00, 0.85);
    gBrazier.fillEllipse(28, 22, 18, 6);
    gBrazier.generateTexture('tex_brazier_base', 56, 56);
    gBrazier.destroy();

    // 6. HD Carved Obsidian & Gold-Trimmed Underworld Column (72x168)
    const gPillar = this.make.graphics({ x: 0, y: 0 });
    // Stepped stone plinth
    gPillar.fillStyle(0x130e1c, 1);
    gPillar.fillRoundedRect(4, 134, 64, 30, 5);
    gPillar.lineStyle(2, 0x7c6230, 0.8);
    gPillar.strokeRoundedRect(4, 134, 64, 30, 5);
    gPillar.fillStyle(0x21192e, 1);
    gPillar.fillRoundedRect(10, 124, 52, 16, 3);
    // Main fluted obsidian shaft
    gPillar.fillStyle(0x1c1528, 1);
    gPillar.fillRect(16, 30, 40, 98);
    // Left rim light & right shadow flutes
    gPillar.fillStyle(0x322745, 0.85);
    gPillar.fillRect(18, 32, 8, 94);
    gPillar.fillStyle(0x251d36, 0.9);
    gPillar.fillRect(30, 32, 7, 94);
    gPillar.fillStyle(0x0f0b17, 0.95);
    gPillar.fillRect(45, 32, 11, 94);
    // Glowing rune inlay band
    gPillar.fillStyle(0x9b722c, 0.9);
    gPillar.fillRect(14, 74, 44, 6);
    gPillar.fillStyle(0xd4af37, 0.9);
    gPillar.fillRect(28, 75, 16, 4);
    // Carved top capital
    gPillar.fillStyle(0x281f38, 1);
    gPillar.fillRoundedRect(8, 12, 56, 20, 4);
    gPillar.fillStyle(0x3a2e50, 1);
    gPillar.fillRoundedRect(4, 4, 64, 12, 4);
    gPillar.lineStyle(2, 0xb88b3a, 0.85);
    gPillar.strokeRoundedRect(4, 4, 64, 12, 4);
    gPillar.generateTexture('tex_pillar_hd', 72, 168);
    gPillar.destroy();

    // 7. Ornate Underworld Chamber Archway (120x110)
    const gGate = this.make.graphics({ x: 0, y: 0 });
    // Outer stone pillars & arch
    gGate.fillStyle(0x171122, 1);
    gGate.fillRoundedRect(10, 18, 22, 88, 3);
    gGate.fillRoundedRect(88, 18, 22, 88, 3);
    gGate.fillStyle(0x261d36, 1);
    gGate.fillRoundedRect(4, 6, 112, 24, 6);
    gGate.lineStyle(2.5, 0xb88b3a, 0.9);
    gGate.strokeRoundedRect(4, 6, 112, 24, 6);
    gGate.strokeRoundedRect(10, 18, 22, 88, 3);
    gGate.strokeRoundedRect(88, 18, 22, 88, 3);
    // Portal doorway core (white-tinted so per-door reward tint shines through)
    gGate.fillStyle(0x0b0712, 0.96);
    gGate.fillRoundedRect(32, 28, 56, 78, { tl: 26, tr: 26, bl: 2, br: 2 });
    gGate.fillStyle(0xffffff, 0.35);
    gGate.fillRoundedRect(38, 34, 44, 70, { tl: 22, tr: 22, bl: 2, br: 2 });
    gGate.fillStyle(0xffffff, 0.65);
    gGate.fillEllipse(60, 70, 26, 48);
    // Keystone gold diamond
    gGate.fillStyle(0xffd54f, 1);
    gGate.fillPoints(
      [
        { x: 60, y: 8 },
        { x: 69, y: 18 },
        { x: 60, y: 28 },
        { x: 51, y: 18 },
      ],
      true
    );
    gGate.generateTexture('tex_gate_arch', 120, 110);
    gGate.destroy();

    // 8. Transparent Stygian Spike Trap Plates (replaces opaque 0x72 grey floor tiles)
    const drawSpikeFrame = (key: string, mode: 'idle' | 'warn' | 'active') => {
      const gs = this.make.graphics({ x: 0, y: 0 });
      // Dark bronze/obsidian floor grate rim
      gs.fillStyle(0x110c19, 0.88);
      gs.fillRoundedRect(4, 4, 40, 40, 5);
      gs.lineStyle(2, mode === 'idle' ? 0x6f572b : 0xff5252, mode === 'idle' ? 0.7 : 0.95);
      gs.strokeRoundedRect(4, 4, 40, 40, 5);

      const holes = [
        [14, 14],
        [34, 14],
        [24, 24],
        [14, 34],
        [34, 34],
      ];
      for (const [hx, hy] of holes) {
        gs.fillStyle(mode === 'idle' ? 0x06040a : 0x5c0a14, 1);
        gs.fillCircle(hx, hy, 4.5);
        if (mode === 'warn') {
          gs.fillStyle(0xff5252, 0.85);
          gs.fillCircle(hx, hy, 2.5);
        } else if (mode === 'active') {
          gs.fillStyle(0xb0bec5, 1);
          gs.fillTriangle(hx - 4, hy + 2, hx + 4, hy + 2, hx, hy - 14);
          gs.fillStyle(0xff5252, 0.95);
          gs.fillTriangle(hx - 1.5, hy + 1, hx + 1.5, hy + 1, hx, hy - 13);
        }
      }
      gs.generateTexture(key, 48, 48);
      gs.destroy();
    };
    drawSpikeFrame('spike_0', 'idle');
    drawSpikeFrame('spike_1', 'warn');
    drawSpikeFrame('spike_3', 'active');

    // 9. Carved Stone Altar Pedestal (56x40) for Hub relics & weapons
    const gPed = this.make.graphics({ x: 0, y: 0 });
    gPed.fillStyle(0x171124, 1);
    gPed.fillEllipse(28, 30, 50, 18);
    gPed.fillStyle(0x281e3a, 1);
    gPed.fillEllipse(28, 22, 44, 16);
    gPed.lineStyle(2, 0xb88b3a, 0.85);
    gPed.strokeEllipse(28, 22, 44, 16);
    gPed.generateTexture('tex_pedestal', 56, 40);
    gPed.destroy();

    // 10. Ornate Underworld Banner (36x64)
    const gBan = this.make.graphics({ x: 0, y: 0 });
    gBan.fillStyle(0x8c682b, 1);
    gBan.fillRect(2, 2, 32, 5);
    gBan.fillStyle(0x6d1221, 1);
    gBan.fillPoints(
      [
        { x: 5, y: 7 },
        { x: 31, y: 7 },
        { x: 31, y: 50 },
        { x: 18, y: 61 },
        { x: 5, y: 50 },
      ],
      true
    );
    gBan.lineStyle(1.5, 0xd4af37, 0.85);
    gBan.strokeRect(8, 11, 20, 34);
    gBan.fillStyle(0xffd54f, 0.9);
    gBan.fillCircle(18, 28, 5);
    gBan.generateTexture('tex_banner_hd', 36, 64);
    gBan.destroy();

    // =========================================================================
    // Phase 2 Commercial Combat VFX Procedural Textures
    // =========================================================================
    // 11. Tapered Hades Heavy Crescent Slash Ribbon (192x192)
    const buildTaperedSlash = (key: string, size: number, maxThick: number, maxDeg: number) => {
      const g = this.make.graphics({ x: 0, y: 0 });
      const cx = size / 2;
      const cy = size / 2;
      const rOuterBase = size * 0.43;
      const steps = 28;
      const radMax = Phaser.Math.DegToRad(maxDeg);

      // Build crescent polygon (outer arc forward, inner tapered arc backward)
      const outerPts: Array<{ x: number; y: number }> = [];
      const innerPts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = -radMax + t * radMax * 2;
        const taper = Math.pow(Math.sin(t * Math.PI), 0.72);
        const ro = rOuterBase;
        const ri = rOuterBase - maxThick * taper;
        outerPts.push({ x: cx + Math.cos(a) * ro, y: cy + Math.sin(a) * ro });
        innerPts.push({ x: cx + Math.cos(a) * ri, y: cy + Math.sin(a) * ri });
      }
      g.fillStyle(0xffffff, 0.88);
      g.fillPoints([...outerPts, ...innerPts.reverse()], true);

      // Bright razor leading-edge highlight
      g.lineStyle(2.5, 0xffffff, 1.0);
      g.beginPath();
      outerPts.forEach((p, idx) => (idx === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
      g.strokePath();

      g.generateTexture(key, size, size);
      g.destroy();
    };
    buildTaperedSlash('tex_slash_heavy', 192, 34, 74);
    buildTaperedSlash('tex_slash_thin', 160, 16, 68);

    // 12. 4-Point Diamond Impact Star Flare (96x96)
    const gFlare = this.make.graphics({ x: 0, y: 0 });
    gFlare.fillStyle(0xffffff, 0.35);
    gFlare.fillCircle(48, 48, 16);
    gFlare.fillStyle(0xffffff, 0.92);
    gFlare.fillPoints(
      [
        { x: 48, y: 2 },
        { x: 56, y: 40 },
        { x: 94, y: 48 },
        { x: 56, y: 56 },
        { x: 48, y: 94 },
        { x: 40, y: 56 },
        { x: 2, y: 48 },
        { x: 40, y: 40 },
      ],
      true
    );
    gFlare.fillStyle(0xffffff, 1.0);
    gFlare.fillCircle(48, 48, 7);
    gFlare.generateTexture('tex_star_flare', 96, 96);
    gFlare.destroy();

    // 13. Tapered Directional Velocity Hit Streak (48x12)
    const gStreak = this.make.graphics({ x: 0, y: 0 });
    gStreak.fillStyle(0xffffff, 0.95);
    gStreak.fillPoints(
      [
        { x: 2, y: 6 },
        { x: 34, y: 2 },
        { x: 46, y: 6 },
        { x: 34, y: 10 },
      ],
      true
    );
    gStreak.generateTexture('tex_hit_streak', 48, 12);
    gStreak.destroy();

    // 14. Faceted Crystalline Ice Shard (32x32)
    const gIce = this.make.graphics({ x: 0, y: 0 });
    gIce.fillStyle(0xffffff, 0.95);
    gIce.fillPoints(
      [
        { x: 16, y: 2 },
        { x: 25, y: 16 },
        { x: 16, y: 30 },
        { x: 7, y: 16 },
      ],
      true
    );
    gIce.lineStyle(1.5, 0xe0f7fa, 1);
    gIce.lineBetween(16, 4, 16, 28);
    gIce.generateTexture('tex_ice_shard', 32, 32);
    gIce.destroy();

    // 15. Organic Molten Ground Shatter Fissure Decal (180x180)
    const gCrack = this.make.graphics({ x: 0, y: 0 });
    // Soft molten crater core
    for (let cr = 46; cr >= 10; cr -= 9) {
      gCrack.fillStyle(0xffffff, (54 - cr) / 300);
      gCrack.fillCircle(90, 90, cr);
    }
    // Irregular tapered Y-branching rock fractures at non-uniform angles
    const crackAngles = [0.15, 0.92, 1.65, 2.38, 3.31, 4.18, 5.12];
    const crackLens = [74, 58, 82, 64, 78, 60, 70];
    crackAngles.forEach((baseA, idx) => {
      const len = crackLens[idx];
      let px = 90 + Math.cos(baseA) * 10;
      let py = 90 + Math.sin(baseA) * 10;
      let curA = baseA;
      const segs = 5;
      for (let s = 0; s < segs; s++) {
        const segLen = (len - 10) / segs;
        curA += ((idx + s) % 2 === 0 ? 1 : -1) * 0.14;
        const nx = px + Math.cos(curA) * segLen;
        const ny = py + Math.sin(curA) * segLen;
        gCrack.lineStyle(3.2 - s * 0.55, 0xffffff, 0.85 - s * 0.12);
        gCrack.lineBetween(px, py, nx, ny);
        if (s === 2 && idx % 2 === 0) {
          const ba = curA + (idx % 4 === 0 ? 0.52 : -0.48);
          gCrack.lineStyle(1.6, 0xffffff, 0.55);
          gCrack.lineBetween(nx, ny, nx + Math.cos(ba) * 20, ny + Math.sin(ba) * 20);
        }
        px = nx;
        py = ny;
      }
    });
    // Fragmented inner stone ring arcs
    gCrack.lineStyle(1.8, 0xffffff, 0.32);
    gCrack.beginPath();
    gCrack.arc(90, 90, 34, 0.2, 2.1, false);
    gCrack.strokePath();
    gCrack.beginPath();
    gCrack.arc(90, 90, 38, 3.0, 5.1, false);
    gCrack.strokePath();
    gCrack.generateTexture('tex_ground_crack', 180, 180);
    gCrack.destroy();

    // 16. Ares Overhead Doom Sword Sigil (64x64)
    const gDoom = this.make.graphics({ x: 0, y: 0 });
    gDoom.lineStyle(2, 0xff5252, 0.85);
    gDoom.strokeCircle(32, 26, 18);
    gDoom.fillStyle(0xff5252, 0.95);
    gDoom.fillPoints(
      [
        { x: 32, y: 6 },
        { x: 38, y: 38 },
        { x: 32, y: 58 },
        { x: 26, y: 38 },
      ],
      true
    );
    gDoom.fillStyle(0xffffff, 0.95);
    gDoom.fillRect(21, 18, 22, 4);
    gDoom.generateTexture('tex_doom_sigil', 64, 64);
    gDoom.destroy();

    // 17. Glowing Enemy Magic Orb (48x48)
    const gOrb = this.make.graphics({ x: 0, y: 0 });
    gOrb.fillStyle(0xffffff, 0.22);
    gOrb.fillCircle(24, 24, 22);
    gOrb.fillStyle(0xffffff, 0.55);
    gOrb.fillCircle(24, 24, 14);
    gOrb.fillStyle(0xffffff, 1.0);
    gOrb.fillCircle(24, 24, 8);
    gOrb.generateTexture('tex_magic_orb', 48, 48);
    gOrb.destroy();

    // =========================================================================
    // Phase 2.5 Ultimate God Boon Signature Geometry Textures
    // =========================================================================
    // 18. Double-Ring Arcane Divine Mandala (220x220)
    const gCircle = this.make.graphics({ x: 0, y: 0 });
    gCircle.lineStyle(3, 0xffffff, 0.9);
    gCircle.strokeCircle(110, 110, 96);
    gCircle.lineStyle(1.8, 0xffffff, 0.65);
    gCircle.strokeCircle(110, 110, 82);
    gCircle.strokeCircle(110, 110, 48);
    // Two overlaid squares (8-point star)
    for (const rot of [0, Math.PI / 4]) {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 4; i++) {
        const a = rot + (Math.PI / 2) * i;
        pts.push({ x: 110 + Math.cos(a) * 82, y: 110 + Math.sin(a) * 82 });
      }
      gCircle.lineStyle(2, 0xffffff, 0.72);
      gCircle.strokePoints(pts, true);
    }
    // 8 outer cardinal diamond glyphs
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const gx = 110 + Math.cos(a) * 90;
      const gy = 110 + Math.sin(a) * 90;
      gCircle.fillStyle(0xffffff, 0.95);
      gCircle.fillCircle(gx, gy, 4);
    }
    gCircle.generateTexture('tex_magic_circle', 220, 220);
    gCircle.destroy();

    // 19. Ares Colossal Guillotine Greatsword pointing downward (96x192)
    const gSword = this.make.graphics({ x: 0, y: 0 });
    // Pommel & grip
    gSword.fillStyle(0xffffff, 0.9);
    gSword.fillCircle(48, 14, 7);
    gSword.fillRect(44, 18, 8, 28);
    // Horned Spartan crossguard
    gSword.fillPoints(
      [
        { x: 14, y: 42 },
        { x: 32, y: 50 },
        { x: 64, y: 50 },
        { x: 82, y: 42 },
        { x: 74, y: 58 },
        { x: 22, y: 58 },
      ],
      true
    );
    // Wide Executioner Blade body
    gSword.fillStyle(0xffffff, 0.85);
    gSword.fillPoints(
      [
        { x: 32, y: 56 },
        { x: 64, y: 56 },
        { x: 60, y: 148 },
        { x: 48, y: 186 },
        { x: 36, y: 148 },
      ],
      true
    );
    // Razor bright center fuller ridge
    gSword.fillStyle(0xffffff, 1.0);
    gSword.fillPoints(
      [
        { x: 45, y: 60 },
        { x: 51, y: 60 },
        { x: 50, y: 178 },
        { x: 48, y: 186 },
        { x: 46, y: 178 },
      ],
      true
    );
    gSword.generateTexture('tex_ares_greatsword', 96, 192);
    gSword.destroy();

    // 20. Ares Spinning Blade Rift Vortex (144x144)
    const gRift = this.make.graphics({ x: 0, y: 0 });
    gRift.fillStyle(0x14040a, 0.9);
    gRift.fillCircle(72, 72, 26);
    gRift.lineStyle(3, 0xffffff, 0.88);
    gRift.strokeCircle(72, 72, 34);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const a2 = a + 0.55;
      const a3 = a + 0.18;
      gRift.fillStyle(0xffffff, 0.92);
      gRift.fillPoints(
        [
          { x: 72 + Math.cos(a) * 28, y: 72 + Math.sin(a) * 28 },
          { x: 72 + Math.cos(a2) * 68, y: 72 + Math.sin(a2) * 68 },
          { x: 72 + Math.cos(a3) * 44, y: 72 + Math.sin(a3) * 44 },
        ],
        true
      );
    }
    gRift.generateTexture('tex_blade_rift', 144, 144);
    gRift.destroy();

    // 21. Demeter Jagged Glacial Ice Spike (64x140)
    const gSpike = this.make.graphics({ x: 0, y: 0 });
    gSpike.fillStyle(0xffffff, 0.78);
    gSpike.fillPoints(
      [
        { x: 32, y: 6 },
        { x: 52, y: 128 },
        { x: 32, y: 136 },
        { x: 12, y: 128 },
      ],
      true
    );
    // Side crystalline prong
    gSpike.fillStyle(0xffffff, 0.65);
    gSpike.fillPoints(
      [
        { x: 14, y: 62 },
        { x: 26, y: 128 },
        { x: 6, y: 122 },
      ],
      true
    );
    gSpike.fillPoints(
      [
        { x: 50, y: 54 },
        { x: 58, y: 122 },
        { x: 38, y: 128 },
      ],
      true
    );
    // Specular ridge highlight
    gSpike.lineStyle(2.5, 0xffffff, 1.0);
    gSpike.lineBetween(32, 8, 32, 132);
    gSpike.generateTexture('tex_ice_spike', 64, 140);
    gSpike.destroy();

    // 22. Demeter 6-Point Snowflake Mandala (180x180)
    const gSnow = this.make.graphics({ x: 0, y: 0 });
    gSnow.lineStyle(2.4, 0xffffff, 0.75);
    gSnow.strokeCircle(90, 90, 62);
    gSnow.strokeCircle(90, 90, 30);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const ex = 90 + Math.cos(a) * 84;
      const ey = 90 + Math.sin(a) * 84;
      gSnow.lineStyle(3, 0xffffff, 0.92);
      gSnow.lineBetween(90, 90, ex, ey);
      // Dendritic crystal branches
      const bx = 90 + Math.cos(a) * 52;
      const by = 90 + Math.sin(a) * 52;
      gSnow.lineStyle(2, 0xffffff, 0.85);
      gSnow.lineBetween(bx, by, bx + Math.cos(a + 0.65) * 20, by + Math.sin(a + 0.65) * 20);
      gSnow.lineBetween(bx, by, bx + Math.cos(a - 0.65) * 20, by + Math.sin(a - 0.65) * 20);
    }
    gSnow.generateTexture('tex_snowflake_ring', 180, 180);
    gSnow.destroy();

    // 23. Nyx Dimensional Void-Rift Space Tear (180x64)
    const gVoid = this.make.graphics({ x: 0, y: 0 });
    // Outer white luminous tear halo
    gVoid.fillStyle(0xffffff, 0.32);
    gVoid.fillPoints(
      [
        { x: 4, y: 32 },
        { x: 90, y: 6 },
        { x: 176, y: 32 },
        { x: 90, y: 58 },
      ],
      true
    );
    gVoid.fillStyle(0xffffff, 0.85);
    gVoid.fillPoints(
      [
        { x: 12, y: 32 },
        { x: 90, y: 15 },
        { x: 168, y: 32 },
        { x: 90, y: 49 },
      ],
      true
    );
    // Dark void core slit
    gVoid.fillStyle(0x0a0214, 0.96);
    gVoid.fillPoints(
      [
        { x: 26, y: 32 },
        { x: 90, y: 23 },
        { x: 154, y: 32 },
        { x: 90, y: 41 },
      ],
      true
    );
    gVoid.generateTexture('tex_void_rift', 180, 64);
    gVoid.destroy();

    // 24. Nyx Luminous Soul Butterfly (48x48)
    const gFly = this.make.graphics({ x: 0, y: 0 });
    gFly.fillStyle(0xffffff, 0.92);
    // Left wings
    gFly.fillEllipse(15, 18, 18, 14);
    gFly.fillEllipse(17, 30, 13, 10);
    // Right wings
    gFly.fillEllipse(33, 18, 18, 14);
    gFly.fillEllipse(31, 30, 13, 10);
    // Body glow
    gFly.fillStyle(0xffffff, 1.0);
    gFly.fillEllipse(24, 24, 5, 18);
    gFly.generateTexture('tex_soul_butterfly', 48, 48);
    gFly.destroy();

    // 25. Zeus Sky-Strike Lock-On Target Reticle (96x96)
    const gRet = this.make.graphics({ x: 0, y: 0 });
    gRet.lineStyle(2.5, 0xffffff, 0.95);
    gRet.strokeCircle(48, 48, 34);
    gRet.lineStyle(1.8, 0xffffff, 0.85);
    gRet.strokePoints(
      [
        { x: 48, y: 18 },
        { x: 78, y: 48 },
        { x: 48, y: 78 },
        { x: 18, y: 48 },
      ],
      true
    );
    for (const [x1, y1, x2, y2] of [
      [48, 4, 48, 22],
      [48, 74, 48, 92],
      [4, 48, 22, 48],
      [74, 48, 92, 48],
    ]) {
      gRet.lineBetween(x1, y1, x2, y2);
    }
    gRet.generateTexture('tex_target_reticle', 96, 96);
    gRet.destroy();

    // =========================================================================
    // Phase 3 Parry, Shield, Environmental Hazard & Execution Textures
    // =========================================================================
    // 26. Aegis Octagonal Parry Shield Dome (112x112)
    const gParry = this.make.graphics({ x: 0, y: 0 });
    gParry.fillStyle(0xffd54f, 0.16);
    gParry.fillCircle(56, 56, 46);
    const oct: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
      oct.push({ x: 56 + Math.cos(a) * 48, y: 56 + Math.sin(a) * 48 });
    }
    gParry.lineStyle(3.5, 0xffffff, 0.95);
    gParry.strokePoints(oct, true);
    gParry.lineStyle(2, 0x80deea, 0.8);
    gParry.strokeCircle(56, 56, 36);
    gParry.generateTexture('tex_parry_shield', 112, 112);
    gParry.destroy();

    // 27. Phalanx Enemy Directional Front Shield Arc (64x96)
    const gFShield = this.make.graphics({ x: 0, y: 0 });
    gFShield.lineStyle(6, 0x4dd0e1, 0.88);
    gFShield.beginPath();
    gFShield.arc(20, 48, 34, Phaser.Math.DegToRad(-58), Phaser.Math.DegToRad(58), false);
    gFShield.strokePath();
    gFShield.lineStyle(2.2, 0xffffff, 0.95);
    gFShield.beginPath();
    gFShield.arc(22, 48, 36, Phaser.Math.DegToRad(-52), Phaser.Math.DegToRad(52), false);
    gFShield.strokePath();
    gFShield.generateTexture('tex_front_shield', 64, 96);
    gFShield.destroy();

    // 28. Hellfire Explosive Powder Barrel (52x60)
    const gBar = this.make.graphics({ x: 0, y: 0 });
    gBar.fillStyle(0x3e1518, 1);
    gBar.fillRoundedRect(10, 12, 32, 42, 8);
    gBar.fillStyle(0x7c1d24, 1);
    gBar.fillRoundedRect(13, 14, 26, 36, 6);
    // Iron bands
    gBar.fillStyle(0x37474f, 1);
    gBar.fillRect(10, 22, 32, 5);
    gBar.fillRect(10, 39, 32, 5);
    // Top rim & glowing hazard core
    gBar.fillStyle(0x212121, 1);
    gBar.fillEllipse(26, 13, 28, 10);
    gBar.lineStyle(2, 0xffab40, 0.9);
    gBar.strokeEllipse(26, 13, 28, 10);
    gBar.fillStyle(0xff5252, 0.95);
    gBar.fillCircle(26, 31, 6);
    gBar.fillStyle(0xffd54f, 0.95);
    gBar.fillCircle(26, 31, 3);
    gBar.generateTexture('tex_barrel', 52, 60);
    gBar.destroy();

    // 29. Obsidian Ward Totem Obelisk (56x84)
    const gTot = this.make.graphics({ x: 0, y: 0 });
    gTot.fillStyle(0x161026, 1);
    gTot.fillPoints(
      [
        { x: 28, y: 6 },
        { x: 42, y: 26 },
        { x: 46, y: 76 },
        { x: 10, y: 76 },
        { x: 14, y: 26 },
      ],
      true
    );
    gTot.lineStyle(2, 0xba68c8, 0.9);
    gTot.strokePoints(
      [
        { x: 28, y: 6 },
        { x: 42, y: 26 },
        { x: 46, y: 76 },
        { x: 10, y: 76 },
        { x: 14, y: 26 },
      ],
      true
    );
    gTot.fillStyle(0xe040fb, 0.95);
    gTot.fillCircle(28, 38, 7);
    gTot.fillStyle(0xffffff, 1);
    gTot.fillCircle(28, 38, 3);
    gTot.generateTexture('tex_totem', 56, 84);
    gTot.destroy();

    // 30. Execution Ready Crimson-Gold Crosshair Emblem (64x64)
    const gExec = this.make.graphics({ x: 0, y: 0 });
    gExec.fillStyle(0xff1744, 0.95);
    gExec.fillCircle(32, 32, 16);
    gExec.lineStyle(3, 0xffd54f, 1);
    gExec.strokeCircle(32, 32, 18);
    gExec.lineStyle(4, 0xffffff, 1);
    gExec.lineBetween(21, 21, 43, 43);
    gExec.lineBetween(43, 21, 21, 43);
    gExec.generateTexture('tex_exec_mark', 64, 64);
    gExec.destroy();
  }
}
