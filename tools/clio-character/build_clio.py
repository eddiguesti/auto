"""
Clio — Blender character build (resting "speech bubble" form).

Run headless:
  blender --background --python tools/clio-character/build_clio.py -- \
    --out tools/clio-character/renders/clio_rest.png

Sculpting approach mirrors the SDF shader: metaballs blend organically
(Blender's metaballs ARE smooth-min fields), converted to a smooth mesh.
Material is soft translucent resin/skin: Principled BSDF with subsurface
scattering. Lighting is a three-point studio on a warm parchment stage.
"""

import bpy
import math
import sys


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

# ── Body: metaball ink drop — a drop of ink, waiting to become words ────────
mb_data = bpy.data.metaballs.new('ClioBody')
mb_data.resolution = 0.04
mb_data.render_resolution = 0.02
mb_obj = bpy.data.objects.new('ClioBody', mb_data)
bpy.context.collection.objects.link(mb_obj)

# Round body (face lives here)
head = mb_data.elements.new(type='BALL')
head.co = (0.0, 0.0, 1.12)
head.radius = 1.0

# Eye-socket mounds — the face flesh that holds the eyeballs
for sx in (-0.20, 0.20):
    m = mb_data.elements.new(type='BALL')
    m.co = (sx, -0.16, 1.30)
    m.radius = 0.34

# Tapering tip curving gently to one side — a dense chain for a seamless taper
for i in range(9):
    t = i / 8.0
    el = mb_data.elements.new(type='BALL')
    el.co = (0.02 + 0.12 * t * t, 0.0, 1.55 + 1.18 * t)
    el.radius = 0.80 * (1.0 - t) ** 1.35 + 0.085

# Convert metaball to mesh for clean shading
bpy.context.view_layer.objects.active = mb_obj
mb_obj.select_set(True)
bpy.ops.object.convert(target='MESH')
body = bpy.context.active_object
body.name = 'Clio'

# Keep only the largest connected island — kills stray metaball blobs
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
bpy.ops.object.shade_smooth()

# ── Body material: translucent blue resin-skin ───────────────────────────────
mat = bpy.data.materials.new('ClioInk')
mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (0.030, 0.040, 0.070, 1.0)  # stylized ink: near-black blue
bsdf.inputs['Roughness'].default_value = 0.33  # soft toy sheen, not vinyl
if 'Coat Weight' in bsdf.inputs:
    bsdf.inputs['Coat Weight'].default_value = 0.22  # gentle sheen
    bsdf.inputs['Coat Roughness'].default_value = 0.08
if 'Sheen Weight' in bsdf.inputs:
    bsdf.inputs['Sheen Weight'].default_value = 0.3
if 'Subsurface Weight' in bsdf.inputs:
    bsdf.inputs['Subsurface Weight'].default_value = 0.06
    bsdf.inputs['Subsurface Radius'].default_value = (0.1, 0.12, 0.25)
body.data.materials.append(mat)


# ── Surface projection: every feature seats itself on the real mesh ─────────
import mathutils

HEAD_C = mathutils.Vector((0.0, 0.0, 1.30))


def surf(direction, offset=0.0):
    """Ray-cast outward from the head centre; return (point, normal) with the
    point pushed `offset` along the outward normal."""
    d = mathutils.Vector(direction).normalized()
    hit, loc, normal, _ = body.ray_cast(HEAD_C, d)
    if not hit:
        return HEAD_C + d * 0.5, -d
    return loc + normal * offset, normal


# ── Eyes: real eyeballs seated in the face ───────────────────────────────────
def make_eye(side, name):
    sp, n = surf((0.50 * side, -1.0, -0.03))
    center = sp - n * 0.085  # sunk into the socket, front third proud

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.155, location=center, segments=48, ring_count=32)
    eye = bpy.context.active_object
    eye.name = f'{name}_sclera'
    eye.scale = (0.9, 0.8, 1.12)
    bpy.ops.object.shade_smooth()
    m = bpy.data.materials.new(f'{name}_white')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.97, 0.98, 1.0, 1.0)
    b.inputs['Roughness'].default_value = 0.08
    eye.data.materials.append(m)

    # Iris and pupil stack outward along the eye's own normal
    iris_c = center + n * 0.145
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.093, location=iris_c, segments=32, ring_count=24)
    iris = bpy.context.active_object
    iris.name = f'{name}_iris'
    iris.scale = (1.0, 0.42, 1.0)
    bpy.ops.object.shade_smooth()
    mi = bpy.data.materials.new(f'{name}_irisMat')
    mi.use_nodes = True
    bi = mi.node_tree.nodes['Principled BSDF']
    bi.inputs['Base Color'].default_value = (0.22, 0.50, 0.95, 1.0)
    bi.inputs['Roughness'].default_value = 0.15
    iris.data.materials.append(mi)

    pupil_c = center + n * 0.175
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.042, location=pupil_c, segments=24, ring_count=16)
    pupil = bpy.context.active_object
    pupil.name = f'{name}_pupil'
    pupil.scale = (1.0, 0.4, 1.0)
    bpy.ops.object.shade_smooth()
    mp = bpy.data.materials.new(f'{name}_pupilMat')
    mp.use_nodes = True
    bp_ = mp.node_tree.nodes['Principled BSDF']
    bp_.inputs['Base Color'].default_value = (0.02, 0.02, 0.04, 1.0)
    bp_.inputs['Roughness'].default_value = 0.1
    pupil.data.materials.append(mp)


