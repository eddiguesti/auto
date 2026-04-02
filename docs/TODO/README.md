# Easy Memoir Improvement Roadmap

**Goal:** Take the webapp from 6.2/10 to 9/10
**Focus:** Security, reliability, architecture, performance, and growth readiness
**Last audit:** 2026-04-02 (full architecture review)

## Scoring Breakdown

| Dimension             | Current | Target | Delta |
| --------------------- | ------- | ------ | ----- |
| Security              | 5/10    | 9/10   | +4    |
| Testing & Reliability | 3/10    | 7/10   | +4    |
| Performance           | 6/10    | 8/10   | +2    |
| Code Quality          | 6/10    | 8/10   | +2    |
| Architecture          | 6/10    | 8/10   | +2    |
| UX & Accessibility    | 6/10    | 8/10   | +2    |
| Product & Growth      | 5/10    | 8/10   | +3    |
| DevEx & Ops           | 7/10    | 8/10   | +1    |

## TODO Files — Work Through in Order

| File                                                                       | Priority | Focus                                                                       |
| -------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| [01_security_and_reliability_todo.md](01_security_and_reliability_todo.md) | URGENT   | Token blacklist, admin auth, rate limiting, fault tolerance, GDPR           |
| [02_data_and_api_todo.md](02_data_and_api_todo.md)                         | HIGH     | Schema migrations, indexes, pagination, API contracts, payments integrity   |
| [03_backend_architecture_todo.md](03_backend_architecture_todo.md)         | HIGH     | Service layer, route cleanup, validation, versioning, async side effects    |
| [04_frontend_architecture_todo.md](04_frontend_architecture_todo.md)       | MEDIUM   | React Query, route split, shared package, component boundaries, bundle size |

## Reference Files — Read for Context

| File                                                                       | Purpose                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [ref_system_architecture_audit.md](ref_system_architecture_audit.md)       | Full audit: current state, strengths, weaknesses, risks            |
| [ref_architecture_issues_register.md](ref_architecture_issues_register.md) | All 20 issues with severity, root cause, and remediation direction |
| [ref_target_architecture.md](ref_target_architecture.md)                   | Target layer model, module boundaries, data flow, API conventions  |
| [ref_refactor_roadmap.md](ref_refactor_roadmap.md)                         | Phased plan with dependencies, quick wins, and risky migrations    |
| [ref_architecture_principles.md](ref_architecture_principles.md)           | Mandatory rules to enforce on all new and modified code            |

## Archived Files

Previous TODO files are in [archive/](archive/).

## Running with Agents

```bash
claude "Read docs/TODO/01_security_and_reliability_todo.md and execute all tasks"
claude "Read docs/TODO/02_data_and_api_todo.md and execute all tasks"
claude "Read docs/TODO/03_backend_architecture_todo.md and execute all tasks"
claude "Read docs/TODO/04_frontend_architecture_todo.md and execute all tasks"
```

## Completion Criteria for 9/10

- [ ] Token revocation durable across server restarts
- [ ] Admin routes protected by centralized middleware
- [ ] Schema managed via migrations only (no runtime DDL)
- [ ] All list endpoints paginated
- [ ] Service layer in place — no business logic in route handlers
- [ ] No direct DB calls in route files
- [ ] API versioned at `/api/v1/`
- [ ] React Query adopted for all server state
- [ ] Single source of truth for chapters (shared package only)
- [ ] External service timeouts on all upstream calls
- [ ] 80%+ backend test coverage
- [ ] Structured logging on every request with request ID and user ID
- [ ] Health check reports DB, Redis, and cron status
