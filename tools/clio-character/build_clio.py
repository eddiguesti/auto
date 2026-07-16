"""
Clio — Blender character build (ink-drop mascot, user-reference guided).

Reference look: matte black droplet with a tall elegant swept tip, big white
eyes with large black pupils, black glossy brows + engraved smile (read via
sheen, not color), stubby arms with mitten fists, rounded feet, soft white
studio with grounded shadow.

Run headless:
  blender --background --python tools/clio-character/build_clio.py -- \
    --out tools/clio-character/renders/clio_rest.png

NOTE: Blender metaball surfaces sit at ~0.574x the element radius (measured).
All feature placement ray-casts onto the real converted mesh, so features
always seat on the surface regardless of that scaling.
"""

import bpy
import math
import sys
import mathutils


def get_arg(name, default):
    argv = sys.argv
    if '--' in argv:
        args = argv[argv.index('--') + 1:]
        if name in args:
            return args[args.index(name) + 1]
    return default


OUT_PATH = get_arg('--out', '//clio_rest.png')

# ── Clean scene ──────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ── Body: plump drop with a tall, elegant swept tip ──────────────────────────
mb_data = bpy.data.metaballs.new('ClioBody')
mb_data.resolution = 0.04
mb_data.render_resolution = 0.018
mb_obj = bpy.data.objects.new('ClioBody', mb_data)
bpy.context.collection.objects.link(mb_obj)

# One fat sphere for the round base, then a single continuous ogee curve
# of shrinking balls to a fine tip — the classic teardrop profile
base = mb_data.elements.new(type='BALL')
base.co = (0.0, 0.0, 1.42)
base.radius = 1.05

for i in range(1, 41):
    t = i / 40.0
    el = mb_data.elements.new(type='BALL')
    el.co = (0.44 * t ** 2.3, 0.0, 1.42 + 1.66 * t)
    el.radius = 1.05 * (1.0 - t) ** 1.28 + 0.045

# Shoulder swells — the body rises smoothly to meet the arms
for side in (-1, 1):
    sh = mb_data.elements.new(type='BALL')
    sh.co = (0.60 * side, -0.02, 1.30)
    sh.radius = 0.30

# Convert metaball to mesh
bpy.context.view_layer.objects.active = mb_obj
mb_obj.select_set(True)
bpy.ops.object.convert(target='MESH')
body = bpy.context.active_object
body.name = 'Clio'

# Keep only the largest island (kills stray blobs)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.separate(type='LOOSE')
bpy.ops.object.mode_set(mode='OBJECT')
parts = sorted(bpy.context.selected_objects, key=lambda o: len(o.data.vertices), reverse=True)
for stray in parts[1:]:
    bpy.data.objects.remove(stray, do_unlink=True)
body = parts[0]
body.name = 'Clio'
bpy.context.view_layer.objects.active = body
# Gentle vertex smoothing irons out any residual metaball ripples
smooth = body.modifiers.new('Smooth', 'SMOOTH')
smooth.factor = 0.7
smooth.iterations = 10
bpy.ops.object.modifier_apply(modifier='Smooth')
bpy.ops.object.shade_smooth()


