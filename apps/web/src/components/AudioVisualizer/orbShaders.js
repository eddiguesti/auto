/**
 * Clio Orb — GLSL sources.
 *
 * A living "drop of ink and bronze in glass": the whole orb is drawn in a
 * single fragment shader on a quad. Techniques (state of the art for voice
 * orbs — same family as ElevenLabs' Orb and ChatGPT voice mode blobs):
 *
 *  - 3D simplex noise (Ashima/McEwan-Gustavson) layered as fbm
 *  - Domain warping for the liquid-ink interior flow
 *  - Seamless angular noise displacing the silhouette so the orb itself
 *    breathes and wobbles organically
 *  - Fake-sphere normals -> fresnel rim light + limb darkening
 *  - Glass specular highlights, inner core glow, drifting sparkle motes
 *  - Audio-reactive uniforms (level / transient pulse / high-band energy)
 *  - Expanding ripple rings while speaking, soft outer aura
 *  - Hash-grain dithering to eliminate gradient banding
 *
 * WebGL1-compatible (GLSL ES 1.0, constant loops, no derivatives extension).
 */

export const ORB_VERTEX_SHADER = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const ORB_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec2  uRes;      // canvas resolution (physical px)
uniform float uTime;     // seconds
uniform float uLevel;    // smoothed voice energy 0..1
uniform float uPulse;    // fast transient (attack) 0..1
uniform float uHighs;    // high-frequency band energy 0..1

// State-blended palette (lerped on the CPU between idle/listening/speaking)
uniform vec3  uColA;     // light tone   (veins, sparkles, core)
uniform vec3  uColB;     // mid tone     (body)
uniform vec3  uColC;     // deep tone    (depths)
uniform vec3  uRim;      // rim light
uniform vec3  uAura;     // outer halo

// State-blended behaviour
uniform float uFlow;     // interior flow speed
uniform float uWobble;   // fine organic silhouette texture
uniform float uLobe;     // soft jelly lobes (listening — the orb "leans in")
uniform float uPetal;    // rhythmic radial waves (speaking — sound leaving)
uniform float uRimAmt;   // fresnel rim strength
uniform float uAuraAmt;  // halo + ripple strength
uniform float uSpark;    // sparkle mote amount
uniform float uBreath;   // idle breathing amplitude

