// Test/bootstrap DDL helper. Semicolons inside quoted values or a SQLite trigger
// body are not statement separators. Production SQL is still prepared explicitly.
export function sqlStatements(sql) {
  const statements = []
  let start = 0,
    quote = null,
    lineComment = false,
    blockComment = false,
    word = '',
    words = [],
    trigger = false,
    depth = 0
  const finishWord = () => {
    if (!word) return
    const value = word.toUpperCase()
    words.push(value)
    if (
      words[0] === 'CREATE' &&
      (words[1] === 'TRIGGER' ||
        (['TEMP', 'TEMPORARY'].includes(words[1]) && words[2] === 'TRIGGER'))
    )
      trigger = true
    if (trigger) {
      if (value === 'BEGIN' || value === 'CASE') depth++
      else if (value === 'END') depth--
    }
    word = ''
  }
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i],
      next = sql[i + 1]
    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        i++
      }
      continue
    }
    if (quote) {
      if (char === quote) {
        if (next === quote) i++
        else quote = null
      }
      continue
    }
    if (char === '-' && next === '-') {
      finishWord()
      lineComment = true
      i++
      continue
    }
    if (char === '/' && next === '*') {
      finishWord()
      blockComment = true
      i++
      continue
    }
    if (["'", '"', '`', '['].includes(char)) {
      finishWord()
      quote = char === '[' ? ']' : char
      continue
    }
    if (/[A-Za-z0-9_]/.test(char)) {
      word += char
      continue
    }
    finishWord()
    if (char === ';' && (!trigger || depth === 0)) {
      const statement = sql.slice(start, i + 1).trim()
      if (statement) statements.push(statement)
      start = i + 1
      words = []
      trigger = false
      depth = 0
    }
  }
  finishWord()
  const tail = sql.slice(start).trim()
  if (tail && tail.replace(/--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\//g, '').trim()) statements.push(tail)
  if (quote || blockComment || depth !== 0) throw new Error('Incomplete SQL migration')
  return statements
}
