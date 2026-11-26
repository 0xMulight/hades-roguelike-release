import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/BootScene';
import { DungeonScene } from './game/DungeonScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#06040b',
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, DungeonScene],
};

new Phaser.Game(config);
