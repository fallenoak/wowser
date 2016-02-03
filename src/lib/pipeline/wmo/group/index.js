import THREE from 'three';

import M2Blueprint from '../../m2/blueprint';
import WorkerPool from '../../worker/pool';

class WMOGroup extends THREE.Mesh {

  static cache = {};

  constructor(data) {
    super();

    this.matrixAutoUpdate = false;

    this.data = data;

    this.indoor = data.indoor;

    this.doodads = new Set();

    const vertexCount = data.MOVT.vertices.length;
    const textureCoords = data.MOTV.textureCoords;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 3);
    const alphas = new Float32Array(vertexCount);

    data.MOVT.vertices.forEach(function(vertex, index) {
      // Provided as (X, Z, -Y)
      positions[index * 3] = vertex[0];
      positions[index * 3 + 1] = vertex[2];
      positions[index * 3 + 2] = -vertex[1];

      uvs[index * 2] = textureCoords[index][0];
      uvs[index * 2 + 1] = textureCoords[index][1];
    });

    data.MONR.normals.forEach(function(normal, index) {
      normals[index * 3] = normal[0];
      normals[index * 3 + 1] = normal[2];
      normals[index * 3 + 2] = -normal[1];
    });

    if ('MOCV' in data) {
      data.MOCV.colors.forEach(function(color, index) {
        colors[index * 3] = color.r / 255.0;
        colors[index * 3 + 1] = color.g / 255.0;
        colors[index * 3 + 2] = color.b / 255.0;
        alphas[index] = color.a / 255.0;
      });
    } else if (this.indoor) {
      // Default indoor vertex color: rgba(0.5, 0.5, 0.5, 1.0)
      data.MOVT.vertices.forEach(function(vertex, index) {
        colors[index * 3] = 127.0 / 255.0;
        colors[index * 3 + 1] = 127.0 / 255.0;
        colors[index * 3 + 2] = 127.0 / 255.0;
        alphas[index] = 1.0;
      });
    }

    const indices = new Uint32Array(data.MOVI.triangles);

    const geometry = this.geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // TODO: Perhaps it is possible to directly use a vec4 here? Currently, color + alpha is
    // combined into a vec4 in the material's vertex shader. For some reason, attempting to
    // directly use a BufferAttribute with a length of 4 resulted in incorrect ordering for the
    // values in the shader.
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.addAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // Mirror geometry over X and Y axes and rotate
    const matrix = new THREE.Matrix4();
    matrix.makeScale(-1, -1, 1);
    geometry.applyMatrix(matrix);
    geometry.rotateX(-Math.PI / 2);

    const materialIDs = [];

    data.MOBA.batches.forEach(function(batch) {
      materialIDs.push(batch.materialID);
      geometry.addGroup(batch.firstIndex, batch.indexCount, batch.materialID);
    });

    this.materialIDs = materialIDs;
  }

  loadDoodad(entry) {
    ++this.parent.loadedDoodadCount;

    M2Blueprint.load(entry.filename).then((m2) => {
      m2.position.set(
        -entry.position.x,
        -entry.position.y,
        entry.position.z
      );

      // Adjust M2 rotation to match Wowser's axes.
      const quat = m2.quaternion;
      quat.set(entry.rotation.x, entry.rotation.y, -entry.rotation.z, -entry.rotation.w);

      const scale = entry.scale;
      m2.scale.set(scale, scale, scale);

      this.add(m2);
      m2.updateMatrix();

      this.doodads.add(m2);
    });
  }

  unloadDoodads() {
    this.doodads.forEach((m2) => {
      M2Blueprint.unload(m2);
      this.doodads.delete(m2);
    });
  }

  clone() {
    return new this.constructor(this.data);
  }

  static loadWithID(path, id) {
    const suffix = `000${id}`.slice(-3);
    const group = path.replace(/\.wmo/i, `_${suffix}.wmo`);
    return this.load(group);
  }

  static load(path) {
    if (!(path in this.cache)) {
      this.cache[path] = WorkerPool.enqueue('WMOGroup', path).then((args) => {
        const [data] = args;
        return new this(data);
      });
    }
    return this.cache[path].then((wmoGroup) => {
      return wmoGroup.clone();
    });
  }

}

export default WMOGroup;
