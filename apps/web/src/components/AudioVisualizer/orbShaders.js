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

// Tapering capsule — a segment whose radius narrows from r1 to r2
float taperSeg(vec2 p, vec2 a, vec2 b, float r1, float r2) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(r1, r2, h);
}

// Circular arc with rounded caps (iq) — aperture opens around +y
float sdArc(vec2 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}

// ── The four bodies — true icon silhouettes; the face lives inside each. ──

// SPEECH BUBBLE — at rest. "I'm here to chat." Short, crisp tail.
float bubbleSDF(vec2 p) {
  float d = length(p - vec2(0.0, 0.08)) - 0.54;
  float tail = taperSeg(p, vec2(-0.18, -0.38), vec2(-0.38, -0.62), 0.13, 0.02);
  d = smin(d, tail, 0.05);
  return d;
}

// HEADPHONES — listening. Band over her head, cups snug at the sides.
float phonesSDF(vec2 p) {
  float d = length(p - vec2(0.0, 0.0)) - 0.52; // her head
  // Band: an arc riding over the crown
  float band = sdArc(p - vec2(0.0, 0.02), vec2(sin(1.25), cos(1.25)), 0.60, 0.05);
  d = min(d, band);
  // Cups: rounded pads hugging each side
  float cups = min(
    rbox(p - vec2(-0.57, -0.04), vec2(0.085, 0.165), 0.06),
    rbox(p - vec2(0.57, -0.04), vec2(0.085, 0.165), 0.06)
  );
  d = smin(d, cups, 0.04);
  return d;
}

// BULB — remembering. Pear-shaped glass, collar, screw base, contact nub.
float bulbSDF(vec2 p) {
  float d = length(p - vec2(0.0, 0.24)) - 0.47;                                   // dome
  d = smin(d, taperSeg(p, vec2(0.0, 0.05), vec2(0.0, -0.30), 0.30, 0.215), 0.09); // waist
  d = smin(d, taperSeg(p, vec2(0.0, -0.30), vec2(0.0, -0.46), 0.22, 0.18), 0.05); // collar
  d = smin(d, rbox(p - vec2(0.0, -0.55), vec2(0.18, 0.09), 0.05), 0.035);         // screw base
  d = smin(d, length(p - vec2(0.0, -0.68)) - 0.045, 0.04);                        // contact nub
  return d;
}

// PEN NIB — writing it down. A shield: dome shoulders flowing into the point.
float penSDF(vec2 p) {
  vec2 pe = vec2(p.x / 1.06, p.y); // slightly wide dome
  float d = length(pe - vec2(0.0, 0.16)) - 0.50;
  // Shoulders start as wide as the dome so the sides read as one curve
  float shield = taperSeg(p, vec2(0.0, -0.02), vec2(0.0, -0.68), 0.475, 0.01);
  d = smin(d, shield, 0.10);
  // Breather hole — punched clean through, like a real nib
  d = max(d, -(length(p - vec2(0.0, -0.36)) - 0.05));
  return d;
}

// Blended field + the face anchor and scale that travel with it
float bodySDF(vec2 p, vec4 w) {
  return w.x * bubbleSDF(p) + w.y * phonesSDF(p) + w.z * bulbSDF(p) + w.w * penSDF(p);
}

vec2 headCenter(vec4 w) {
  return w.x * vec2(0.0, 0.08) + w.y * vec2(0.0, 0.0) + w.z * vec2(0.0, 0.22) +
         w.w * vec2(0.0, 0.12);
}

