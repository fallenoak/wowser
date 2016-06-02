uniform sampler2D textures[4];
uniform float alphaKey;

uniform float lightModifier;
uniform vec3 ambientLight;
uniform vec3 diffuseLight;

uniform float fogModifier;
uniform float fogStart;
uniform float fogEnd;
uniform vec3 fogColor;

uniform float animatedTransparency;

varying vec2 coordinates[2];
varying vec4 vertexColor;
varying vec3 worldVertexNormal;
varying float cameraDistance;

vec3 saturate(vec3 value) {
  vec3 result = clamp(value, 0.0, 1.0);
  return result;
}

float saturate(float value) {
  float result = clamp(value, 0.0, 1.0);
  return result;
}

vec4 applyDiffuseLighting(vec4 result) {
  vec3 lightDirection = vec3(1, 1, -1);

  float light = saturate(dot(worldVertexNormal, normalize(-lightDirection)));

  vec3 diffusion = diffuseLight.rgb * light;
  diffusion += ambientLight.rgb;
  diffusion = saturate(diffusion);

  result.rgb *= diffusion;

  return result;
}

vec4 applyFog(vec4 result) {
  float fogFactor = (fogEnd - cameraDistance) / (fogEnd - fogStart);
  fogFactor = 1.0 - clamp(fogFactor, 0.0, 1.0);
  float fogColorFactor = fogFactor * fogModifier;

  // Only mix fog color for simple blending modes.
  #if BLENDING_MODE <= 2
    result.rgb = mix(result.rgb, fogColor.rgb, fogColorFactor);
  #endif

  // Ensure certain blending mode pixels become fully opaque by fog end.
  if (cameraDistance >= fogEnd) {
    result.rgb = fogColor.rgb;
    result.a = 1.0;
  }

  // Ensure certain blending mode pixels fade out as fog increases.
  #if BLENDING_MODE >= 2 && BLENDING_MODE < 6
    result.a *= 1.0 - fogFactor;
  #endif

  return result;
}

vec4 finalizeColor(vec4 result) {
  if (lightModifier > 0.0) {
    result = applyDiffuseLighting(result);
  }

  result = applyFog(result);

  return result;
}
