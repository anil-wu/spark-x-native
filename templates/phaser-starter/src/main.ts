import Phaser from 'phaser'

class GameScene extends Phaser.Scene {
  constructor() {
    super('game-scene')
  }

  preload() {
    // this.load.image('sky', 'assets/sky.png');
  }

  create() {
    this.add.text(100, 100, 'Hello Phaser!', { color: '#0f0' })
  }

  update() {
  }
}

const DESIGN_WIDTH = 800
const DESIGN_HEIGHT = 600

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 200 }
    }
  },
  scene: [GameScene]
}

const game = new Phaser.Game(config)

const container = document.getElementById('game-container')
if (container) {
  const refresh = () => game.scale.refresh()

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(refresh).observe(container)
  }

  window.addEventListener('resize', refresh)
  window.addEventListener('orientationchange', refresh)
}

export default game