float headRadius(vec4 w) {
  return dot(w, vec4(0.54, 0.52, 0.46, 0.50));
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

  // Inner light: a soft source drifting slightly, like light in frosted glass
  vec2 lightPos = headC + vec2(0.03 * sin(t * 0.4 * uFlow), 0.08 + 0.02 * cos(t * 0.33 * uFlow));
  float inner = exp(-dot(bp - lightPos, bp - lightPos) * 2.2);
  body += uColA * inner * (0.14 + uLevel * 0.18);

  // Bulb filament: a small glowing ring that burns brighter with your voice
  float filR = abs(length(bp - vec2(0.0, -0.04)) - 0.10);
  float filament = exp(-filR * filR * 500.0) * w.z;
  body += uColA * filament * (0.25 + uLevel * 1.1);
  body += uColA * exp(-dot(bp - vec2(0.0, -0.04), bp - vec2(0.0, -0.04)) * 6.0)
        * w.z * (0.10 + uLevel * 0.55);

  // Bulb screw threads: two quiet grooves across the base
  float thread = (exp(-pow((bp.y + 0.51) * 60.0, 2.0)) + exp(-pow((bp.y + 0.60) * 60.0, 2.0)))
               * smoothstep(0.20, 0.16, abs(bp.x)) * w.z;
  body = mix(body, uColC * 0.75, thread * 0.4);

  // Key light (top-left studio softbox) + cool fill from below-right
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  float ndl = clamp(dot(n, L), 0.0, 1.0);
  body *= 0.80 + 0.22 * ndl;
  vec3 L2 = normalize(vec3(0.5, -0.35, 0.62));
  body += uRim * 0.06 * clamp(dot(n, L2), 0.0, 1.0);

  // Glass edge: a light band just inside the silhouette, then a hairline
  // of denser color right at it — the double-line read of real glass
  float edgeBand = smoothstep(0.0, 0.10, depth) * (1.0 - smoothstep(0.10, 0.30, depth));
  body += uColA * edgeBand * 0.10;
  body *= 1.0 - 0.10 * (1.0 - smoothstep(0.0, 0.05, depth));

  // Soft occlusion under the head, above the tail — gives the form weight
  body *= 1.0 - 0.10 * smoothstep(0.2, 0.9, -bp.y) * (1.0 - depth);

  // ---- Face — pigment set in the resin, under the gloss -----------------------
  if (uFace > 0.5) {
    // Head space: features ride the lean, breath, squash — and the morph
    vec2 hp = (bp - headC) / headRadius(w);
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

  // Nib slit — from the breather hole down to the point
  float slit = smoothstep(0.016, 0.005, abs(bp.x))
             * smoothstep(-0.68, -0.63, bp.y)
             * (1.0 - smoothstep(-0.43, -0.39, bp.y))
             * w.w;
  body = mix(body, uColC * 0.55, slit * 0.6);

  // ---- Studio gloss (after the face — the surface coats her) ------------------
  // Window highlight: tall soft reflection, top-left
  vec2 wq = (bp - vec2(-0.22, 0.38)) / vec2(0.16, 0.30);
  body += vec3(1.0) * exp(-dot(wq, wq)) * 0.14 * (0.6 + 0.4 * zn);
  vec2 wq2 = (bp - vec2(-0.20, 0.42)) / vec2(0.05, 0.14);
  body += vec3(1.0) * exp(-dot(wq2, wq2)) * 0.18;
  // Secondary glint, lower-right — the second point of light real glass has
  vec2 wq3 = (bp - headC - vec2(0.34, -0.30)) / vec2(0.045, 0.09);
  body += vec3(1.0) * exp(-dot(wq3, wq3)) * 0.09;

  // Thin rim light, lower-right — separates her from the page
  float rimDir = clamp(dot(normalize(bp - headC + 1e-4), normalize(vec2(0.55, -0.6))), 0.0, 1.0);
  body += uRim * pow(1.0 - depth, 3.5) * rimDir * uRimAmt * (0.5 + uLevel * 0.4);

  // ---- Grounded contact shadow (two layers: tight core + soft spread) ----------
  vec2 sq = (uv - vec2(-0.02, -0.80)) / vec2(0.46 * breathe, 0.085);
  vec2 sq2 = (uv - vec2(-0.02, -0.79)) / vec2(0.26 * breathe, 0.045);
  float shadow = (exp(-dot(sq, sq)) * 0.75 + exp(-dot(sq2, sq2)) * 0.45) * uAuraAmt;
  vec3 shadowCol = uAura * 0.35;

  // ---- Composite (premultiplied alpha) -----------------------------------------
  vec3 col = body * alpha + shadowCol * shadow * (1.0 - alpha);
  float a = clamp(alpha + shadow * 0.75 * (1.0 - alpha), 0.0, 1.0);

  // Grain dither — invisible, kills gradient banding
  col += (hash21(gl_FragCoord.xy + fract(t) * 61.7) - 0.5) * (2.0 / 255.0);

  gl_FragColor = vec4(col, a);
}
`
