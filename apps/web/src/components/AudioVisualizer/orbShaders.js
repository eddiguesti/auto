/**
 * Clio — "The Comma" — GLSL sources.
 *
 * One idea: Clio is a comma. The pause in a story; the breath before you
 * remember; the promise that the sentence isn't over. A single-stroke
 * silhouette you can sketch from memory, built for everything from a 64px
 * app icon to a billboard.
 *
 * Design system (brand brief):
 *  - Silhouette first: a soft disc with a tapering hooked tail (SDF
 *    metaball chain), slight natural tilt. No decoration that doesn't aid
 *    recognition.
 *  - Material: frosted glass / soft resin — depth, light and subtle
 *    translucency instead of internal texture. No noise interior.
 *  - Lighting: studio — soft window key light, controlled highlights,
 *    subtle rim, and a grounded contact shadow. No aura, no bloom.
 *  - Face: large expressive eyes, small confident smile, Pixar restraint.
 *  - Motion is posture: she leans in to listen, gives a gentle
 *    squash-and-breath to your voice, and lip-syncs when she speaks.
 *
 * WebGL1-compatible (GLSL ES 1.0, constant loops, no derivatives).
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
uniform float uHighs;    // high-frequency band energy 0..1 (unused, kept for API)

// State-blended palette
uniform vec3  uColA;     // light tone (core light, catchlights)
uniform vec3  uColB;     // mid tone  (body)
uniform vec3  uColC;     // deep tone (edge density, shade)
uniform vec3  uRim;      // rim light tint
uniform vec3  uAura;     // contact shadow tint

// State-blended behaviour (slots repurposed for the comma's posture)
uniform float uFlow;     // inner-light drift speed
uniform float uWobble;   // micro jelly (very subtle aliveness)
uniform float uLobe;     // LEAN — she tilts in when listening
uniform float uPetal;    // SQUASH — gentle bounce with the voice
uniform float uRimAmt;   // rim light strength
uniform float uAuraAmt;  // contact shadow strength
uniform float uSpark;    // unused (kept for API stability)
uniform float uBreath;   // idle breathing amplitude

// Face (expressions computed on the CPU)
uniform float uFace;     // 1 = draw the face
uniform float uEyeOpen;  // 0 closed .. ~1.15 wide attentive
uniform float uMouth;    // 0 resting smile .. 1 fully open (speech)
uniform vec2  uLook;     // gaze offset, roughly -1..1

// Shape metamorphosis — weights for (comma, ear-crescent, bulb, pen nib).
// SDF fields blend directly, so one body melts into the next.
uniform vec4  uShape;

// --- Tiny value noise (only for the micro-jelly; interior stays clean) -----
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  ) * 2.0 - 1.0;
}

// Polynomial smooth minimum — blends the comma from simple circles
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Rounded-box SDF (for the bulb base)
float rbox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// ── The four bodies. Every shape keeps its face zone (head disc) intact. ──

// COMMA — resting identity. The pause between stories.
float commaSDF(vec2 p) {
  float d = length(p - vec2(0.06, 0.13)) - 0.58;             // head
  d = smin(d, length(p - vec2(-0.26, -0.34)) - 0.245, 0.10); // shoulder
  d = smin(d, length(p - vec2(-0.43, -0.52)) - 0.140, 0.09); // taper
  d = smin(d, length(p - vec2(-0.52, -0.65)) - 0.070, 0.08); // tip
  return d;
}

// EAR CRESCENT — listening. A cupped curve catching your voice.
float earSDF(vec2 p) {
  float d = length(p - vec2(-0.06, 0.10)) - 0.56;            // head
  float cup = length(p - vec2(0.50, 0.10)) - 0.30;           // outer cup
  float hollow = length(p - vec2(0.68, 0.10)) - 0.24;        // carve inside
  cup = max(cup, -hollow);
  d = smin(d, cup, 0.10);
  return d;
}

// BULB — remembering. Lights up with the teller's voice.
float bulbSDF(vec2 p) {
  float d = length(p - vec2(0.0, 0.20)) - 0.55;              // glass
  d = smin(d, length(p - vec2(0.0, -0.34)) - 0.19, 0.12);    // neck
  d = smin(d, rbox(p - vec2(0.0, -0.55), vec2(0.19, 0.115), 0.07), 0.05); // base
  return d;
}

// PEN NIB — writing it down. The story becomes ink.
float penSDF(vec2 p) {
  float d = length(p - vec2(0.0, 0.22)) - 0.52;              // body
  d = smin(d, length(p - vec2(0.0, -0.10)) - 0.38, 0.08);    // shoulders
  d = smin(d, length(p - vec2(0.0, -0.40)) - 0.20, 0.07);    // straight taper
  d = smin(d, length(p - vec2(0.0, -0.64)) - 0.048, 0.07);   // point
  return d;
}

// Blended field + the face anchor that travels with it
float bodySDF(vec2 p, vec4 w) {
  return w.x * commaSDF(p) + w.y * earSDF(p) + w.z * bulbSDF(p) + w.w * penSDF(p);
}

vec2 headCenter(vec4 w) {
  return w.x * vec2(0.06, 0.13) + w.y * vec2(-0.06, 0.10) + w.z * vec2(0.0, 0.20) +
         w.w * vec2(0.0, 0.22);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float t = uTime;

  // ---- Posture -------------------------------------------------------------
  // Breathing scale + a gentle squash bounce driven by the voice
  float breathe = 1.0 + uBreath * sin(t * 0.9) + uLevel * 0.035 + uPulse * 0.02;
  float squash = 1.0 + uPetal * 0.16 * (uLevel - 0.30) + uPetal * 0.05 * sin(t * 3.1);
  // Lean: a poised tilt toward the speaker, with a slow attentive sway
  float lean = uLobe * (0.10 + 0.035 * sin(t * 0.7));
  float ca = cos(lean);
  float sa = sin(lean);

  vec2 bp = uv;
  bp = mat2(ca, -sa, sa, ca) * bp;             // lean
  bp = vec2(bp.x * (2.0 - squash), bp.y * squash); // squash & stretch (volume-ish)
  bp /= breathe;

  // Micro-jelly: barely-there organic life on the silhouette
  float jelly = vnoise(bp * 2.0 + vec2(0.0, t * 0.5)) * uWobble;

  // Normalized shape weights — the body is a blend of four fields
  vec4 w = uShape / max(uShape.x + uShape.y + uShape.z + uShape.w, 1e-4);
  vec2 headC = headCenter(w);

  float d = bodySDF(bp, w) + jelly;

  // ---- Pseudo-3D from the SDF ------------------------------------------------
  float px = 2.0 / min(uRes.x, uRes.y);
  float aa = px * 1.6;
  float alpha = 1.0 - smoothstep(-aa, aa, d);

  // Depth: 0 at the edge, 1 deep inside — the "thickness" of the resin
  float depth = clamp(-d / 0.40, 0.0, 1.0);
  float zn = sqrt(depth * (2.0 - depth)); // hemispherical profile

  // Surface normal from the SDF gradient
  float e = 0.012;
  vec2 grad = vec2(
    bodySDF(bp + vec2(e, 0.0), w) - bodySDF(bp - vec2(e, 0.0), w),
    bodySDF(bp + vec2(0.0, e), w) - bodySDF(bp - vec2(0.0, e), w)
  ) / (2.0 * e);
  vec3 n = normalize(vec3(grad.x, grad.y, 1.6 * zn + 0.25));

  // ---- Frosted resin material -------------------------------------------------
  // Denser color at the thin edges, light at the thick core (translucency)
  vec3 body = mix(uColC, uColB, smoothstep(0.0, 0.45, depth));
  body = mix(body, uColA, smoothstep(0.45, 1.0, depth) * 0.55);

  // Inner light: a soft source drifting slightly, like light in frosted glass.
  // In bulb form it becomes the filament — your voice literally lights her up.
  vec2 lightPos = headC + vec2(0.03 * sin(t * 0.4 * uFlow), 0.08 + 0.02 * cos(t * 0.33 * uFlow));
  float inner = exp(-dot(bp - lightPos, bp - lightPos) * 2.2);
  body += uColA * inner * (0.14 + uLevel * 0.18 + w.z * (0.12 + uLevel * 0.5));

  // Key light (top-left studio softbox)
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  float ndl = clamp(dot(n, L), 0.0, 1.0);
  body *= 0.80 + 0.22 * ndl;

  // Soft occlusion under the head, above the tail — gives the form weight
  body *= 1.0 - 0.10 * smoothstep(0.2, 0.9, -bp.y) * (1.0 - depth);

  // ---- Face — pigment set in the resin, under the gloss -----------------------
  if (uFace > 0.5) {
    // Head space: features ride the lean, breath, squash — and the morph
    vec2 hp = (bp - headC) / 0.58;
    hp /= 0.86 + 0.14 * zn;
    vec2 look = uLook * 0.12;

    vec3 featureCol = mix(uColC, vec3(0.08, 0.10, 0.14), 0.7);
    featureCol *= 0.8 + 0.2 * zn;
    featureCol += body * 0.10;

    // Eyes — large, calm, vertical ovals
    float eyeH = 0.235 * max(uEyeOpen, 0.09);
    float eyeW = 0.135 + 0.018 * (1.0 - min(uEyeOpen, 1.0));
    vec2 eL = vec2(-0.36, 0.10) + look;
    vec2 eR = vec2(0.36, 0.10) + look;
    float dL = length((hp - eL) / vec2(eyeW, eyeH)) - 1.0;
    float dR = length((hp - eR) / vec2(eyeW, eyeH)) - 1.0;
    float eyeD = min(dL, dR);
    float eyeMask = smoothstep(0.16, -0.12, eyeD);

    // Mouth — small confident smile that opens with her voice
    float openAmt = smoothstep(0.02, 0.2, uMouth);
    vec2 sv = hp - vec2(0.0, -0.16) - look * 0.4;
    float dArc = abs(length(sv) - 0.26);
    float smileMask = smoothstep(0.030, 0.011, dArc)
                    * smoothstep(-0.16, -0.22, sv.y)
                    * (1.0 - openAmt);
    vec2 mp = hp - vec2(0.0, -0.42) - look * 0.4;
    vec2 op = vec2(mp.x, mp.y - 0.45 * mp.x * mp.x);
    float mouthH = 0.02 + 0.15 * uMouth;
    float mouthW = 0.26 + 0.07 * uMouth;
    float dm = length(op / vec2(mouthW, mouthH)) - 1.0;
    float openMask = smoothstep(0.25, -0.2, dm) * openAmt;
    float mouthMask = max(openMask, smileMask * 0.85);

    // Soft inset — features sit in the material, not on it
    float inset = smoothstep(0.45, -0.1, eyeD) * 0.5 + smoothstep(0.5, -0.2, dm) * openAmt * 0.4;
    body *= 1.0 - inset * 0.08;

    body = mix(body, featureCol, max(eyeMask * 0.94, mouthMask * 0.88));

    // Catchlights
    float cl = min(
      length(hp - (eL + vec2(-0.045, 0.075))),
      length(hp - (eR + vec2(-0.045, 0.075)))
    );
    float clMask = smoothstep(0.055, 0.008, cl) * step(0.35, uEyeOpen);
    body = mix(body, vec3(1.0, 1.0, 0.99), clMask * 0.9);
  }

  // Nib slit — the single detail that makes the pen read as a pen
  float slit = smoothstep(0.018, 0.006, abs(bp.x))
             * smoothstep(-0.66, -0.56, bp.y)
             * (1.0 - smoothstep(-0.42, -0.32, bp.y))
             * w.w;
  body = mix(body, uColC * 0.6, slit * 0.55);

  // ---- Studio gloss (after the face — the surface coats her) ------------------
  // Window highlight: tall soft reflection, top-left
  vec2 wq = (bp - vec2(-0.22, 0.38)) / vec2(0.16, 0.30);
  body += vec3(1.0) * exp(-dot(wq, wq)) * 0.14 * (0.6 + 0.4 * zn);
  vec2 wq2 = (bp - vec2(-0.20, 0.42)) / vec2(0.05, 0.14);
  body += vec3(1.0) * exp(-dot(wq2, wq2)) * 0.18;

  // Thin rim light, lower-right — separates her from the page
  float rimDir = clamp(dot(normalize(bp - headC + 1e-4), normalize(vec2(0.55, -0.6))), 0.0, 1.0);
  body += uRim * pow(1.0 - depth, 3.5) * rimDir * uRimAmt * (0.5 + uLevel * 0.4);

  // ---- Grounded contact shadow (behind the body) -------------------------------
  vec2 sq = (uv - vec2(-0.02, -0.80)) / vec2(0.46 * breathe, 0.085);
  float shadow = exp(-dot(sq, sq)) * uAuraAmt;
  vec3 shadowCol = uAura * 0.35;

  // ---- Composite (premultiplied alpha) -----------------------------------------
  vec3 col = body * alpha + shadowCol * shadow * (1.0 - alpha);
  float a = clamp(alpha + shadow * 0.75 * (1.0 - alpha), 0.0, 1.0);

  // Grain dither — invisible, kills gradient banding
  col += (hash21(gl_FragCoord.xy + fract(t) * 61.7) - 0.5) * (2.0 / 255.0);

  gl_FragColor = vec4(col, a);
}
`
