/* Book renderer constants and GLSL shaders */

export const PAGE_W = 1.28
export const PAGE_H = 1.71
export const SEGMENTS = 30
export const STACK_GAP = 0.001
export const FLIP_DURATION = 700
export const COVER_FLIP_DURATION = 900
export const TEX_W = 1536
export const TEX_H = 2048

export const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const fragmentShader = `
  uniform sampler2D uFrontTex;
  uniform sampler2D uBackTex;
  uniform float uIsCover;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 N = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
    vec3 V = normalize(-vViewPos);
    vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec3 albedo = gl_FrontFacing
      ? texture2D(uFrontTex, vUv).rgb
      : texture2D(uBackTex, uv).rgb;
    albedo = pow(albedo, vec3(2.2));
    vec3 L1 = normalize(vec3(0.5, 0.8, 0.6));
    float diff1 = max(dot(N, L1), 0.0) * 0.65;
    vec3 L2 = normalize(vec3(-0.5, 0.5, 0.4));
    float diff2 = max(dot(N, L2), 0.0) * 0.3;
    vec3 L3 = normalize(vec3(0.0, 0.3, -1.0));
    float diff3 = max(dot(N, L3), 0.0) * 0.15;
    vec3 ambient = vec3(0.28);
    vec3 H = normalize(L1 + V);
    float shininess = uIsCover > 0.5 ? 80.0 : 8.0;
    float specStrength = uIsCover > 0.5 ? 0.25 : 0.04;
    float spec = pow(max(dot(N, H), 0.0), shininess) * specStrength;
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 color = albedo * (ambient + vec3(1.0, 0.97, 0.92) * diff1 + vec3(0.85, 0.9, 1.0) * diff2 + vec3(1.0) * diff3);
    color += vec3(1.0, 0.98, 0.95) * spec;
    color += vec3(0.04) * fresnel;
    color = pow(color, vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
  }
`
