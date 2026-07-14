# Legacy JavaScript migrations

These files are retained only as historical evidence for databases that used
the former `node-pg-migrate` path. They are not executable by current tooling.
All new and deployed schema changes use forward-only SQL files in
`db/migrations/`, tracked by `schema_migrations`.
