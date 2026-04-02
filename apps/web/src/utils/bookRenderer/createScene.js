import * as THREE from 'three'

/**
 * Create the WebGL renderer and append it to the container.
 * Returns null if the container has no dimensions.
 */
export function createRenderer(container) {
  const w = container.clientWidth
  const h = container.clientHeight
  if (!w || !h) return null

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)
  return renderer
}

/**
 * Create a perspective camera positioned for the book view.
 */
export function createCamera(container) {
  const w = container.clientWidth
  const h = container.clientHeight
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
  camera.position.set(0, 0.35, 2.55)
  camera.lookAt(0, 0, 0)
  return camera
}

/**
 * Create the scene with ambient, key, fill, and rim lights.
 */
export function createScene() {
  const scene = new THREE.Scene()

  scene.add(new THREE.AmbientLight(0x404050, 0.5))

  const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.5)
  keyLight.position.set(3, 5, 4)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.radius = 4
  keyLight.shadow.bias = -0.0005
  keyLight.shadow.normalBias = 0.02
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0xd0e0ff, 1.0)
  fillLight.position.set(-3, 3, 2)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.5)
  rimLight.position.set(0, 4, -4)
  scene.add(rimLight)

  return scene
}

/**
 * Create the book group (root transform for the whole book).
 */
export function createBookGroup(scene) {
  const book = new THREE.Group()
  book.rotation.x = -0.08
  scene.add(book)
  return book
}
