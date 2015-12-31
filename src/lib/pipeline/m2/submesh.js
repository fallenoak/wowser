import THREE from 'three';

import Material from '../material';

class Submesh extends THREE.SkinnedMesh {

  constructor(id, geometry, textureUnits, isBillboard) {
    super(geometry);

    this.index = id;

    this.skin1 = null;
    this.skin2 = null;
    this.skin3 = null;

    this.isBillboard = isBillboard;

    this.applyTextureUnits(textureUnits);
  }

  applyTextureUnits(textureUnits) {
    this.textureUnits = textureUnits;

    // If only one texture unit was provided, treat as single material. If multiple texture units
    // were provided, set up multimaterial instead. Multimaterials rely on the geometry to decide
    // which material is used for each face.
    if (textureUnits.length === 1) {
      this.material = this.createMaterial(textureUnits[0]);
    } else {
      const materials = [];

      textureUnits.forEach((textureUnit) => {
        materials.push(this.createMaterial(textureUnit));
      });

      const multiMaterial = new THREE.MultiMaterial(materials);

      this.material = multiMaterial;
    }
  }

  createMaterial(textureUnit) {
    const material = new Material({ skinning: true });

    const { texture, renderFlags } = textureUnit;

    switch (texture.type) {
      case 0:
        // Hardcoded texture
        material.texture = texture.filename;
        break;
      case 11:
        if (this.skin1) {
          material.texture = this.skin1;
        }
        break;
      case 12:
        if (this.skin2) {
          material.texture = this.skin2;
        }
        break;
      case 13:
        if (this.skin3) {
          material.texture = this.skin3;
        }
        break;
      default:
        break;
    }

    this.applyRenderFlags(material, renderFlags);

    return material;
  }

  applyRenderFlags(material, renderFlags) {
    const { flags, blendingMode } = renderFlags;

    // Flag 0x04 (no backface culling) and all billboards need double side rendering.
    if (flags & 0x04 || this.isBillboard) {
      material.side = THREE.DoubleSide;
    }

    // Flag 0x04 (no backface culling) and anything with blending mode >= 1 need to obey
    // alpha values in the material texture.
    if (flags & 0x04 || blendingMode >= 1) {
      material.transparent = true;
    }

    // Flag 0x10 (no z-buffer write)
    if (flags & 0x10) {
      material.depthWrite = false;
    }

    // Blending modes
    switch (blendingMode) {
      case 0:
        material.blending = THREE.NoBlending;
        material.blendSrc = THREE.OneFactor;
        material.blendDst = THREE.ZeroFactor;
        break;

      case 1:
        material.alphaTest = 0.5;
        material.side = THREE.DoubleSide;

        material.blendSrc = THREE.OneFactor;
        material.blendDst = THREE.ZeroFactor;
        material.blendSrcAlpha = THREE.OneFactor;
        material.blendDstAlpha = THREE.ZeroFactor;
        break;

      case 2:
        material.blendSrc = THREE.SrcAlphaFactor;
        material.blendDst = THREE.OneMinusSrcAlphaFactor;
        material.blendSrcAlpha = THREE.SrcAlphaFactor;
        material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
        break;

      case 3:
        material.blendSrc = THREE.SrcColorFactor;
        material.blendDst = THREE.DstColorFactor;
        material.blendSrcAlpha = THREE.SrcAlphaFactor;
        material.blendDstAlpha = THREE.DstAlphaFactor;
        break;

      case 4:
        material.blendSrc = THREE.SrcAlphaFactor;
        material.blendDst = THREE.OneFactor;
        material.blendSrcAlpha = THREE.SrcAlphaFactor;
        material.blendDstAlpha = THREE.OneFactor;
        break;

      case 5:
        material.blendSrc = THREE.DstColorFactor;
        material.blendDst = THREE.ZeroFactor;
        material.blendSrcAlpha = THREE.DstAlphaFactor;
        material.blendDstAlpha = THREE.ZeroFactor;
        break;

      case 6:
        material.blendSrc = THREE.DstColorFactor;
        material.blendDst = THREE.SrcColorFactor;
        material.blendSrcAlpha = THREE.DstAlphaFactor;
        material.blendDstAlpha = THREE.SrcAlphaFactor;
        break;

      default:
        break;
    }
  }

  reapplyTextureUnits() {
    this.applyTextureUnits(this.textureUnits);
  }

  set displayInfo(displayInfo) {
    const { path } = displayInfo.modelData;
    this.skin1 = `${path}${displayInfo.skin1}.blp`;
    this.skin2 = `${path}${displayInfo.skin2}.blp`;
    this.skin3 = `${path}${displayInfo.skin3}.blp`;
    this.reapplyTextureUnits();
  }

}

export default Submesh;
