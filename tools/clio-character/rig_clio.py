"""
Clio — rig + GLB export for real-time rendering.

Builds the character (build_clio.py), then:
  1. Armature: Root -> Spine1 -> Spine2 -> Tip, ArmL/ArmR, BrowL/BrowR bones.
  2. Body mesh skinned with automatic weights (bends like flesh in real time).
  3. Face parts (eyes, lids, mouths, brows) bone-parented so they ride the head.
  4. Gesture clips authored as actions: wave, nod, tilt (exported as GLB clips).
  5. Exports web/public/clio/clio.glb for the three.js ClioLive renderer.

Run headless:
  blender --background --python tools/clio-character/rig_clio.py -- \
    --glb /abs/path/apps/web/public/clio/clio.glb
"""

import bpy
import math
import os
import sys
import mathutils  # noqa: F401

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


GLB_PATH = get_arg2('--glb', os.path.join(HERE, 'renders', 'clio.glb'))

# ── Extra face states (hidden meshes toggled at runtime by the web player) ──
lids = []
for side in (-1, 1):
    sp_l, n_l = surf((0.34 * side, -1.0, 0.06))
    lid = add_sphere(f'Lid_{"L" if side < 0 else "R"}', sp_l - n_l * 0.05, 0.17,
                     (0.95, 0.55, 0.9), ink_mat)
    lids.append(lid)

for mname, (mr, mx, mz) in {'small': (0.055, 1.3, 0.5), 'mid': (0.085, 1.25, 0.55),
                            'wide': (0.115, 1.3, 0.55)}.items():
    mp_, mn_ = surf((0.0, -1.0, -0.46))
    add_sphere(f'Mouth_{mname}', mp_ + mn_ * 0.012, mr, (mx, 0.45, mz), gloss_black, segments=32)

# Convert feature curves to meshes for export
for cname in ('Mouth', 'BrowL', 'BrowR'):
    cobj = bpy.data.objects.get(cname)
    if cobj and cobj.type == 'CURVE':
        bpy.ops.object.select_all(action='DESELECT')
        cobj.select_set(True)
        bpy.context.view_layer.objects.active = cobj
        bpy.ops.object.convert(target='MESH')

# Remove the stage (web renders its own background/shadow)
for sname in ('Stage', 'Backdrop'):
    o = bpy.data.objects.get(sname)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)

# ── Decimate for real-time (voxel remesh is dense) ──────────────────────────
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
dec = body.modifiers.new('Decimate', 'DECIMATE')
dec.ratio = 0.35
bpy.ops.object.modifier_apply(modifier='Decimate')
bpy.ops.object.shade_smooth()

