export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scenes = new Map();
    this.current = null;
  }

  register(name, scene) {
    this.scenes.set(name, scene);
  }

  show(name) {
    if (this.current) {
      this.current.destroy();
    }
    const scene = this.scenes.get(name);
    if (!scene) {
      console.warn(`SceneManager: scene "${name}" not registered.`);
      return;
    }
    this.current = scene;
    this.current.create();
  }

  getCurrentName() {
    for (const [name, scene] of this.scenes) {
      if (scene === this.current) return name;
    }
    return null;
  }
}
