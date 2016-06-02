varying vec2 vUv;

varying vec4 vertexColor;
varying vec3 vertexWorldNormal;
varying float cameraDistance;

uniform int textureCount;
uniform sampler2D textures[4];
uniform int blendingMode;

uniform float lightModifier;
uniform vec3 ambientLight;
uniform vec3 diffuseLight;

uniform float fogModifier;
uniform float fogStart;
uniform float fogEnd;
uniform vec3 fogColor;

uniform int indoor;
uniform int batchType;

vec4 saturate(vec4 value) {
  vec4 result = clamp(value, 0.0, 1.0);
  return result;
}

vec3 saturate(vec3 value) {
  vec3 result = clamp(value, 0.0, 1.0);
  return result;
}

float saturate(float value) {
  float result = clamp(value, 0.0, 1.0);
  return result;
}

// Given a light direction and normal, return a directed diffuse light.
vec3 createGlobalLight(vec3 lightDirection, vec3 lightNormal, vec3 diffuseLight, vec3 ambientLight) {
  float light = dot(lightNormal, -lightDirection);

  if (light < 0.0) {
    light = 0.0;
  } else if (light > 0.5) {
    light = 0.5 + ((light - 0.5) * 0.65);
  }

  vec3 directedDiffuseLight = diffuseLight.rgb * light;

  directedDiffuseLight.rgb += ambientLight.rgb;
  directedDiffuseLight = saturate(directedDiffuseLight);

  return directedDiffuseLight;
}

vec4 applyFog(vec4 color) {
  float fogFactor = (fogEnd - cameraDistance) / (fogEnd - fogStart);
  fogFactor = 1.0 - clamp(fogFactor, 0.0, 1.0);
  float fogColorFactor = fogFactor * fogModifier;

  color.rgb = mix(color.rgb, fogColor.rgb, fogColorFactor);

  // Ensure certain blending mode pixels become fully opaque by fog end.
  if (cameraDistance >= fogEnd) {
    color.rgb = fogColor.rgb;
    color.a = 1.0;
  }

  return color;
}

vec4 applyLight(vec4 color, vec4 vertexColor, vec3 light) {
  // Transition batch
  if (batchType == 1) {
    vec3 batchLight = mix(vertexColor.rgb * 2.0, light.rgb, vertexColor.a);
    color.rgb *= batchLight.rgb;
    //color.rgb = vec3(1.0, 0.0, 0.0);
    color.a = 1.0;
    return color;

  // Interior batch
  } else if (batchType == 2) {
    // vertexColor.a = 1.0 -> add light to vertex color
    // vertexColor.a = 0.0 -> only use vertex color
    vec3 batchLight = mix(vertexColor.rgb * 2.0, light.rgb + (vertexColor.rgb * 2.0), vertexColor.a);
    color.rgb *= batchLight.rgb;
    //color.rgb = vec3(0.0, 1.0, 0.0);
    color.a = 1.0;
    return color;

  // Exterior batch
  } else {
    // No vertex color
    vec3 batchLight = light.rgb;
    color.rgb *= batchLight.rgb;
    //color.rgb = vec3(0.0, 0.0, 1.0);
    color.a = 1.0;
    return color;
  }
}

vec4 lightOutdoor(vec4 color, vec4 vertexColor, vec3 light) {
  vec3 outdoorLight = light.rgb += (vertexColor.rgb * 2.0);
  outdoorLight.rgb = saturate(outdoorLight.rgb);

  color.rgb *= outdoorLight;

  return color;
}

void main() {
  vec3 lightDirection = normalize(vec3(-1, -1, -1));
  vec3 lightNormal = normalize(vertexWorldNormal);

  vec3 globalLight = createGlobalLight(lightDirection, lightNormal, diffuseLight, ambientLight);

  // Base layer
  vec4 color = texture2D(textures[0], vUv);

  // Knock out transparent pixels in transparent blending mode (1).
  if (blendingMode == 1 && color.a < (128.0 / 255.0)) {
    discard;
  }

  // Force transparent pixels to fully opaque if in opaque blending mode (0). Needed to prevent
  // transparent pixels from becoming inappropriately bright.
  if (blendingMode == 0) {
    //color.a = 1.0;
  }

  if (lightModifier > 0.0) {
    color = applyLight(color, vertexColor, globalLight);
  }

  color = applyFog(color);

  gl_FragColor = color;
}

void mainOther() {
  // Base layer
  vec4 color = texture2D(textures[0], vUv);

  gl_FragColor = color;
}
