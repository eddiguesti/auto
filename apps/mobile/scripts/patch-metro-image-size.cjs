// Metro 0.83.3 still passes filenames to image-size's removed synchronous file API.
// Keep the patched image-size release, and adapt that one Metro call to bytes.
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')

const EXPECTED_METRO = '0.83.3'
const EXPECTED_IMAGE_SIZE = '2.0.4'
const ORIGINAL = `  const isImageInput = assetInfo.files[0].includes(".zip/")
    ? _fs.default.readFileSync(assetInfo.files[0])
    : assetInfo.files[0];`
const PATCHED = `  // Easy Memoir compatibility: image-size 2 accepts image bytes, not filenames.
  const isImageInput = _fs.default.readFileSync(assetInfo.files[0]);`

function patchSource(source, metroVersion, imageSizeVersion) {
  if (metroVersion !== EXPECTED_METRO || imageSizeVersion !== EXPECTED_IMAGE_SIZE) {
    throw new Error(
      `Review the Metro image-size compatibility patch before upgrading: expected Metro ${EXPECTED_METRO} with image-size ${EXPECTED_IMAGE_SIZE}; found ${metroVersion} with ${imageSizeVersion}.`
    )
  }
  const occurrences = text => source.split(text).length - 1
  if (occurrences(PATCHED) === 1 && occurrences(ORIGINAL) === 0) return source
  if (occurrences(ORIGINAL) !== 1 || occurrences(PATCHED) !== 0) {
    throw new Error(
      'Unexpected Metro Assets.js source. Refusing to apply the image-size compatibility patch.'
    )
  }
  return source.replace(ORIGINAL, PATCHED)
}

function findPackage(entry, name) {
  let directory = path.dirname(entry)
  while (directory !== path.dirname(directory)) {
    const manifest = path.join(directory, 'package.json')
    if (fs.existsSync(manifest)) {
      const data = JSON.parse(fs.readFileSync(manifest, 'utf8'))
      if (data.name === name) return data
    }
    directory = path.dirname(directory)
  }
  throw new Error(`Could not locate ${name}'s package manifest.`)
}

function applyPatch() {
  const localRequire = createRequire(path.join(__dirname, '..', 'package.json'))
  const metroManifest = localRequire.resolve('metro/package.json')
  const metro = JSON.parse(fs.readFileSync(metroManifest, 'utf8'))
  const metroRequire = createRequire(metroManifest)
  const imageSize = findPackage(metroRequire.resolve('image-size'), 'image-size')
  const assetsFile = path.join(path.dirname(metroManifest), 'src', 'Assets.js')
  const source = fs.readFileSync(assetsFile, 'utf8')
  const patched = patchSource(source, metro.version, imageSize.version)
  if (source !== patched) fs.writeFileSync(assetsFile, patched)
  console.log(
    `Metro image-size compatibility: ${source === patched ? 'already applied' : 'applied'} (Metro ${metro.version}, image-size ${imageSize.version}).`
  )
}

if (require.main === module) applyPatch()
module.exports = { applyPatch, patchSource, ORIGINAL, PATCHED }
