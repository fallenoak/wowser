import THREE from 'three';

import Material from '../material';

class Submesh extends THREE.SkinnedMesh {

  constructor(id, geometry, textureUnits, isBillboard) {
    super(geometry);

    this.skin1 = null;
    this.skin2 = null;
    this.skin3 = null;

    this.isBillboard = isBillboard;

    // TODO: Figure out why some submeshes have multiple texture units
    textureUnits.forEach((textureUnit) => {
      if (textureUnit.submeshIndex !== id) {
        return;
      }

      this.applyTextureUnit(textureUnit);
    });
  }

  applyTextureUnit(textureUnit) {
    this.material = new Material({ skinning: true });
    this.textureUnit = textureUnit;

    const { texture, renderFlags } = textureUnit;

    switch (texture.type) {
      case 0:
        // Hardcoded texture
        this.material.texture = texture.filename;
        break;
      case 11:
        if (this.skin1) {
          this.material.texture = this.skin1;
        }
        break;
      case 12:
        if (this.skin2) {
          this.material.texture = this.skin2;
        }
        break;
      case 13:
        if (this.skin3) {
          this.material.texture = this.skin3;
        }
        break;
      default:
        break;
    }

    this.applyRenderFlags(renderFlags);
  }

  applyRenderFlags(renderFlags) {
    const { flags, blendingMode } = renderFlags;

    // Flag 0x04 (no backface culling) and all billboards need double side rendering.
    if (flags & 0x04 || this.isBillboard) {
      this.material.side = THREE.DoubleSide;
    }

    // Flag 0x04 (no backface culling) and billboards with blending mode above 1 need to obey
    // alpha values in the material texture.
    if (flags & 0x04 || (this.isBillboard && blendingMode > 1)) {
      this.material.transparent = true;
    }

    if (flags & 0x10 && this.isBillboard) {
      this.material.depthWrite = false;
    }

    // Blending modes
    switch (blendingMode) {
      case 0:
        this.material.blending = THREE.NoBlending;
        this.material.blendSrc = THREE.OneFactor;
        this.material.blendDst = THREE.ZeroFactor;
        break;

      case 1:
        this.material.transparent = true;

        this.material.alphaTest = 0.5;
        this.material.side = THREE.DoubleSide;

        this.material.blendSrc = THREE.OneFactor;
        this.material.blendDst = THREE.ZeroFactor;
        this.material.blendSrcAlpha = THREE.OneFactor;
        this.material.blendDstAlpha = THREE.ZeroFactor;
        break;

      case 2:
        this.material.blendSrc = THREE.SrcAlphaFactor;
        this.material.blendDst = THREE.OneMinusSrcAlphaFactor;
        this.material.blendSrcAlpha = THREE.SrcAlphaFactor;
        this.material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
        break;

      case 3:
        this.material.blendSrc = THREE.SrcColorFactor;
        this.material.blendDst = THREE.DstColorFactor;
        this.material.blendSrcAlpha = THREE.SrcAlphaFactor;
        this.material.blendDstAlpha = THREE.DstAlphaFactor;
        break;

      case 4:
        this.material.blendSrc = THREE.SrcAlphaFactor;
        this.material.blendDst = THREE.OneFactor;
        this.material.blendSrcAlpha = THREE.SrcAlphaFactor;
        this.material.blendDstAlpha = THREE.OneFactor;
        break;

      case 5:
        this.material.blendSrc = THREE.DstColorFactor;
        this.material.blendDst = THREE.ZeroFactor;
        this.material.blendSrcAlpha = THREE.DstAlphaFactor;
        this.material.blendDstAlpha = THREE.ZeroFactor;
        break;

      case 6:
        this.material.blendSrc = THREE.DstColorFactor;
        this.material.blendDst = THREE.SrcColorFactor;
        this.material.blendSrcAlpha = THREE.DstAlphaFactor;
        this.material.blendDstAlpha = THREE.SrcAlphaFactor;
        break;

      default:
        break;
    }
  }

  reapplyTextureUnit() {
    this.applyTextureUnit(this.textureUnit);
  }

  set displayInfo(displayInfo) {
    const { path } = displayInfo.modelData;
    this.skin1 = `${path}${displayInfo.skin1}.blp`;
    this.skin2 = `${path}${displayInfo.skin2}.blp`;
    this.skin3 = `${path}${displayInfo.skin3}.blp`;
    this.reapplyTextureUnit();
  }

}

export default Submesh;
