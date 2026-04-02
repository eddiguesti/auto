/**
 * Add is_admin column to users table.
 * Defaults to false — admins are promoted manually via SQL.
 */

export async function up(pgm) {
  pgm.sql('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false')
}

export async function down(pgm) {
  pgm.sql('ALTER TABLE users DROP COLUMN IF EXISTS is_admin')
}
