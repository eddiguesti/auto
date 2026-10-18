import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { chapters } from '@easy-memoir/shared/chapters'
import { generateInterior, generateCover } from '../services/memoirPrintPdf.js'

const memoir = {
  title: 'Les souvenirs d’Élodie',
  author: 'Élodie Smith',
  stories: [
    {
      chapter_id: chapters[0].id,
      question_id: 'one',
      answer:
        'Je me souviens de ma mère, de mon père et des étés passés en France.\n\nEvery life is a story worth keeping.'
    }
  ]
}
describe('print-ready memoir files', () => {
  it('embeds the French font and generates an A5 interior with counted colour pages and four-page signatures', async () => {
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ZkAAAAASUVORK5CYII=',
      'base64'
    )
    const result = await generateInterior({
      ...memoir,
      photos: [{ filename: 'photo.png', caption: 'Un été en famille' }],
      readPhoto: async () => image
    })
    const document = await PDFDocument.load(result.bytes)
    expect(result.colourPages).toBe(1)
    expect(result.pageCount).toBe(32)
    expect(document.getPageCount()).toBe(result.pageCount)
    expect(
      document
        .getPages()
        .every(
          page =>
            Math.abs(page.getWidth() - (148 * 72) / 25.4) < 0.01 &&
            Math.abs(page.getHeight() - (210 * 72) / 25.4) < 0.01
        )
    ).toBe(true)
    expect(document.getTitle()).toBe(memoir.title)
  })
  it('uses supplier-provided cover dimensions rather than estimating a spine', async () => {
    const bytes = await generateCover({
      ...memoir,
      coverSizing: { expectedWidth: 348, expectedHeight: 250 },
      spine: 12
    })
    const document = await PDFDocument.load(bytes)
    expect(document.getPageCount()).toBe(1)
    expect(document.getPages()[0].getWidth()).toBeCloseTo((348 * 72) / 25.4)
  })
  it('rejects missing photos, unsupported characters and unknown chapters instead of silently dropping content', async () => {
    await expect(
      generateInterior({
        ...memoir,
        photos: [{ filename: 'missing.jpg' }],
        readPhoto: async () => null
      })
    ).rejects.toThrow('unavailable')
    await expect(generateInterior({ ...memoir, title: 'My story 😀' })).rejects.toThrow(
      'cannot render'
    )
    await expect(
      generateInterior({
        ...memoir,
        stories: [{ chapter_id: 'unknown', answer: 'Keep this memory' }]
      })
    ).rejects.toThrow('no text is left out')
  })
  it('rejects a manuscript beyond the package page limit', async () => {
    await expect(
      generateInterior({
        ...memoir,
        stories: [
          {
            ...memoir.stories[0],
            answer: 'These are the memories I want to share with my family. '.repeat(12000)
          }
        ]
      })
    ).rejects.toThrow('200-page package')
  })
  it('rejects oversized PNGs before allocating their decoded pixels', async () => {
    const bytes = Buffer.alloc(24)
    bytes[0] = 0x89
    bytes.writeUInt32BE(100000, 16)
    bytes.writeUInt32BE(100000, 20)
    await expect(
      generateInterior({
        ...memoir,
        photos: [{ filename: 'oversized.png' }],
        readPhoto: async () => bytes
      })
    ).rejects.toThrow('25 megapixels')
  })
})
