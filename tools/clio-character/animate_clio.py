"""
Clio — character animation loops (real deformation, no rig needed).

Reuses the build_clio.py character, binds every face part to the body
surface (Surface Deform), then animates the BODY with Bend + Stretch
modifiers — so the whole character bends, breathes and bounces like
flesh while her face rides along. Blinks and mouth flaps are baked as
visibility keyframes. Each state renders a seamless PNG-sequence loop.

Run headless (one loop per invocation):
  blender --background --python tools/clio-character/animate_clio.py -- \
    --anim idle --outdir /abs/path/frames --size 480 --transparent 1

Loops: idle (4s) | listen (3s) | talk (2.4s) | excited (2.4s), 30fps.
"""

import bpy
import math
import sys
import os
import mathutils  # noqa: F401  (used by the exec'd build script)

HERE = os.path.dirname(os.path.abspath(__file__))

# ── Build the character (everything except the final render call) ────────────
build_src = open(os.path.join(HERE, 'build_clio.py')).read()
exec(build_src.split("# ── Render settings")[0])  # noqa: S102


def get_arg2(name, default):
    argv = sys.argv
    if '--' in argv:
        args = argv[argv.index('--') + 1:]
        if name in args:
            return args[args.index(name) + 1]
    return default


ANIM = get_arg2('--anim', 'idle')
OUTDIR = get_arg2('--outdir', os.path.join(HERE, 'renders', 'anim'))
ASIZE = int(get_arg2('--size', '480'))
FPS = 30

os.makedirs(OUTDIR, exist_ok=True)

# ── Extra face states: closed lids + open-mouth variants (hidden by default) ─
lids = []
for side in (-1, 1):
    sp_l, n_l = surf((0.34 * side, -1.0, 0.06))
    lid = add_sphere(f'Lid_{side}', sp_l - n_l * 0.05, 0.17, (0.95, 0.55, 0.9), ink_mat)
    lids.append(lid)

mouth_variants = {}
for mname, (mr, mx, mz) in {'small': (0.055, 1.3, 0.5), 'mid': (0.085, 1.25, 0.55),
                            'wide': (0.115, 1.3, 0.55)}.items():
    mp_, mn_ = surf((0.0, -1.0, -0.46))
    mouth_variants[mname] = add_sphere(f'Mouth_{mname}', mp_ + mn_ * 0.012, mr,
                                       (mx, 0.45, mz), gloss_black, segments=32)

# The smile is a curve; convert to mesh so it can surface-bind
smile = bpy.data.objects.get('Mouth')
brow_l = bpy.data.objects.get('BrowL')
brow_r = bpy.data.objects.get('BrowR')
for cobj in (smile, brow_l, brow_r):
    if cobj and cobj.type == 'CURVE':
        bpy.ops.object.select_all(action='DESELECT')
        cobj.select_set(True)
        bpy.context.view_layer.objects.active = cobj
        bpy.ops.object.convert(target='MESH')

# ── Body origin at the feet so deformation pivots there ─────────────────────
FLOOR = 0.60
scene.cursor.location = (0.0, 0.0, FLOOR)
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# ── Deform modifiers on the body (rest values now, keyframed later) ──────────
sway = body.modifiers.new('Sway', 'SIMPLE_DEFORM')
sway.deform_method = 'BEND'
sway.deform_axis = 'Y'
sway.angle = 0.0

squash = body.modifiers.new('Squash', 'SIMPLE_DEFORM')
squash.deform_method = 'STRETCH'
squash.deform_axis = 'Z'
squash.factor = 0.0

# ── Bind every face part to the body surface ────────────────────────────────
FACE_PARTS = ['EyeL_white', 'EyeL_iris', 'EyeL_pupil', 'EyeL_cl',
              'EyeR_white', 'EyeR_iris', 'EyeR_pupil', 'EyeR_cl',
              'Mouth', 'BrowL', 'BrowR', 'Lid_-1', 'Lid_1',
              'Mouth_small', 'Mouth_mid', 'Mouth_wide']
for pname in FACE_PARTS:
    o = bpy.data.objects.get(pname)
    if not o or o.type != 'MESH':
        continue
    sd = o.modifiers.new('Follow', 'SURFACE_DEFORM')
    sd.target = body
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.surfacedeform_bind(modifier='Follow')


# ── Keyframe helpers ─────────────────────────────────────────────────────────
def kf_mod(mod_name, prop, frame, value):
    setattr(body.modifiers[mod_name], prop, value)
    body.keyframe_insert(data_path=f'modifiers["{mod_name}"].{prop}', frame=frame)


