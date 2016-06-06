import EventEmitter from 'events';
import THREE from 'three';

import M2Blueprint from '../../pipeline/m2/blueprint';
import WorldMap from './map';
import WorldRenderer from './renderer';

class WorldHandler extends EventEmitter {

  constructor(session) {
    super();
    this.session = session;
    this.player = this.session.player;

    this.clock = new THREE.Clock();

    this.renderer = new WorldRenderer(this);

    this.map = null;

    this.changeMap = ::this.changeMap;
    this.changeModel = ::this.changeModel;
    this.changePosition = ::this.changePosition;

    this.entities = new Set();
    this.add(this.player);

    this.player.on('map:change', this.changeMap);
    this.player.on('position:change', this.changePosition);
  }

  render(canvas, width, height) {
    this.renderer.start(canvas, width, height);
  }

  add(entity) {
    this.entities.add(entity);
    if (entity.view) {
      this.renderer.scenes.map.add(entity.view);
      entity.on('model:change', this.changeModel);
    }
  }

  remove(entity) {
    this.entity.delete(entity);
    if (entity.view) {
      this.renderer.scenes.map.remove(entity.view);
      entity.removeListener('model:change', this.changeModel);
    }
  }

  renderAtCoords(x, y) {
    if (!this.map) {
      return;
    }
    this.map.render(x, y);
  }

  changeMap(mapID) {
    WorldMap.load(mapID).then((map) => {
      if (this.map) {
        this.renderer.scenes.map.remove(this.map);
      }
      this.map = map;
      this.renderer.scenes.map.add(this.map);
      this.renderAtCoords(this.player.position.x, this.player.position.y);
    });
  }

  changeModel(_unit, _oldModel, _newModel) {
  }

  changePosition(player) {
    this.renderAtCoords(player.position.x, player.position.y);
  }

  animate(delta, camera, cameraMoved) {
    this.animateEntities(delta, camera, cameraMoved);

    if (this.map !== null) {
      this.map.animate(delta, camera, cameraMoved);
    }

    // Send delta updates to instanced M2 animation managers.
    M2Blueprint.animate(delta);
  }

  animateEntities(delta, camera, cameraMoved) {
    this.entities.forEach((entity) => {
      const { model } = entity;

      if (model === null || !model.animated) {
        return;
      }

      if (model.receivesAnimationUpdates && model.animations.length > 0) {
        model.animations.update(delta);
      }

      if (cameraMoved && model.billboards.length > 0) {
        model.applyBillboards(camera);
      }

      if (model.skeletonHelper) {
        model.skeletonHelper.update();
      }
    });
  }

}

export default WorldHandler;
