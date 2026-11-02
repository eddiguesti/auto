import { promptLibrary } from '../../services/api/db/seeds/prompts.js'
import { collectionsData, collectionItemsData } from '../../services/api/db/seeds/collections.js'
import { achievementDefinitions } from '../../services/api/db/seeds/achievements.js'

// Import only the static arrays. PostgreSQL seed functions are never invoked.
const promptColumns = [
  'id',
  'prompt_type',
  'prompt_category',
  'prompt_text',
  'prompt_hint',
  'linked_chapter_id',
  'linked_question_id',
  'era_specific',
  'requires_person_mention',
  'requires_place_mention',
  'personalization_template',
  'preferred_day_of_week',
  'min_streak_days',
  'difficulty_level',
  'estimated_minutes'
]
const collectionColumns = [
  'id',
  'collection_key',
  'collection_name',
  'collection_description',
  'collection_icon',
  'required_items',
  'reward_artwork_prompt',
  'display_order'
]
const itemColumns = [
  'id',
  'collection_id',
  'item_key',
  'item_name',
  'completion_type',
  'completion_criteria',
  'display_order'
]
// The UI moved these existing questions into dedicated chapters. Resolve the
// legacy static catalog references explicitly; never invent placeholder rows.
const criteria = row => {
  if (
    row.chapter_id === 'young-adulthood' &&
    ['meeting-partner', 'wedding-day'].includes(row.question_id)
  )
    return { ...row, chapter_id: 'love-relationships' }
  if (row.chapter_id === 'young-adulthood' && row.question_id === 'first-home-together')
    return { ...row, chapter_id: 'home-places', question_id: 'first-home-own' }
  return row
}
const promptRows = promptLibrary.map((row, index) => [
  index + 1,
  row.prompt_type,
  row.prompt_category,
  row.prompt_text,
  row.prompt_hint || null,
  criteria({ chapter_id: row.linked_chapter_id, question_id: row.linked_question_id }).chapter_id ||
    null,
  row.linked_question_id || null,
  row.era_specific ? 1 : 0,
  row.requires_person_mention ? 1 : 0,
  row.requires_place_mention ? 1 : 0,
  row.personalization_template || null,
  row.preferred_day_of_week ?? null,
  row.min_streak_days || 0,
  row.difficulty_level || 1,
  row.estimated_minutes || 5
])
const collectionRows = collectionsData.map((row, index) =>
  collectionColumns.map(column => (column === 'id' ? index + 1 : row[column]))
)
const itemRows = collectionItemsData.map((row, index) => [
  index + 1,
  collectionsData.findIndex(collection => collection.collection_key === row.collection_key) + 1,
  row.item_key,
  row.item_name,
  row.completion_type,
  JSON.stringify(criteria(row.completion_criteria)),
  row.display_order
])
const catalogs = [
  ['prompt_library', promptColumns, promptRows, 'id'],
  ['collections', collectionColumns, collectionRows, 'id'],
  ['collection_items', itemColumns, itemRows, 'id'],
  [
    'game_achievement_definitions',
    ['achievement_key', 'definition'],
    achievementDefinitions
      .map(row => [row.key, JSON.stringify(row)])
      .sort((a, b) => a[0].localeCompare(b[0])),
    'achievement_key'
  ]
]

export function buildNativeGameSeedStatements() {
  return catalogs.flatMap(([table, columns, rows]) =>
    rows.map(params => ({
      sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      params
    }))
  )
}

// Explicit initialization only: there is no public seed endpoint and reads do
// not quietly mutate a production catalog. Existing matching seeds are safe;
// partial or conflicting catalogs are refused without overwriting their rows.
export async function seedNativeGameCatalog(db) {
  async function inspect() {
    let empty = true,
      matching = true
    for (const [table, columns, expected, order] of catalogs) {
      const { results } = await db
        .prepare(`SELECT ${columns.join(', ')} FROM ${table} ORDER BY ${order}`)
        .all()
      if (results.length) empty = false
      if (
        JSON.stringify(results.map(row => columns.map(column => row[column]))) !==
        JSON.stringify(expected)
      )
        matching = false
    }
    return { empty, matching }
  }
  const before = await inspect()
  if (before.matching)
    return { alreadySeeded: true, prompts: 108, collections: 8, items: 41, achievements: 33 }
  if (!before.empty) throw new Error('GAME_CATALOG_NOT_EMPTY_OR_MATCHING')
  try {
    await db.batch(
      buildNativeGameSeedStatements().map(query => db.prepare(query.sql).bind(...query.params))
    )
  } catch (error) {
    if (!(await inspect()).matching) throw error
  }
  if (!(await inspect()).matching) throw new Error('GAME_CATALOG_VERIFICATION_FAILED')
  return { alreadySeeded: false, prompts: 108, collections: 8, items: 41, achievements: 33 }
}

export { achievementDefinitions }
