import THREE from 'three';

class LightManager {

  constructor(world) {
    this.world = world;
    this.scene = world.scene;

    // "Invisible" fog (due to extremely high near and far values)
    this.scene.fog = new THREE.Fog(0x000000, 10000000, 10000000);
  }

  updateFog(newColor, newNear, newFar) {
    this.scene.fog.color = new THREE.Color(newColor);
    this.scene.fog.near = newNear;
    this.scene.fog.far = newFar;
  }

}

export default LightManager;
