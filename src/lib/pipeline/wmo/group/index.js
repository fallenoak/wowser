import THREE from 'three';

import WMOMaterial from '../material';

class WMOGroup extends THREE.Mesh {

  static cache = {};

  constructor(wmo, id, data, path) {
    super();

    this.dispose = ::this.dispose;

    this.matrixAutoUpdate = false;

    //console.log(id, path, data);
    this.wmo = wmo;
    this.groupID = id;
    this.data = data;
    this.path = path;

    this.indoor = data.indoor;
    this.animated = false;

    const vertexCount = data.MOVT.vertices.length;
    const textureCoords = data.MOTV.textureCoords;

    //const triangleCount = data.MOPY.triangles.length;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 4);
    //const alphas = new Float32Array(vertexCount);
    //const rendered = new Float32Array(vertexCount);

    /*
    for (let index = 0, length = data.MOVI.triangles / 3; index < length; ++i) {
      const vindices = data.MOVI.triangles.slice(index * 3, (index * 3) + 3);

      const { flags, materialID } = data.MOPY.triangles[index];

      let vertices = [];

      for (const vindex of vindices) {
        const vertex = data.MOVT.vertices[vindex];
        const color = data.MOCV.colors[vindex];
        const uv = data.MOTV.textureCoords[vindex];


      }
    }

    data.MOVI.triangles.forEach(function(triangle, index) {
      const { flags, materialID } = data.MOPY.triangles[index / 3]
    });

    data.MOPY.triangles.forEach(function(triangle, index) {
      if (triangle.materialID === -1) {
        rendered[index] = 1.0;
      } else {
        rendered[index] = 1.0;
      }
    });
    */

    // Apply modifications to MOCV matching the logic of the FixColorVertexAlpha function in the
    // client.
    if (data.MOCV && !data.MOCV.fixed) {
      this.fixMOCVs();
    }

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
        colors[index * 4] = color.r / 255.0;
        colors[index * 4 + 1] = color.g / 255.0;
        colors[index * 4 + 2] = color.b / 255.0;
        colors[index * 4 + 3] = color.a / 255.0;
      });
    } else if (this.indoor) {
      // Default indoor vertex color: rgba(0.5, 0.5, 0.5, 1.0)
      data.MOVT.vertices.forEach(function(_vertex, index) {
        colors[index * 4] = 127.0 / 255.0;
        colors[index * 4 + 1] = 127.0 / 255.0;
        colors[index * 4 + 2] = 127.0 / 255.0;
        colors[index * 4 + 3] = 1.0;
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
    geometry.addAttribute('aColor', new THREE.BufferAttribute(colors, 4));
    //geometry.addAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    //geometry.addAttribute('rendered', new THREE.BufferAttribute(rendered, 1));

    // Mirror geometry over X and Y axes and rotate
    const matrix = new THREE.Matrix4();
    matrix.makeScale(-1, -1, 1);
    geometry.applyMatrix(matrix);
    geometry.rotateX(-Math.PI / 2);

    const materialRefs = [];

    data.MOBA.batches.forEach(function(batch, index) {
      let batchType;
      let materialIndex;

      if (index >= data.MOGP.batchOffsets.c) {
        // Batch type C
        batchType = 3;
        materialIndex = data.MOGP.batchOffsets.c + index;
        //console.log('BATCH ' + index + ' IS EXTERIOR', materialIndex);
      } else if (index >= data.MOGP.batchOffsets.b) {
        // Batch type B
        batchType = 2;
        materialIndex = data.MOGP.batchOffsets.b + index;
        //console.log('BATCH ' + index + ' IS INTERIOR', materialIndex);
      } else {
        // Batch type A
        batchType = 1;
        materialIndex = data.MOGP.batchOffsets.a + index;
        //console.log('BATCH ' + index + ' IS TRANSITION', materialIndex);
      }

      const materialRef = {
        materialID: batch.materialID,
        materialIndex: materialIndex,
        batchType: batchType
      };

      materialRefs.push(materialRef);

      geometry.addGroup(batch.firstIndex, batch.indexCount, materialIndex);
    });

    const materialDefs = this.wmo.data.MOMT.materials;
    const texturePaths = this.wmo.data.MOTX.filenames;

    this.material = this.createMultiMaterial(materialRefs, materialDefs, texturePaths);
  }

  createMultiMaterial(materialRefs, materialDefs, texturePaths) {
    const multiMaterial = new THREE.MultiMaterial();

    materialRefs.forEach((materialRef) => {
      const { materialID, materialIndex, batchType } = materialRef;

      const materialDef = Object.assign({}, materialDefs[materialID]);

      materialDef.batchType = batchType;

      if (this.indoor) {
        materialDef.indoor = true;
      } else {
        materialDef.indoor = false;
      }

      materialDef.baseAmbientLight = this.wmo.data.MOHD.baseColor;

      const material = this.createMaterial(materialDef, texturePaths);

      multiMaterial.materials[materialIndex] = material;
    });

    return multiMaterial;
  }

  createMaterial(materialDef, texturePaths) {
    const textureDefs = [];

    materialDef.textures.forEach((textureDef) => {
      const texturePath = texturePaths[textureDef.offset];

      if (texturePath !== undefined) {
        textureDef.path = texturePath;
        textureDefs.push(textureDef);
      } else {
        textureDefs.push(null);
      }
    });

    const material = new WMOMaterial(materialDef, textureDefs);

    return material;
  }


  /*
  void CMapObjGroup::FixColorVertexAlpha(CMapObjGroup *mapObjGroup)
  {
    int begin_second_fixup = 0;
    if ( mapObjGroup->unkBatchCount )
    {
      begin_second_fixup = *((unsigned __int16 *)&mapObjGroup->moba[(unsigned __int16)mapObjGroup->unkBatchCount] - 2) + 1;
    }

    if ( mapObjGroup->m_mapObj->mohd->flags & 8 )
    {
      for (int i (begin_second_fixup); i < mapObjGroup->mocv_count; ++i)
      {
        mapObjGroup->mocv[i].w = mapObjGroup->m_groupFlags << 28 >> 31;
      }
    }
    else
    {
      if ( mapObjGroup->m_mapObj->mohd->flags & 2 )
      {
        v35 = 0;
        v36 = 0;
        v37 = 0;
      }
      else
      {
        v35 = (mapObjGroup->m_mapObj->mohd.color >> 0) & 0xff;
        v37 = (mapObjGroup->m_mapObj->mohd.color >> 8) & 0xff;
        v36 = (mapObjGroup->m_mapObj->mohd.color >> 16) & 0xff;
      }

      for (int mocv_index (0); mocv_index < begin_second_fixup; ++mocv_index)
      {
        mapObjGroup->mocv[mocv_index].x -= v36;
        mapObjGroup->mocv[mocv_index].y -= v37;
        mapObjGroup->mocv[mocv_index].z -= v35;

        v38 = mapObjGroup->mocv[mocv_index].w / 255.0f;

        v11 = mapObjGroup->mocv[mocv_index].x - v38 * mapObjGroup->mocv[mocv_index].x;
        assert (v11 > -0.5f);
        assert (v11 < 255.5f);
        mapObjGroup->mocv[mocv_index].x = v11 / 2;
        v13 = mapObjGroup->mocv[mocv_index].y - v38 * mapObjGroup->mocv[mocv_index].y;
        assert (v13 > -0.5f);
        assert (v13 < 255.5f);
        mapObjGroup->mocv[mocv_index].y = v13 / 2;
        v14 = mapObjGroup->mocv[mocv_index].z - v38 * mapObjGroup->mocv[mocv_index].z;
        assert (v14 > -0.5f);
        assert (v14 < 255.5f);
        mapObjGroup->mocv[mocv_index++].z = v14 / 2;
      }

      for (int i (begin_second_fixup); i < mapObjGroup->mocv_count; ++i)
      {
        v19 = (mapObjGroup->mocv[i].x * mapObjGroup->mocv[i].w) >> 6 + mapObjGroup->mocv[i].x - v36;
        v20 = v19 / 2;
        if ( v19 < 0 )
        {
          v20 = 0;
        }
        v27 = -1;
        if ( v20 <= 255 )
        {
          v27 = v20;
        }
        mapObjGroup->mocv[i].x = v27;

        v30 = (mapObjGroup->mocv[i].y * mapObjGroup->mocv[i].w) >> 6 + mapObjGroup->mocv[i].y - v37;
        v31 = v30 / 2;
        if ( v30 < 0 )
        {
          v31 = 0;
        }
        v32 = -1;
        if ( v31 <= 255 )
        {
          v32 = v31;
        }
        mapObjGroup->mocv[i].y = v32;

        v33 = (mapObjGroup->mocv[i].w * mapObjGroup->mocv[i].z) >> 6 + mapObjGroup->mocv[i].z - v35;
        v34 = v33 / 2;
        if ( v33 < 0 )
        {
          v34 = 0;
        }
        v26 = -1;
        if ( v34 <= 255 )
        {
          v26 = v34;
        }
        mapObjGroup->mocv[i].z = v26;

        mapObjGroup->mocv[i].w = mapObjGroup->m_groupFlags << 28 >> 31
      }
    }
  }
  */

  dontFixMOCVs() {
    this.data.MOCV.colors.forEach((mocv) => {
      mocv.r /= 2.0;
      mocv.g /= 2.0;
      mocv.b /= 2.0;
    });

    this.data.MOCV.fixed = true;
  }

  fixMOCVs() {
    let beginSecondFixup = 0;

    if (this.data.MOGP.batchCounts.a > 0) {
      const firstInteriorBatchIndex = this.data.MOGP.batchOffsets.b;
      beginSecondFixup = this.data.MOBA.batches[firstInteriorBatchIndex - 1].lastVertex + 1;
    }

    // Flag 0x08: has outdoor batches
    if (this.wmo.data.MOHD.flags & 0x08) {
      for (let mocvIndex = beginSecondFixup; mocvIndex < this.data.MOCV.colors.length; ++mocvIndex) {
        const mocv = this.data.MOCV.colors[mocvIndex];

        if (this.data.MOGP.flags & 0x08) {
          mocv.a = 255;
        } else {
          mocv.a = 0;
        }
      }

      this.data.MOCV.fixed = true;
      return;
    }

    let v35;
    let v36;
    let v37;

    // Flag 0x02: don't subtract root ambient color in fix
    if (this.wmo.data.MOHD.flags & 0x02) {
      v35 = 0;
      v36 = 0;
      v37 = 0;
    } else {
      v35 = this.wmo.data.MOHD.baseColor.r;
      v36 = this.wmo.data.MOHD.baseColor.g;
      v37 = this.wmo.data.MOHD.baseColor.b;
    }

    for (let mocvIndex = 0; mocvIndex < beginSecondFixup; ++mocvIndex) {
      const mocv = this.data.MOCV.colors[mocvIndex];

      mocv.r -= v35;
      mocv.g -= v36;
      mocv.b -= v37;

      let v38 = mocv.a / 255.0;

      mocv.r = mocv.r - (v38 * mocv.r);
      if (mocv.r <= -0.5 || mocv.r >= 255.5) { console.log(mocv.r) };
      mocv.r /= 2.0;

      mocv.g = mocv.g - (v38 * mocv.g);
      if (mocv.g <= -0.5 || mocv.g >= 255.5) { console.log(mocv.g) };
      mocv.g /= 2.0;

      mocv.b = mocv.b - (v38 * mocv.b);
      if (mocv.b <= -0.5 || mocv.b >= 255.5) { console.log(mocv.b) };
      mocv.b /= 2.0;

      /*
      let fixR = ((0.0 - mocv.r) * v38) + mocv.r;
      if (fixR <= -0.5 || fixR >= 255.5) { console.log(fixR) };
      mocv.r = fixR / 2.0;

      let fixG = ((0.0 - mocv.g) * v38) + mocv.g;
      if (fixG <= -0.5 || fixG >= 255.5) { console.log(fixG) };
      mocv.g = fixG / 2.0;

      let fixB = ((0.0 - mocv.b) * v38) + mocv.b;
      if (fixB <= -0.5 || fixB >= 255.5) { console.log(fixB) };
      mocv.b = fixB / 2.0;
      */

      //console.log(mocv);
    }

    for (let mocvIndex = beginSecondFixup; mocvIndex < this.data.MOCV.colors.length; ++mocvIndex) {
      const mocv = this.data.MOCV.colors[mocvIndex];

      //let fixR = ((mocv.r * mocv.a) >> 6) + mocv.r - v35;
      let fixR = (mocv.r - v35) + ((mocv.r * mocv.a) >> 6);

      if (fixR / 2.0 > 255) {
        mocv.r = 255;
      } else if (fixR < 0) {
        mocv.r = 0;
      } else {
        mocv.r = fixR / 2.0;
      }

      //let fixG = ((mocv.g * mocv.a) >> 6) + mocv.g - v36;
      let fixG = (mocv.g - v36) + ((mocv.g * mocv.a) >> 6);

      if (fixG / 2.0 > 255) {
        mocv.g = 255;
      } else if (fixG < 0) {
        mocv.g = 0;
      } else {
        mocv.g = fixG / 2.0;
      }

      //let fixB = ((mocv.b * mocv.a) >> 6) + mocv.b - v37;
      let fixB = (mocv.b - v37) + ((mocv.b * mocv.a) >> 6);

      if (fixB / 2.0 > 255) {
        mocv.b = 255;
      } else if (fixB < 0) {
        mocv.b = 0;
      } else {
        mocv.b = fixB / 2.0;
      }

      //let fixA = this.data.MOGP.flags << 28 >> 31
      //mocv.a = fixA;

      // I think this is saying: exterior batches do NOT receive MOCV coloring
      let fixA;
      if (this.data.MOGP.flags & 0x08) {
        fixA = 255;
      } else {
        fixA = 0;
      }
      mocv.a = fixA;

      //console.log(mocv);
    }

    this.data.MOCV.fixed = true;
  }

  clone() {
    return new this.constructor(this.wmo, this.groupID, this.data, this.path);
  }

  dispose() {
    this.geometry.dispose();

    this.material.materials.forEach((material) => {
      material.dispose();
    });
  }

}

export default WMOGroup;
