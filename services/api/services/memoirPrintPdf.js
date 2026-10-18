import { readFile } from 'node:fs/promises'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { chapters } from '@easy-memoir/shared/chapters'
import { PRINT_PACKAGE } from '../../../packages/shared/payment-catalog.js'
import { ValidationError } from '../utils/errors.js'

const mm = value => (value * 72) / 25.4
const fontPath = new URL('../assets/fonts/NotoSerif-Regular.ttf', import.meta.url)
const black = rgb(0, 0, 0)
export async function printFont(document) {
  document.registerFontkit(fontkit)
  return document.embedFont(await readFile(fontPath), { subset: true })
}

export function wrapText(text, font, size, width) {
  const lines = []
  const widths = new Map()
  const measure = value => {
    if (!widths.has(value)) widths.set(value, font.widthOfTextAtSize(value, size))
    return widths.get(value)
  }
  const space = measure(' ')
  for (const paragraph of text.replace(/\r/g, '').split('\n')) {
    let line = ''
    let lineWidth = 0
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const wordWidth = measure(word)
      if (wordWidth > width) {
        if (line) {
          lines.push(line)
          line = ''
        }
        let part = ''
        for (const character of word) {
          if (part && measure(part + character) > width) {
            lines.push(part)
            part = ''
          }
          part += character
        }
        line = part
        lineWidth = measure(part)
      } else if (line && lineWidth + space + wordWidth > width) {
        lines.push(line)
        line = word
        lineWidth = wordWidth
      } else {
        lineWidth += (line ? space : 0) + wordWidth
        line = line ? `${line} ${word}` : word
      }
    }
    lines.push(line)
  }
  return lines
}

function ensureGlyphs(text, font) {
  const supported = new Set(font.getCharacterSet())
  for (const character of text) {
    if (!/\s/.test(character) && !supported.has(character.codePointAt(0))) {
      throw new ValidationError(
        `The print font cannot render “${character}”. Please replace it before making your proof.`
      )
    }
  }
}