# ── Armature ─────────────────────────────────────────────────────────────────
FLOOR = 0.60
arm_data = bpy.data.armatures.new('ClioRig')
rig = bpy.data.objects.new('ClioRig', arm_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')

def add_bone(name, head, tail, parent=None):
    b = arm_data.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = arm_data.edit_bones[parent]
    return b


add_bone('Root', (0, 0, FLOOR), (0, 0, 0.95))
add_bone('Spine1', (0, 0, 0.95), (0, 0, 1.45), 'Root')
add_bone('Spine2', (0, 0, 1.45), (0, 0, 1.95), 'Spine1')
add_bone('Tip', (0, 0, 1.95), (0.18, 0, 2.75), 'Spine2')
# Arms: from shoulders down to fists (match build geometry roughly)
add_bone('ArmL', (-0.52, -0.05, 1.35), (-0.78, -0.15, 0.95), 'Spine1')
add_bone('ArmR', (0.52, -0.05, 1.35), (0.78, -0.15, 0.95), 'Spine1')
# Brow bones: tiny controls so the web player can raise/tilt brows
add_bone('BrowBoneL', (-0.3, -0.42, 1.62), (-0.3, -0.42, 1.72), 'Spine2')
add_bone('BrowBoneR', (0.3, -0.42, 1.62), (0.3, -0.42, 1.72), 'Spine2')

bpy.ops.object.mode_set(mode='OBJECT')

# ── Skin the body with automatic weights ────────────────────────────────────
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

# Brow bones should not deform the body — remove their vertex groups
for vg_name in ('BrowBoneL', 'BrowBoneR'):
    vg = body.vertex_groups.get(vg_name)
    if vg:
        body.vertex_groups.remove(vg)


# ── Bone-parent the face parts (rigid, riding the head) ─────────────────────
def bone_parent(obj_name, bone_name):
    o = bpy.data.objects.get(obj_name)
    if not o:
        return
    mw = o.matrix_world.copy()
    o.parent = rig
    o.parent_type = 'BONE'
    o.parent_bone = bone_name
    o.matrix_world = mw


for n in ('EyeL_white', 'EyeL_iris', 'EyeL_pupil', 'EyeL_cl',
          'EyeR_white', 'EyeR_iris', 'EyeR_pupil', 'EyeR_cl',
          'Lid_L', 'Lid_R', 'Mouth', 'Mouth_small', 'Mouth_mid', 'Mouth_wide'):
    bone_parent(n, 'Spine2')
bone_parent('BrowL', 'BrowBoneL')
bone_parent('BrowR', 'BrowBoneR')

# ── Gesture clips (actions -> GLB animation clips) ───────────────────────────
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
pose = rig.pose.bones
scene.render.fps = 30


def new_action(name):
    act = bpy.data.actions.new(name)
    rig.animation_data_create()
    rig.animation_data.action = act
    for pb in pose:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    return act


def key_bone(bone, frame, rot=None, loc=None):
    pb = pose[bone]
    if rot is not None:
        pb.rotation_euler = rot
        pb.keyframe_insert('rotation_euler', frame=frame)
    if loc is not None:
        pb.location = loc
        pb.keyframe_insert('location', frame=frame)


# Wave: right arm raises and waves twice (36 frames, 1.2s)
new_action('wave')
key_bone('ArmR', 1, rot=(0, 0, 0))
key_bone('ArmR', 8, rot=(math.radians(-15), 0, math.radians(140)))
key_bone('ArmR', 14, rot=(math.radians(-15), 0, math.radians(110)))
key_bone('ArmR', 20, rot=(math.radians(-15), 0, math.radians(150)))
key_bone('ArmR', 26, rot=(math.radians(-15), 0, math.radians(115)))
key_bone('ArmR', 36, rot=(0, 0, 0))
key_bone('Spine2', 1, rot=(0, 0, 0))
key_bone('Spine2', 14, rot=(0, math.radians(-4), 0))
key_bone('Spine2', 36, rot=(0, 0, 0))

# Nod: gentle agreement (24 frames)
new_action('nod')
key_bone('Spine2', 1, rot=(0, 0, 0))
key_bone('Spine2', 7, rot=(math.radians(9), 0, 0))
key_bone('Spine2', 13, rot=(math.radians(-3), 0, 0))
key_bone('Spine2', 18, rot=(math.radians(6), 0, 0))
key_bone('Spine2', 24, rot=(0, 0, 0))

# Tilt: curious head tilt and hold (30 frames)
new_action('tilt')
key_bone('Spine2', 1, rot=(0, 0, 0))
key_bone('Spine2', 10, rot=(0, math.radians(8), math.radians(3)))
key_bone('Spine2', 22, rot=(0, math.radians(8), math.radians(3)))
key_bone('Spine2', 30, rot=(0, 0, 0))

bpy.ops.object.mode_set(mode='OBJECT')
rig.animation_data.action = None

# ── Export GLB ────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=GLB_PATH,
    export_format='GLB',
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_skins=True,
    export_yup=True,
    export_apply=False,
    export_cameras=False,
    export_lights=False
)
print(f'GLB EXPORTED -> {GLB_PATH}')
