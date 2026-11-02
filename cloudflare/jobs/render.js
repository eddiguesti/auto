import JSZip from 'jszip'
import { nativeManuscriptChapters } from '../api/writing-manuscript.js'

const escape = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[character]
  )

export function audiobookText(rows, name = 'My') {
  let text = `${name}'s Life Story. An Autobiography.\n\n`
  for (const chapter of nativeManuscriptChapters(rows)) {
    const stories = rows.filter(row => row.chapter_id === chapter.id && row.answer?.trim())
    if (!stories.length) continue
    text += `Chapter: ${chapter.title}. ${chapter.subtitle || ''}.\n\n`
    text += stories.map(row => row.answer.trim()).join('\n\n') + '\n\n'
  }
  return text + 'The End. Created with Easy Memoir.'
}

// EPUB 3, with no remote resources or executable HTML. Photos are not embedded,
// matching the current Node publisher. XML/HTML text is escaped at every boundary.
export async function renderEpub(rows, name, { id, now = new Date() }) {
  const zip = new JSZip(),
    contents = []
  const title = `${name || 'My'}'s Life Story`
  const xhtml = (heading, body) =>
    `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>${escape(heading)}</title><meta charset="utf-8"/></head><body>${body}</body></html>`
  contents.push({ title: 'Title Page', body: `<h1>${escape(title)}</h1><p>An Autobiography</p>` })
  for (const chapter of nativeManuscriptChapters(rows)) {
    const stories = rows.filter(row => row.chapter_id === chapter.id && row.answer?.trim())
    if (!stories.length) continue
    contents.push({
      title: chapter.title,
      body:
        `<h1>${escape(chapter.title)}</h1><p>${escape(chapter.subtitle)}</p>` +
        stories
          .map(row =>
            row.answer
              .split(/\n\n+/)
              .map(part => `<p>${escape(part.trim()).replaceAll('\n', '<br/>')}</p>`)
              .join('')
          )
          .join('')
    })
  }
  contents.push({
    title: 'The End',
    body: '<p>Every life is a story worth telling.</p><p>Created with EasyMemoir</p>'
  })
  // EPUB requires the first entry, mimetype, to be uncompressed.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
  )
  for (const [index, item] of contents.entries())
    zip.file(`OEBPS/chapter${index}.xhtml`, xhtml(item.title, item.body))
  zip.file(
    'OEBPS/nav.xhtml',
    `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>${contents.map((item, index) => `<li><a href="chapter${index}.xhtml">${escape(item.title)}</a></li>`).join('')}</ol></nav></body></html>`
  )
  const modified = new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z')
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${escape(id)}</dc:identifier><dc:title>${escape(title)}</dc:title><dc:creator>${escape(name || 'My')}</dc:creator><dc:language>en</dc:language><dc:publisher>EasyMemoir</dc:publisher><meta property="dcterms:modified">${modified}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${contents.map((_, index) => `<item id="chapter${index}" href="chapter${index}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${contents.map((_, index) => `<itemref idref="chapter${index}"/>`).join('')}</spine></package>`
  )
  return zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
}