// ---------------------------------------------------------------------------
// Simplex noise 3D — Ian McEwan & Stefan Gustavson (Ashima Arts), MIT.
// ---------------------------------------------------------------------------
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Fractal Brownian Motion — 4 octaves of simplex
float fbm(vec3 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    f += amp * snoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return f;
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  // Centered coords, -1..1 on the short axis
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float t = uTime;

  // ---- Breathing, audio-swelling base radius -------------------------------
  float baseR = 0.65
    + uBreath * sin(t * 0.9)
    + uBreath * 0.6 * sin(t * 1.7 + 1.3)
    + uLevel * 0.055
    + uPulse * 0.03;

  // ---- Living silhouette: three shape languages blended by state -----------
  float ang = atan(uv.y, uv.x);
  vec3 circ = vec3(cos(ang), sin(ang), 0.0);

  // Fine organic texture (always subtly present)
  float edge1 = fbm(circ * 1.3 + vec3(0.0, 0.0, t * 0.32));
  float edge2 = snoise(circ * 2.6 + vec3(0.0, 0.0, t * 0.7));
  float organic = uWobble * (0.75 * edge1 + 0.15 * edge2) * (0.45 + uLevel * 1.4 + uPulse);

  // Listening: soft slow jelly lobes — a friendly blob leaning in
  float lobes = snoise(circ * 1.05 + vec3(0.0, 0.0, t * 0.8))
              + 0.5 * snoise(circ * 1.9 - vec3(0.0, 0.0, t * 0.55));
  float lobe = uLobe * lobes * (0.7 + uLevel * 1.2);

  // Speaking: rhythmic radial petals — sound rippling outward
  float petals = sin(ang * 5.0 - t * 2.6) * 0.6 + sin(ang * 3.0 + t * 1.8) * 0.4;
  float petal = uPetal * petals * (0.45 + uLevel * 1.6);

  float r = length(uv);
  float R = baseR * (1.0 + organic + lobe + petal);
  float d = r / R;

  // ---- Fake sphere geometry -------------------------------------------------
  float z = sqrt(max(0.0, 1.0 - d * d));

  // ---- Interior: domain-warped liquid ink ----------------------------------
  vec3 sp = vec3(uv / R, z); // point on the unit sphere
  float ft = t * uFlow;
  float ca = cos(ft * 0.12);
  float sa = sin(ft * 0.12);
  sp.xz = mat2(ca, -sa, sa, ca) * sp.xz; // slow tumble

  vec3 q = sp * 1.15 + vec3(0.0, ft * 0.14, 0.0);
  vec3 warp = vec3(
    snoise(q + vec3(0.0, 0.0, ft * 0.22)),
    snoise(q + vec3(5.2, 1.3, ft * 0.18)),
    snoise(q + vec3(1.7, 9.2, ft * 0.16))
  );
  float f1 = fbm(q + 0.8 * warp);
  float f2 = fbm(q * 1.8 - 0.55 * warp + vec3(0.0, -ft * 0.24, 0.0));

  // Ridged noise -> thin flowing ink filaments (the fine structure)
  float ridge = 1.0 - abs(snoise(q * 2.4 + 0.9 * warp + vec3(0.0, -ft * 0.20, 0.0)));
  ridge = pow(max(ridge, 0.0), 4.0);
  float ridge2 = 1.0 - abs(snoise(q * 4.8 - 0.6 * warp + vec3(3.1, ft * 0.26, 0.0)));
  ridge2 = pow(max(ridge2, 0.0), 6.0);

  // Fine shimmer octave for micro-detail
  float fine = snoise(q * 6.5 + warp * 0.5 + vec3(0.0, ft * 0.3, 0.0));

  // Broad liquid forms with real depth range
  float m1 = smoothstep(-0.55, 0.75, f1 + uLevel * 0.22);
  float m2 = smoothstep(-0.45, 0.9, f2);
  vec3 body = mix(uColC, uColB, m1);
  body = mix(body, uColA, m2 * 0.55);

  // Carve dark channels between filaments, then paint the filaments luminous.
  // Filament energy builds with the state (uSpark) — calm at rest, electric live.
  float energy = 0.32 + uSpark * 0.55;
  body = mix(body, uColC, (1.0 - ridge) * 0.20 * m1);
  body += uColA * ridge * (0.28 + uLevel * 0.30) * energy;
  body += mix(uColB, uColA, 0.5) * ridge2 * (0.32 + uHighs * 0.5) * energy;
  body += body * fine * 0.08; // micro-shimmer

  // Volume shading + luminous vein crossings + voice energy flush
  body *= 0.76 + 0.24 * z;
  body = mix(body, uColA, 0.08 * z); // milky glass depth toward the center
  body += uColA * pow(max(0.0, f1 * f2), 2.0) * 0.24;
  body += uRim * uPulse * 0.16;
  body *= 1.0 + 0.07 * (uv.y / R); // soft top-light ambience

  // Warm core glow, gently alive even at rest
  float core = exp(-d * d * 3.0);
  body += uColA * core * (0.10 + uLevel * 0.28 + 0.05 * sin(t * 2.1));

  // ---- Sparkle motes ("dust of memories") ----------------------------------
  vec2 gp = (uv / R) * 7.0 + vec2(0.0, t * 0.25); // slow upward drift
  vec2 cell = floor(gp);
  vec2 fp = fract(gp) - 0.5;
  float h = hash21(cell);
  vec2 off = vec2(hash21(cell + 13.1), hash21(cell + 27.7)) - 0.5;
  float sd = length(fp - off * 0.62);
  float twinkle = pow(0.5 + 0.5 * sin(t * (1.4 + h * 2.6) + h * 6.2831), 6.0);
  float spark = smoothstep(0.10, 0.0, sd) * twinkle;
  body += uColA * spark * uSpark * (0.4 + uHighs * 1.2) * z;

  // ---- Fresnel rim light (broad glow + thin crisp glass edge) ---------------
  float fres = pow(1.0 - z, 2.2);
  body += uRim * fres * uRimAmt * (0.55 + uLevel * 0.9 + uPulse * 0.4);
  body += uRim * pow(1.0 - z, 7.0) * (0.28 + uLevel * 0.4);

  // ---- Glass specular (soft bloom + hot point, top-left) --------------------
  vec2 hl = uv / R - vec2(-0.38, 0.42);
  float specD = dot(hl, hl);
  body += vec3(1.0, 0.985, 0.95) * exp(-specD * 8.0) * 0.16 * (0.7 + 0.3 * z);
  body += vec3(1.0) * exp(-specD * 42.0) * 0.22;

  // Soft inner shadow at the base for weight
  body *= 1.0 - 0.16 * smoothstep(0.0, 1.1, -uv.y / R * 0.8 + d * 0.4) * (1.0 - z);

  // ---- Compositing: orb mask, aura, ripples --------------------------------
  float px = 2.0 / min(uRes.x, uRes.y);   // one pixel in uv units
  float aa = px * 1.6 / R;
  float alpha = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);

  // Halo hugging the rim
  float aura = exp(-max(d - 1.0, 0.0) * 3.4)
             * step(1.0, d)
             * uAuraAmt * (0.35 + uLevel * 0.9 + uPulse * 0.6);

  // Expanding ripple rings (voice leaving the orb)
  float rip = 0.0;
  for (int i = 0; i < 2; i++) {
    float phase = fract(t * 0.5 + float(i) * 0.5);
    float ringR = 1.02 + phase * 0.30;
    rip += exp(-pow((d - ringR) * 26.0, 2.0)) * (1.0 - phase);
  }
  rip *= uAuraAmt * (0.18 + uLevel * 0.7);

  vec3 col = body * alpha + uAura * aura + uRim * rip;
  float a = clamp(alpha + aura * 0.85 + rip * 0.6, 0.0, 1.0);

  // Fade everything before the square canvas edge so nothing clips hard
  float edgeFade = 1.0 - smoothstep(0.90, 1.0, r);
  col *= edgeFade;
  a *= edgeFade;

  // ---- Grain dither (kills banding on the soft gradients) -------------------
  col += (hash21(gl_FragCoord.xy + fract(t) * 61.7) - 0.5) * (2.0 / 255.0);

  gl_FragColor = vec4(col, a); // premultiplied alpha
}
`
