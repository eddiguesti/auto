import { createRenderer, createCamera, createScene, createBookGroup } from './createScene.js'
import { buildSheetDefs, buildMeshes } from './createMeshes.js'
import { deformSheet, flipSheet, startRenderLoop } from './animationLoop.js'
import { setupInteraction } from './setupInteraction.js'

export { buildPageContents } from './buildPages.js'

/**
 * Build the 3D book inside the given container element.
 * Returns a control API: { currentView, sheetCount, onViewChange, goNext, goPrev, isAnimating, init, destroy }
 */
export function buildBook(
  container,
  pageContents,
  title,
  author,
  _coverImageUrl,
  storyCount,
  chapterCount
) {
  const renderer = createRenderer(container)
  if (!renderer) return null

  const scene = createScene()
  const camera = createCamera(container)
  const book = createBookGroup(scene)

  const animState = { animating: false }
  let meshes = []
  let states = []
  let sheetDefs = []
  let stopRenderLoop = null

  const api = {
    currentView: 0,
    sheetCount: 0,
    onViewChange: null,

    goNext() {
      if (api.currentView < api.sheetCount && !animState.animating) {
        const idx = api.currentView
        flipSheet(meshes, states, sheetDefs.length, animState, idx, true).then(() => {
          api.currentView = idx + 1
          api.onViewChange?.(api.currentView)
        })
      }
    },

    goPrev() {
      if (api.currentView > 0 && !animState.animating) {
        const idx = api.currentView - 1
        flipSheet(meshes, states, sheetDefs.length, animState, idx, false).then(() => {
          api.currentView = idx
          api.onViewChange?.(api.currentView)
        })
      }
    },

    isAnimating() {
      return animState.animating
    },

    async init() {
      sheetDefs = buildSheetDefs(pageContents, title, author, storyCount, chapterCount)
      const built = buildMeshes(sheetDefs, book, scene)
      meshes = built.meshes
      states = built.states

      // Initial deformation for all sheets
      sheetDefs.forEach((_, i) => {
        deformSheet(meshes, states, sheetDefs.length, i)
      })

      api.sheetCount = sheetDefs.length

      // Start interaction + render loop
      const interaction = setupInteraction(renderer, camera, container, book, api)
      stopRenderLoop = startRenderLoop(renderer, scene, camera, book, interaction.getTargetRotation)

      // Store interaction for cleanup
      api._interaction = interaction
    },

    destroy() {
      if (stopRenderLoop) stopRenderLoop()
      if (api._interaction) api._interaction.destroy()

      renderer.dispose()
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }

  return api
}