# ── Materials ────────────────────────────────────────────────────────────────
def simple_mat(name, color, rough, coat=0.0, sheen=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Roughness'].default_value = rough
    if coat and 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.2
    if sheen and 'Sheen Weight' in b.inputs:
        b.inputs['Sheen Weight'].default_value = sheen
    return m


ink_mat = simple_mat('ClioInk', (0.006, 0.006, 0.008), 0.28, coat=0.35, sheen=0.2)  # matte black ink
gloss_black = simple_mat('GlossBlack', (0.01, 0.01, 0.012), 0.18)  # brows/mouth/limbs
white_mat = simple_mat('EyeWhite', (0.96, 0.965, 0.97), 0.15)
pupil_mat = simple_mat('Pupil', (0.008, 0.008, 0.01), 0.05)
iris_mat = simple_mat('Iris', (0.16, 0.085, 0.035), 0.2)
body.data.materials.append(ink_mat)

# ── Surface projection helper ────────────────────────────────────────────────
HEAD_C = mathutils.Vector((0.0, 0.0, 1.66))


def surf(direction, offset=0.0):
    d = mathutils.Vector(direction).normalized()
    hit, loc, normal, _ = body.ray_cast(HEAD_C, d)
    if not hit:
        return HEAD_C + d * 0.5, -d
    return loc + normal * offset, normal


def add_sphere(name, loc, radius, scale, mat, segments=48):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc,
                                         segments=segments, ring_count=segments // 2)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


# ── Eyes: big white patches, large black pupils, tiny catchlight ────────────
def make_eye(side, name):
    sp, n = surf((0.34 * side, -1.0, 0.06))
    center = sp - n * 0.055  # mostly proud, slightly seated

    add_sphere(f'{name}_white', center, 0.185, (0.92, 0.55, 1.05), white_mat)

    # Warm brown iris with a black pupil, looking slightly inward
    iris_pos = center + n * 0.082 + mathutils.Vector((-0.03 * side, 0.0, 0.005))
    add_sphere(f'{name}_iris', iris_pos, 0.096, (1.0, 0.5, 1.0), iris_mat, segments=32)
    pupil_pos = center + n * 0.105 + mathutils.Vector((-0.03 * side, 0.0, 0.005))
    add_sphere(f'{name}_pupil', pupil_pos, 0.058, (1.0, 0.55, 1.0), pupil_mat, segments=32)

    # Catchlight — the toy-render spark
    cl_pos = pupil_pos + n * 0.05 + mathutils.Vector((-0.028, 0.0, 0.035))
    add_sphere(f'{name}_cl', cl_pos, 0.025, (1.0, 0.6, 1.0), white_mat, segments=16)


make_eye(-1, 'EyeL')
make_eye(1, 'EyeR')


# ── Arc helper (brows, mouth) ────────────────────────────────────────────────
def arc(name, dirs, bevel, mat, offset=0.02, taper=None):
    # Tapered stroke hugging the surface; negative offset sinks it into the
    # body so it reads as relief/engraving rather than a stuck-on tube.
    pts = [surf(d, offset)[0] for d in dirs]
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    sp_ = curve.splines.new('BEZIER')
    sp_.bezier_points.add(len(pts) - 1)
    taper = taper or [1.0] * len(pts)
    for bpt, co, r in zip(sp_.bezier_points, pts, taper):
        bpt.co = co
        bpt.radius = r
        bpt.handle_left_type = bpt.handle_right_type = 'AUTO'
    curve.bevel_depth = bevel
    curve.use_fill_caps = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


# Brows — bold black arcs above the eyes (read via gloss against matte body)
arc('BrowL', [(-0.60, -0.88, 0.40), (-0.38, -1.0, 0.52), (-0.16, -1.0, 0.46)], 0.042, gloss_black, offset=-0.012, taper=[0.3, 1.0, 0.5])
arc('BrowR', [(0.16, -1.0, 0.46), (0.38, -1.0, 0.52), (0.60, -0.88, 0.40)], 0.042, gloss_black, offset=-0.012, taper=[0.5, 1.0, 0.3])

# Mouth — thin engraved smile
arc('Mouth', [(-0.28, -1.0, -0.36), (0.0, -1.0, -0.48), (0.28, -1.0, -0.36)], 0.024, gloss_black, offset=-0.010, taper=[0.35, 1.0, 0.35])


# ── Arms: stubby, bent, mitten fists ─────────────────────────────────────────
def make_arm(side, name):
    shoulder, sn = surf((1.0 * side, -0.10, -0.12))
    elbow = shoulder + mathutils.Vector((0.15 * side, -0.04, -0.15))
    fist_c = elbow + mathutils.Vector((0.09 * side, -0.05, -0.19))

    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    sp_ = curve.splines.new('BEZIER')
    sp_.bezier_points.add(2)
    arm_taper = [1.35, 1.0, 0.88]
    for bpt, co, r in zip(sp_.bezier_points, [shoulder - sn * 0.14, elbow, fist_c], arm_taper):
        bpt.co = co
        bpt.radius = r
        bpt.handle_left_type = bpt.handle_right_type = 'AUTO'
    curve.bevel_depth = 0.10
    curve.use_fill_caps = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(ink_mat)

    # Mitten fist
    add_sphere(f'{name}_fist', fist_c, 0.135, (1.0, 0.92, 1.05), ink_mat, segments=32)


make_arm(-1, 'ArmL')
make_arm(1, 'ArmR')

# ── Legs + feet: she stands, round bottom clear of the ground ───────────────
FLOOR_Z = 0.60


def make_leg(side, name):
    top = mathutils.Vector((0.25 * side, -0.02, 1.02))
    ankle = mathutils.Vector((0.26 * side, -0.06, FLOOR_Z + 0.10))
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    sp_ = curve.splines.new('BEZIER')
    sp_.bezier_points.add(1)
    for bpt, co in zip(sp_.bezier_points, [top, ankle]):
        bpt.co = co
        bpt.handle_left_type = bpt.handle_right_type = 'AUTO'
    curve.bevel_depth = 0.095
    curve.use_fill_caps = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(ink_mat)
    foot = add_sphere(f'{name}_foot', (0.30 * side, -0.26, FLOOR_Z + 0.055), 0.15,
                      (1.05, 1.7, 0.78), ink_mat, segments=32)
    foot.rotation_euler = (0, 0, math.radians(-14 * side))


make_leg(-1, 'LegL')
make_leg(1, 'LegR')

# ── Stage: warm white studio ─────────────────────────────────────────────────
stage_mat = simple_mat('StageMat', (0.93, 0.87, 0.76), 0.55)
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 4, FLOOR_Z))
floor = bpy.context.active_object
floor.name = 'Stage'
floor.data.materials.append(stage_mat)

bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 6, 6), rotation=(math.radians(90), 0, 0))
wall = bpy.context.active_object
wall.name = 'Backdrop'
wall.data.materials.append(stage_mat)


# ── Studio lighting ──────────────────────────────────────────────────────────
def area_light(name, loc, rot, power, size, color=(1, 1, 1)):
    light_data = bpy.data.lights.new(name, type='AREA')
    light_data.energy = power
    light_data.size = size
    light_data.color = color
    obj = bpy.data.objects.new(name, light_data)
    obj.location = loc
    obj.rotation_euler = rot
    bpy.context.collection.objects.link(obj)
    return obj


area_light('Key', (-3.0, -3.6, 4.8), (math.radians(44), math.radians(-16), math.radians(-30)), 1250, 8.0,
           (1.0, 0.93, 0.80))
area_light('Fill', (3.6, -3.2, 1.6), (math.radians(75), math.radians(18), math.radians(38)), 460, 6.0,
           (0.95, 0.90, 0.82))
area_light('Rim', (1.8, 3.6, 3.6), (math.radians(-50), math.radians(12), math.radians(160)), 800, 3.0,
           (0.97, 0.98, 1.0))
area_light('RimL', (-3.4, 3.0, 2.8), (math.radians(-55), math.radians(-10), math.radians(-155)), 550, 2.5,
           (0.95, 0.97, 1.0))

world = bpy.data.worlds.new('World')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.95, 0.88, 0.76, 1.0)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.26

# ── Camera ───────────────────────────────────────────────────────────────────
cam_data = bpy.data.cameras.new('Cam')
cam_data.lens = 62
cam_data.dof.use_dof = True
cam_data.dof.focus_distance = 7.3
cam_data.dof.aperture_fstop = 5.0
cam = bpy.data.objects.new('Cam', cam_data)
cam.location = (0.12, -7.4, 1.8)
cam.rotation_euler = (math.radians(88.0), 0, math.radians(1.0))
bpy.context.collection.objects.link(cam)
scene.camera = cam

# ── Render settings ──────────────────────────────────────────────────────────
scene.render.engine = 'CYCLES'
scene.view_settings.view_transform = 'Khronos PBR Neutral'
scene.cycles.samples = 160
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

scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.filepath = OUT_PATH
scene.render.image_settings.file_format = 'PNG'

bpy.ops.render.render(write_still=True)
print(f'RENDERED -> {OUT_PATH}')