make_eye(-1, 'EyeL')
make_eye(1, 'EyeR')

# ── Feature material + bezier-arc helper ────────────────────────────────────
feat_mat = bpy.data.materials.new('FeatureMat')
feat_mat.use_nodes = True
fb_ = feat_mat.node_tree.nodes['Principled BSDF']
fb_.inputs['Base Color'].default_value = (0.62, 0.62, 0.60, 1.0)  # soft grey
fb_.inputs['Roughness'].default_value = 0.4


def arc(name, dirs, bevel, offset=0.022):
    """Bezier arc through surface points found along the given directions."""
    pts = [surf(d, offset)[0] for d in dirs]
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    sp_ = curve.splines.new('BEZIER')
    sp_.bezier_points.add(len(pts) - 1)
    for bpt, co in zip(sp_.bezier_points, pts):
        bpt.co = co
        bpt.handle_left_type = bpt.handle_right_type = 'AUTO'
    curve.bevel_depth = bevel
    curve.use_fill_caps = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(feat_mat)
    return obj


# Brows — arched just above the eyes, hugging the face
arc('BrowL', [(-0.72, -0.85, 0.46), (-0.48, -0.95, 0.60), (-0.22, -1.0, 0.50)], 0.018)
arc('BrowR', [(0.22, -1.0, 0.50), (0.48, -0.95, 0.60), (0.72, -0.85, 0.46)], 0.018)

# Mouth — small confident smile on the chin
arc('Mouth', [(-0.30, -1.0, -0.42), (0.0, -1.0, -0.56), (0.30, -1.0, -0.42)], 0.024, offset=0.015)

# ── Stage: warm parchment floor + backdrop (one curved plane) ────────────────
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 4, 0.60))
floor = bpy.context.active_object
floor.name = 'Stage'
fm = bpy.data.materials.new('StageMat')
fm.use_nodes = True
fb = fm.node_tree.nodes['Principled BSDF']
fb.inputs['Base Color'].default_value = (0.973, 0.953, 0.918, 1.0)  # parchment
fb.inputs['Roughness'].default_value = 0.55  # matte paper
floor.data.materials.append(fm)

# Backdrop wall — warm parchment, softly lit
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 6, 6), rotation=(math.radians(90), 0, 0))
wall = bpy.context.active_object
wall.name = 'Backdrop'
wall.data.materials.append(fm)

# ── Studio lighting: key softbox, cool fill, rim ─────────────────────────────
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


area_light('Key', (-3.2, -3.4, 4.6), (math.radians(45), math.radians(-18), math.radians(-32)), 1300, 7.0,
           (1.0, 0.97, 0.92))
area_light('Fill', (3.6, -3.0, 1.4), (math.radians(75), math.radians(18), math.radians(38)), 180, 4.0,
           (0.85, 0.92, 1.0))
area_light('RimL', (-3.4, 3.2, 2.6), (math.radians(-55), math.radians(-10), math.radians(-155)), 650, 2.5,
           (0.9, 0.95, 1.0))
area_light('Rim', (1.6, 3.8, 3.4), (math.radians(-50), math.radians(12), math.radians(160)), 950, 3.0,
           (0.95, 0.98, 1.0))

# World: soft warm ambient
world = bpy.data.worlds.new('World')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.96, 0.94, 0.90, 1.0)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.10

# ── Camera: 85mm portrait, slight down-angle, gentle DoF ─────────────────────
cam_data = bpy.data.cameras.new('Cam')
cam_data.lens = 70
cam_data.dof.use_dof = True
cam_data.dof.focus_distance = 8.2
cam_data.dof.aperture_fstop = 4.5
cam = bpy.data.objects.new('Cam', cam_data)
cam.location = (0.3, -7.6, 1.62)
cam.rotation_euler = (math.radians(87.5), 0, math.radians(2.0))
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
scene.render.film_transparent = False
scene.render.filepath = OUT_PATH
scene.render.image_settings.file_format = 'PNG'

bpy.ops.render.render(write_still=True)
print(f'RENDERED -> {OUT_PATH}')
