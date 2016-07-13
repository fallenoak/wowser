import WMORootView from './view';
import WMOMaterial from '../material';
import WMOMaterialDefinition from '../material/loader/definition';

class WMORoot {

  constructor(def) {
    this.path = def.path;

    this.id = def.rootID;
    this.header = def.header;

    this.groupCount = def.groupCount;
    this.interiorGroupCount = def.interiorGroupCount;
    this.exteriorGroupCount = def.exteriorGroupCount;

    this.interiorGroupIndices = def.interiorGroupIndices;
    this.exteriorGroupIndices = def.exteriorGroupIndices;

    this.doodadSets = def.doodadSets;
    this.doodadEntries = def.doodadEntries;

    this.caches = {
      material: new Map()
    };

    this.refCounts = {
      material: new Map()
    };

    this.defs = {
      material: new Map()
    };

    this.createMaterialDefs(def.materials, def.texturePaths);
  }

  createView() {
    return new WMORootView(this);
  }

  dispose() {
    for (const material of this.caches.material.values()) {
      this.unloadMaterial(material);
    }

    this.caches = {};
    this.refCounts = {};
    this.defs = {};
  }

  // Because of the large number of reused texture paths, we create the material defs on the main
  // thread to reduce the cost of transferring the definition off of the worker thread.
  createMaterialDefs(materials, texturePaths) {
    const defs = this.defs.material;

    for (let mindex = 0, mcount = materials.length; mindex < mcount; ++mindex) {
      const data = materials[mindex];

      const { flags, blendingMode, shaderID } = data;
      const textures = [];

      for (let tindex = 0, tcount = data.textures.length; tindex < tcount; ++tindex) {
        const textureData = data.textures[tindex];
        const texturePath = texturePaths[textureData.offset];

        if (texturePath) {
          textures.push({ path: texturePath });
        }
      }

      const def = new WMOMaterialDefinition(mindex, flags, blendingMode, shaderID, textures);

      defs.set(mindex, def);
    }
  }

  loadMaterials(refs) {
    const materials = [];

    for (let rindex = 0, rcount = refs.length; rindex < rcount; ++rindex) {
      const ref = refs[rindex];
      const def = this.defs.material.get(ref.materialIndex).forRef(ref);

      const refCount = (this.refCounts.material.get(def.key) || 0) + 1;
      this.refCounts.material.set(def.key, refCount);

      let material = this.caches.material.get(def.key);

      if (!material) {
        material = new WMOMaterial(def);
        this.caches.material.set(def.key, material);
      }

      materials.push(material);
    }

    return materials;
  }

  unloadMaterial(material) {
    const refCount = (this.refCounts.material.get(material.key) || 1) - 1;

    if (refCount <= 0) {
      this.refCounts.material.delete(material.key);
      material.dispose();
    } else {
      this.refCounts.material.set(material.key, refCount);
    }
  }

  doodadSet(doodadSet) {
    const set = this.doodadSets[doodadSet];
    const { startIndex: start, doodadCount: count  } = set;

    const entries = this.doodadEntries.slice(start, start + count);

    return { start, count, entries };
  }

}

export default WMORoot;