def set_vis(obj, frame, hidden):
    obj.hide_render = hidden
    obj.keyframe_insert(data_path='hide_render', frame=frame)


def blink(frames_closed):
    # bake eye/lid visibility for the whole loop
    eye_parts = [bpy.data.objects.get(n) for n in
                 ['EyeL_white', 'EyeL_iris', 'EyeL_pupil', 'EyeL_cl',
                  'EyeR_white', 'EyeR_iris', 'EyeR_pupil', 'EyeR_cl']]
    closed = set(frames_closed)
    for f in range(1, N + 2):
        is_closed = f in closed
        for o in eye_parts:
            if o:
                set_vis(o, f, is_closed)
        for lid in lids:
            set_vis(lid, f, not is_closed)


def mouth_show(schedule):
    # schedule: dict frame -> 'smile'|'small'|'mid'|'wide'; holds until next key
    all_m = {'smile': smile, 'small': mouth_variants['small'],
             'mid': mouth_variants['mid'], 'wide': mouth_variants['wide']}
    keys = sorted(schedule.keys())
    current = 'smile'
    ki = 0
    for f in range(1, N + 2):
        if ki < len(keys) and f >= keys[ki]:
            current = schedule[keys[ki]]
            ki += 1
        for mname, o in all_m.items():
            if o:
                set_vis(o, f, mname != current)


# ── Loop definitions (perfectly cyclic: value(1) == value(N+1)) ─────────────
LOOPS = {
    'idle': {'n': 120},
    'listen': {'n': 90},
    'talk': {'n': 72},
    'excited': {'n': 72},
}
N = LOOPS[ANIM]['n']

TWO_PI = 2.0 * math.pi

if ANIM == 'idle':
    for f in range(1, N + 2):
        t = (f - 1) / N
        kf_mod('Sway', 'angle', f, math.radians(2.2) * math.sin(TWO_PI * t))
        kf_mod('Squash', 'factor', f, 0.015 * math.sin(TWO_PI * t * 2))
    blink(list(range(38, 43)) + list(range(96, 101)))
    mouth_show({1: 'smile'})

elif ANIM == 'listen':
    for f in range(1, N + 2):
        t = (f - 1) / N
        lean = math.radians(-5.0)
        kf_mod('Sway', 'angle', f, lean + math.radians(1.4) * math.sin(TWO_PI * t))
        kf_mod('Squash', 'factor', f, 0.01 * math.sin(TWO_PI * t))
    blink(list(range(58, 63)))
    mouth_show({1: 'smile'})

elif ANIM == 'talk':
    for f in range(1, N + 2):
        t = (f - 1) / N
        kf_mod('Sway', 'angle', f, math.radians(1.2) * math.sin(TWO_PI * t * 2))
        kf_mod('Squash', 'factor', f,
               0.02 * math.sin(TWO_PI * t * 3) + 0.008 * math.sin(TWO_PI * t * 5))
    blink(list(range(48, 53)))
    # Speech-like flap cadence (holds ~5-7 frames per shape)
    mouth_show({1: 'small', 7: 'mid', 13: 'small', 19: 'wide', 26: 'mid', 32: 'small',
                38: 'mid', 44: 'wide', 51: 'small', 57: 'mid', 64: 'small', 70: 'smile'})

elif ANIM == 'excited':
    for f in range(1, N + 2):
        t = (f - 1) / N
        kf_mod('Sway', 'angle', f, math.radians(2.0) * math.sin(TWO_PI * t * 2))
        kf_mod('Squash', 'factor', f, 0.045 * math.sin(TWO_PI * t * 3))
    blink(list(range(30, 35)))
    mouth_show({1: 'smile'})

# ── Render settings ──────────────────────────────────────────────────────────
scene.render.engine = 'CYCLES'
scene.view_settings.view_transform = 'Khronos PBR Neutral'
scene.render.film_transparent = True
scene.cycles.samples = 64
scene.cycles.use_denoising = True
prefs = bpy.context.preferences.addons.get('cycles')
if prefs:
    cp = prefs.preferences
    try:
        cp.compute_device_type = 'METAL'
        cp.get_devices()
        for d in cp.devices:
            d.use = True
        scene.cycles.device = 'GPU'
    except Exception:
        scene.cycles.device = 'CPU'

scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = N
scene.render.resolution_x = ASIZE
scene.render.resolution_y = ASIZE
scene.render.filepath = os.path.join(OUTDIR, f'{ANIM}_')
scene.render.image_settings.file_format = 'PNG'

bpy.ops.render.render(animation=True)
print(f'ANIM DONE -> {OUTDIR}/{ANIM}_####.png x {N}')
