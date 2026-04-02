/**
 * Set up mouse, touch, device-orientation parallax, click navigation, and resize.
 * Returns a destroy() function that removes all listeners.
 */
export function setupInteraction(renderer, camera, container, book, api) {
  let targetRotY = 0
  let targetRotX = -0.08

  const onMouseMove = e => {
    targetRotY = (e.clientX / window.innerWidth - 0.5) * 0.06
    targetRotX = -0.08 + (e.clientY / window.innerHeight - 0.5) * 0.04
  }

  const onTouchMove = e => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      targetRotY = (touch.clientX / window.innerWidth - 0.5) * 0.04
      targetRotX = -0.08 + (touch.clientY / window.innerHeight - 0.5) * 0.03
    }
  }

  const onDeviceOrientation = e => {
    if (e.gamma != null && e.beta != null) {
      targetRotY = (e.gamma / 90) * 0.06
      targetRotX = -0.08 + ((e.beta - 45) / 90) * 0.04
    }
  }

  const onClick = e => {
    if (api.isAnimating()) return
    const rect = renderer.domElement.getBoundingClientRect()
    const x = (e.clientX || 0) - rect.left
    if (x > rect.width / 2) {
      api.goNext()
    } else {
      api.goPrev()
    }
  }

  const onResize = () => {
    const nw = container.clientWidth
    const nh = container.clientHeight
    if (!nw || !nh) return
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
    renderer.setSize(nw, nh)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('deviceorientation', onDeviceOrientation)
  renderer.domElement.addEventListener('click', onClick)
  window.addEventListener('resize', onResize)

  /**
   * Get the current parallax targets (called each frame).
   */
  function getTargetRotation() {
    return { targetRotX, targetRotY }
  }

  function destroy() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('deviceorientation', onDeviceOrientation)
    renderer.domElement.removeEventListener('click', onClick)
    window.removeEventListener('resize', onResize)
  }

  return { getTargetRotation, destroy }
}
