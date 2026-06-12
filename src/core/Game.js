import { SceneManager }          from './SceneManager.js';
import { InputManager }          from './InputManager.js';
import { BootScene }             from '../scenes/BootScene.js';
import { MenuScene }             from '../scenes/MenuScene.js';
import { JurassicBaseScene }     from '../scenes/JurassicBaseScene.js';
import { LevelPreparationScene } from '../scenes/LevelPreparationScene.js';
import { LevelScene }            from '../scenes/LevelScene.js';
import { ResultScene }           from '../scenes/ResultScene.js';
import { DinoCollectionScene }   from '../scenes/DinoCollectionScene.js';
import { SCENES }                from '../utils/constants.js';

export class Game {
  constructor() {
    this.container    = document.getElementById('game-canvas');
    this.sceneManager = new SceneManager(this.container);
    this.inputManager = new InputManager();
    this._registerScenes();
  }

  _registerScenes() {
    this.sceneManager.register(
      SCENES.BOOT,
      new BootScene(this.container, () => this._show(SCENES.MENU))
    );
    this.sceneManager.register(
      SCENES.MENU,
      new MenuScene(this.container, () => this._show(SCENES.JURASSIC_BASE))
    );
    this.sceneManager.register(
      SCENES.JURASSIC_BASE,
      new JurassicBaseScene(
        this.container,
        () => this._show(SCENES.LEVEL_PREP),
        () => this._show(SCENES.MENU),
        () => this._show(SCENES.DINO_PARK)
      )
    );
    this.sceneManager.register(
      SCENES.DINO_PARK,
      new DinoCollectionScene(
        this.container,
        () => this._show(SCENES.JURASSIC_BASE)
      )
    );
    this.sceneManager.register(
      SCENES.LEVEL_PREP,
      new LevelPreparationScene(
        this.container,
        () => this._show(SCENES.LEVEL),
        () => this._show(SCENES.JURASSIC_BASE)
      )
    );
    this.sceneManager.register(
      SCENES.LEVEL,
      new LevelScene(
        this.container,
        () => this._show(SCENES.JURASSIC_BASE),
        () => this._show(SCENES.DINO_PARK)
      )
    );
    this.sceneManager.register(
      SCENES.RESULT,
      new ResultScene(this.container, () => this._show(SCENES.MENU))
    );
  }

  _show(sceneName) {
    this.sceneManager.show(sceneName);
  }

  start() {
    this._show(SCENES.MENU);
  }
}
