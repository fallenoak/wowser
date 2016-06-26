import WorkerPool from '../../../worker/pool';
import WMOGroupBlueprint from '../blueprint';

class WMOGroupLoader {

  static cache = new Map();

  static refCounts = new Map();
  static pendingUnload = new Set();
  static unloaderRunning = false;

  static UNLOAD_INTERVAL = 15000;

  static load(root, index, rawPath) {
    const path = rawPath.toUpperCase();

    // Prevent unintended unloading.
    if (this.pendingUnload.has(path)) {
      this.pendingUnload.delete(path);
    }

    // Background unloader might need to be started.
    if (!this.unloaderRunning) {
      this.unloaderRunning = true;
      this.backgroundUnload();
    }

    // Keep track of references.
    const refCount = (this.refCounts.get(path) || 0) + 1;
    this.refCounts.set(path, refCount);

    if (!this.cache.has(path)) {
      const worker = WorkerPool.enqueue('WMOGroup', path, index, root.blueprint.header);

      const promise = worker.then((def) => {
        return new WMOGroupBlueprint(root.blueprint, def);
      });

      this.cache.set(path, promise);
    }

    return this.cache.get(path).then((blueprint) => {
      return blueprint.create();
    });
  }

  static loadByIndex(root, index) {
    const suffix = `000${index}`.slice(-3);
    const path = root.blueprint.path.replace(/\.wmo/i, `_${suffix}.wmo`);

    return this.load(root, index, path);
  }

  static unload(group) {
    const path = group.blueprint.path.toUpperCase();

    const refCount = (this.refCounts.get(path) || 1) - 1;

    if (refCount <= 0) {
      this.pendingUnload.add(path);
    } else {
      this.refCounts.set(path, refCount);
    }
  }

  static backgroundUnload() {
    for (const path in this.pendingUnload) {
      if (this.cache.has(path)) {
        this.cache.get(path).then((blueprint) => {
          blueprint.dispose();
        });
      }

      this.cache.delete(path);
      this.refCounts.delete(path);
      this.pendingUnload.delete(path);
    }

    setTimeout(this.backgroundUnload.bind(this), this.UNLOAD_INTERVAL);
  }

}

export default WMOGroupLoader;
