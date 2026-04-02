import * as THREE from 'three'
import { PAGE_W, PAGE_H, SEGMENTS, STACK_GAP, vertexShader, fragmentShader } from './constants.js'
import {
  createCoverTexture,
  createBackCoverTexture,
  createPageTexture,
  createEmptyTexture
} from './createTextures.js'

/**
 * Build sheet definitions (front/back texture pairs) from page contents.
 * Each sheet has a frontTex, backTex, and a hard flag (covers are hard).
 */
export function buildSheetDefs(pageContents, title, author, storyCount, chapterCount) {
  const defs = []
  const interiorPages = [...pageContents]

  // Ensure even number of interior pages
  if (interiorPages.length % 2 !== 0) {
    interiorPages.push({ type: 'blank' })
  }

  // Front cover + first interior page on back
  defs.push({
    frontTex: createCoverTexture(title, 'The Autobiography of', { author }),
    backTex: interiorPages.length > 0 ? createPageTexture(interiorPages[0]) : createEmptyTexture(),
    hard: true
  })

  // Interior sheets (pairs of pages)
  for (let i = 1; i < interiorPages.length; i += 2) {
    const frontContent = interiorPages[i]
    const backContent = i + 1 < interiorPages.length ? interiorPages[i + 1] : { type: 'blank' }
    defs.push({
      frontTex: createPageTexture(frontContent),
      backTex: createPageTexture(backContent),
      hard: false
    })
  }

  // Back cover
  defs.push({
    frontTex: createEmptyTexture(),
    backTex: createBackCoverTexture(storyCount, chapterCount),
    hard: true
  })

  return defs
}

/**
 * Create Three.js meshes from sheet definitions and add them to the book group.
 * Returns { meshes, states } where states hold basePositions and turnProgress.
 */
export function buildMeshes(sheetDefs, book, scene) {
  const meshes = []
  const states = []

  sheetDefs.forEach(def => {
    const { mesh, basePositions } = createSheetMesh(def)
    book.add(mesh)
    meshes.push(mesh)
    states.push({ basePositions, hard: def.hard, turnProgress: 0 })
  })

  const spineMesh = createSpine(sheetDefs.length, book)
  meshes.push(spineMesh)

  createGroundShadow(scene)

  return { meshes, states }
}

function createSheetMesh(def) {
  const geometry = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEGMENTS, 1)
  const positions = geometry.attributes.position

  for (let i = 0; i < positions.count; i++) {
    positions.array[i * 3] += PAGE_W / 2
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()

  const basePositions = new Float32Array(positions.array)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uFrontTex: { value: def.frontTex },
      uBackTex: { value: def.backTex },
      uIsCover: { value: def.hard ? 1.0 : 0.0 }
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  return { mesh, basePositions }
}

function createSpine(sheetCount, book) {
  const spineDepth = sheetCount * STACK_GAP + 0.03
  const geometry = new THREE.BoxGeometry(0.04, PAGE_H, spineDepth)
  const material = new THREE.MeshStandardMaterial({
    color: 0x5a2d0c,
    roughness: 0.5,
    metalness: 0.1
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-0.02, 0, spineDepth / 2 - 0.005)
  mesh.castShadow = true
  book.add(mesh)
  return mesh
}

function createGroundShadow(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.25 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -PAGE_H / 2 - 0.1
  ground.receiveShadow = true
  scene.add(ground)
}
