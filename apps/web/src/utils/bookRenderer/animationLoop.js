import { PAGE_W, STACK_GAP, FLIP_DURATION, COVER_FLIP_DURATION } from './constants.js'

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Apply page-curl / rigid deformation to a single sheet mesh.
 */
export function deformSheet(meshes, states, sheetCount, index) {
  if (index >= meshes.length || !states[index]) return
  const mesh = meshes[index]
  if (!mesh.geometry?.attributes?.position) return

  const state = states[index]
  const positions = mesh.geometry.attributes.position
  const base = state.basePositions
  const progress = state.turnProgress

  for (let i = 0; i < positions.count; i++) {
    const bx = base[i * 3]
    const by = base[i * 3 + 1]
    const t = bx / PAGE_W
    let nx, ny, nz

    if (state.hard) {
      const angle = progress * Math.PI
      nx = bx * Math.cos(angle)
      ny = by
      nz = bx * Math.sin(angle)
    } else {
      const stiffness = 0.4
      const localProgress = Math.max(
        0,
        Math.min(1, progress * (1 + stiffness) - (1 - t) * stiffness)
      )
      const angle = localProgress * Math.PI
      nx = bx * Math.cos(angle)
      ny = by
      nz = bx * Math.sin(angle)
      const curlIntensity = Math.sin(progress * Math.PI) * 0.08
      const edgeFactor = t * t
      nz += curlIntensity * edgeFactor
      ny += Math.sin(progress * Math.PI) * 0.015 * edgeFactor
    }

    const zOffset = progress < 0.5 ? (sheetCount - 1 - index) * STACK_GAP : index * STACK_GAP
    nz += zOffset

    positions.array[i * 3] = nx
    positions.array[i * 3 + 1] = ny
    positions.array[i * 3 + 2] = nz
  }

  positions.needsUpdate = true
  mesh.geometry.computeVertexNormals()
}

/**
 * Animate a single sheet flip (forward = opening, backward = closing).
 * Returns a Promise that resolves when the animation finishes.
 */
export function flipSheet(meshes, states, sheetCount, animState, sheetIndex, forward) {
  return new Promise(resolve => {
    if (animState.animating) {
      resolve()
      return
    }
    if (!states[sheetIndex]) {
      resolve()
      return
    }

    animState.animating = true
    const isHard = states[sheetIndex].hard
    const duration = isHard ? COVER_FLIP_DURATION : FLIP_DURATION
    const startVal = states[sheetIndex].turnProgress
    const endVal = forward ? 1 : 0
    const startTime = performance.now()

    function tick() {
      const elapsed = performance.now() - startTime
      let t = Math.min(elapsed / duration, 1)
      t = easeInOutCubic(t)
      states[sheetIndex].turnProgress = startVal + (endVal - startVal) * t
      deformSheet(meshes, states, sheetCount, sheetIndex)

      if (elapsed < duration) {
        requestAnimationFrame(tick)
      } else {
        states[sheetIndex].turnProgress = endVal
        deformSheet(meshes, states, sheetCount, sheetIndex)
        animState.animating = false
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })
}

/**
 * Start the render loop. Returns a stop() function.
 */
export function startRenderLoop(renderer, scene, camera, book, getTargetRotation) {
  let running = true

  function loop() {
    if (!running) return
    const { targetRotX, targetRotY } = getTargetRotation()
    book.rotation.y += (targetRotY - book.rotation.y) * 0.06
    book.rotation.x += (targetRotX - book.rotation.x) * 0.06
    renderer.render(scene, camera)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  return function stop() {
    running = false
  }
}
