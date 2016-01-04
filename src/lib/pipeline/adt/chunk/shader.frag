#define LOG2 1.442695
#define whiteCompliment(a) (1.0 - saturate(a))

uniform int layerCount;
uniform sampler2D alphaMaps[4];
uniform sampler2D textures[4];

varying vec2 vUv;
varying vec2 vUvAlpha;

#ifdef USE_FOG
	uniform vec3 fogColor;

	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else

		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif

void main() {
  vec4 color = texture2D(textures[0], vUv);

  vec4 layer;
  vec4 blend;

  if (layerCount > 1) {
    layer = texture2D(textures[1], vUv);
    blend = texture2D(alphaMaps[0], vUvAlpha);
    color = mix(color, layer, blend);
  }

  if (layerCount > 2) {
    layer = texture2D(textures[2], vUv);
    blend = texture2D(alphaMaps[1], vUvAlpha);
    color = mix(color, layer, blend);
  }

  if (layerCount > 3) {
    layer = texture2D(textures[3], vUv);
    blend = texture2D(alphaMaps[2], vUvAlpha);
    color = mix(color, layer, blend);
  }

  #ifdef USE_FOG
    #ifdef USE_LOGDEPTHBUF_EXT
      float depth = gl_FragDepthEXT / gl_FragCoord.w;
    #else
      float depth = gl_FragCoord.y/ gl_FragCoord.w;
    #endif

    #ifdef FOG_EXP2
      float fogFactor = whiteCompliment(exp2(-fogDensity * fogDensity * depth * depth * LOG2));
    #else
      float fogFactor = smoothstep(fogNear, fogFar, depth);
    #endif

    color = mix(color, vec4(fogColor, 1.0), fogFactor);
  #endif

  gl_FragColor = color;
}
