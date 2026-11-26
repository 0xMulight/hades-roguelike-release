# ⚔️《冥界无尽录》双端独立发布源码（🔥 地狱 3× 难度版）

在线试玩（GitHub Pages，发布后可能需要一两分钟生效）：

- 入口：https://0xmulight.github.io/hades-roguelike-release/
- 电脑版：https://0xmulight.github.io/hades-roguelike-release/pc/
- 手机版：https://0xmulight.github.io/hades-roguelike-release/mobile/

仓库：https://github.com/0xMulight/hades-roguelike-release


本项目已彻底拆分为两个完全独立、零依赖纠缠的前端工程，并统一实装 **🔥 地狱 3× 难度**：

```text
hades-roguelike-release/
├── pc-edition/                  # 电脑端专用版本（纯键鼠操作、1.0 固定宽屏视野）
│   ├── src/data/difficulty.ts   # 难度配置核心模块
│   ├── src/ui/OverlayUI.ts      # 电脑端 HUD（无虚拟摇杆）
│   ├── src/game/DungeonScene.ts # 电脑端战斗逻辑 + 3× 地狱难度数值
│   └── ...
├── mobile-edition/              # 手机端专用版本（强制多点触控摇杆+五键弧、竖/横屏自适应缩放）
│   ├── src/data/difficulty.ts   # 难度配置核心模块
│   ├── src/ui/OverlayUI.ts      # 手机端虚拟手柄 + 防遮挡弹窗
│   ├── src/game/DungeonScene.ts # 手机端默认自动索敌 + 3× 地狱难度数值
│   └── ...
└── README.md
```

---

## 一、快速启动与构建

两个工程均基于 `Vite + TypeScript + Phaser 3`，各自独立运行（端口互不冲突）：

### 电脑版（`pc-edition`）
```bash
cd pc-edition
npm install
npm run dev       # 默认启动开发服务 http://localhost:5174
npm run build     # TypeScript 类型检查 + 生产构建到 dist/
npm run preview   # 预览生产包 http://localhost:4174
```

### 手机版（`mobile-edition`）
```bash
cd mobile-edition
npm install
npm run dev       # 默认启动开发服务 http://localhost:5175
npm run build     # TypeScript 类型检查 + 生产构建到 dist/
npm run preview   # 预览生产包 http://localhost:4175
```

---

## 二、🔥 地狱 3× 难度参数总览（`src/data/difficulty.ts`）

如需微调难度，只需修改各端 `src/data/difficulty.ts` 中的对应倍率后重新构建即可：

| 参数字段 | 数值 | 效果说明 |
| :--- | :---: | :--- |
| `hpMult` | **`3.0`** | 全部普通怪、精英怪、魔王基础生命值提升至 **3 倍** |
| `damageMult` | **`3.0`** | 怪物近战、远程、熔链、火药桶自伤与地刺伤害提升至 **3 倍** |
| `armorRatio` | **`0.45`** | 精英怪青色霸体护甲上限（相当于强化后总血量的 `45%`） |
| `postureMult` | **`1.65`** | 精英与魔王黄色架势条厚度提升 **1.65 倍**（鼓励用特技/冲刺绝技/振刀破防） |
| `moveSpeedMult` | **`1.25`** | 怪物追击移速提升 **25%** |
| `aiCooldownMult` | **`0.68`** | 怪物起手前摇与招式恢复间隙缩短 **32%**（最低保留 200ms~280ms 振刀窗口） |
| `projSpeedMult` | **`1.32`** | 敌方弹幕飞行速度提升 **32%** |
| `bossP1Bolts` / `bossP2Bolts` / `bossChargeBolts` | **`18` / `24` / `6`** | 第 8 层魔王弹幕密度全面升级，二阶段冲锋附带 6 向追击弹 |
| `waveMaxCount` | **`14`** | 单波刷怪上限增至 **14 只**，1~8 层第 4 层起变为双波次且保底双精英 |
| `darknessRewardMult` | **`2.0`** | 高风险高回报：击杀与通关掉落 `🔮 冥晶` 翻倍（**2×**） |
