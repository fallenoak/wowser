import EventEmitter from 'events';
import THREE from 'three';

class WorldRenderer extends EventEmitter {

  constructor(world) {
    super();

    this.world = world;

    this.camera = new THREE.PerspectiveCamera(60, 1.33, 1, 4000);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(15, 0, 7);

    this.camera.previousRotation = null;
    this.camera.previousPosition = null;
    this.camera.moved = false;

    this.renderer = null;

    this.render = ::this.render;

    this.scenes = {
      daynight: new THREE.Scene(),
      skybox: new THREE.Scene(),
      map: new THREE.Scene()
    };

    for (const scene in this.scenes) {
      this.scenes[scene].matrixAutoUpdate = false;
    }

    this.frameID = null;
  }

  start(canvas, width, height) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      canvas: canvas,
      antialias: true
    });

    this.setClearColor(new THREE.Color(0.1, 0.2, 0.3));

    this.renderer.autoClear = false;

    this.resize(width, height);

    this.render();
  }

  stop() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.frameID) {
      this.renderer.frameID = null;
      cancelAnimationFrame(this.frameID);
    }
  }

  setClearColor(color) {
    this.renderer.setClearColor(color);
  }

  get aspectRatio() {
    return this.width / this.height;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    if (this.renderer) {
      this.renderer.setSize(this.width, this.height);
    }

    this.camera.aspect = this.aspectRatio;
    this.camera.updateProjectionMatrix();
  }

  render() {
    if (!this.renderer) {
      return;
    }

    this.camera.moved = this.camera.previousPosition === null ||
      this.camera.previousRotation === null ||
      !this.camera.previousPosition.equals(this.camera.position) ||
      !this.camera.previousRotation.equals(this.camera.quaternion);

    this.world.animate(this.world.clock.getDelta(), this.camera);

    this.camera.previousPosition = this.camera.position.clone();
    this.camera.previousRotation = this.camera.quaternion.clone();

    this.renderer.clear();
    this.renderer.render(this.scenes.map, this.camera);

    this.frameID = requestAnimationFrame(this.render);

    this.emit('render');
  }

  get info() {
    return this.renderer ? this.renderer.info : null;
  }

}

export default WorldRenderer;