export async function generateInterior({ title, author, stories, photos = [], readPhoto }) {
  if (!stories.some(story => story.answer?.trim()))
    throw new ValidationError('Write some memories before preparing your book.')
  if (
    stories.some(
      story => story.answer?.trim() && !chapters.some(chapter => chapter.id === story.chapter_id)
    )
  )
    throw new ValidationError(
      'A memory has an unrecognised chapter. Please contact support before printing so no text is left out.'
    )
  if (photos.length > PRINT_PACKAGE.maxPhotos)
    throw new ValidationError('Choose up to eight photographs for this package.')
  const document = await PDFDocument.create()
  const font = await printFont(document)
  ensureGlyphs(
    [title, author, ...stories.map(s => s.answer || ''), ...photos.map(p => p.caption || '')].join(
      '\n'
    ),
    font
  )
  const width = mm(148),
    height = mm(210),
    margin = mm(18)
  const contentWidth = width - 2 * margin
  let page, y
  function newPage() {
    if (document.getPageCount() >= PRINT_PACKAGE.maxPages)
      throw new ValidationError(
        'Your memoir exceeds the 200-page package. Shorten it before preparing your proof.'
      )
    page = document.addPage([width, height])
    y = height - margin
    if (document.getPageCount() > 2) {
      const number = String(document.getPageCount())
      page.drawText(number, {
        x: (width - font.widthOfTextAtSize(number, 9)) / 2,
        y: mm(10),
        size: 9,
        font,
        color: black
      })
    }
  }
  function text(value, size = 11, leading = 17, centre = false) {
    for (const line of wrapText(value, font, size, contentWidth)) {
      if (y < margin + leading) newPage()
      if (line)
        page.drawText(line, {
          x: centre ? (width - font.widthOfTextAtSize(line, size)) / 2 : margin,
          y,
          size,
          font,
          color: black
        })
      y -= leading
    }
  }
  newPage()
  y = height * 0.67
  text(title, 24, 32, true)
  y -= 35
  text(author, 12, 19, true)
  newPage()
  y = height * 0.5
  text('A life remembered', 16, 24, true)
  y -= 30
  text('Created with Easy Memoir', 10, 16, true)
  for (const chapter of chapters) {
    const entries = stories
      .filter(s => s.chapter_id === chapter.id && s.answer?.trim())
      .sort((a, b) => a.question_id.localeCompare(b.question_id))
    if (!entries.length) continue
    newPage()
    y -= 25
    text(chapter.title, 19, 28)
    y -= 20
    for (const entry of entries) {
      text(entry.answer)
      y -= 20
    }
  }
  // A separate photo section makes the mono/colour count exact and keeps costs predictable.
  for (const photo of photos) {
    const bytes = await readPhoto(photo.filename)
    if (!bytes)
      throw new ValidationError(
        'One of your chosen photographs is unavailable. Please upload it again.'
      )
    let image
    try {
      if (
        bytes[0] === 0x89 &&
        (bytes.length < 24 || bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > 25000000)
      )
        throw new ValidationError('Choose a photograph smaller than 25 megapixels.')
      image = bytes[0] === 0x89 ? await document.embedPng(bytes) : await document.embedJpg(bytes)
      if (image.width * image.height > 25000000)
        throw new ValidationError('Choose a photograph smaller than 25 megapixels.')
    } catch (error) {
      if (error instanceof ValidationError) throw error
      throw new ValidationError(
        'Print photographs must be JPEG or PNG. Please replace the unsupported image.'
      )
    }
    newPage()
    const availableHeight = height - margin * 2 - 95
    const scale = Math.min(contentWidth / image.width, availableHeight / image.height)
    const w = image.width * scale,
      h = image.height * scale
    page.drawImage(image, { x: (width - w) / 2, y: height - margin - h, width: w, height: h })
    y = height - margin - h - 24
    if (photo.caption) {
      const caption = wrapText(photo.caption, font, 10, contentWidth)
      if (caption.length > 4)
        throw new ValidationError(
          'Photo captions must fit within four lines. Please shorten the caption.'
        )
      text(photo.caption, 10, 15, true)
    }
  }
  while (document.getPageCount() < 32 || document.getPageCount() % 4 !== 0) newPage()
  document.setTitle(title)
  document.setAuthor(author)
  return {
    bytes: Buffer.from(await document.save()),
    pageCount: document.getPageCount(),
    colourPages: photos.length
  }
}

export async function generateCover({ title, author, coverSizing, spine }) {
  const document = await PDFDocument.create()
  const font = await printFont(document)
  const width = mm(coverSizing.expectedWidth),
    height = mm(coverSizing.expectedHeight)
  const page = document.addPage([width, height])
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.13, 0.2, 0.19) })
  const panelCentre = width / 2 + mm(Number(spine) || 0) / 2 + mm(74)
  const cream = rgb(0.96, 0.92, 0.82)
  let y = height * 0.63
  const lines = wrapText(title, font, 23, mm(112))
  if (lines.length > 5) throw new ValidationError('Please shorten your book title.')
  for (const line of lines) {
    page.drawText(line, {
      x: panelCentre - font.widthOfTextAtSize(line, 23) / 2,
      y,
      size: 23,
      font,
      color: cream
    })
    y -= 32
  }
  for (const line of wrapText(author, font, 12, mm(112))) {
    page.drawText(line, {
      x: panelCentre - font.widthOfTextAtSize(line, 12) / 2,
      y: y - 35,
      size: 12,
      font,
      color: cream
    })
    y -= 18
  }
  const backText = 'A life remembered. A story to keep.'
  page.drawText(backText, {
    x: width / 2 - mm(Number(spine) || 0) / 2 - mm(74) - font.widthOfTextAtSize(backText, 10) / 2,
    y: height * 0.45,
    size: 10,
    font,
    color: cream
  })
  document.setTitle(`${title} — print cover`)
  return Buffer.from(await document.save())
}
