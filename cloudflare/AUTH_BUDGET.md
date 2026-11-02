# Explicit authentication budgets for workers.dev staging

The default native API policy remains `AUTH_RATE_MODE=trusted-ingress` (also
selected when the setting is absent). It requires the signed custom-domain
identity boundary documented in [INGRESS.md](INGRESS.md). A missing or rejected
identity cannot fall back to an IP header, `request.cf`, an account name or an
unprotected route.

A new, explicitly selected policy supports a fresh workers.dev staging account
without claiming a trusted network identity:

```json
{
  "AUTH_RATE_MODE": "account-budget",
  "AUTH_GLOBAL_RATE_LIMIT_MAX": "120",
  "AUTH_ACCOUNT_RATE_LIMIT_MAX": "10",
  "AUTH_RATE_WINDOW_SECONDS": "900"
}
```

Set these variables on the private API Worker. Leave the frontend's
`AUTH_INGRESS_MODE` unset in this policy; it must not attempt a custom-domain
assertion. Keep the private API without public workers.dev/preview/routes and
forward browser API requests through its frontend service binding. No identity
service binding or ingress secret is needed by the account-budget policy.

The global and account limits share an aligned UTC fixed window, reset at its
next boundary. A limit permits its stated number of attempts, followed by 429
with `Retry-After`; attempts near both sides of a boundary may consume two
windows. The operator variables above default to the shown values. Global max
must be an integer string from 1 to 1000, account max from 1 to global max, and
window seconds from 60 to 3600. Invalid mode/limits return 503. A smaller global
max also requires a compatible account max.

Every public password/recovery request reserves the global D1 budget before
account lookup or expensive password work. Login, registration and forgotten
password additionally reserve a shared SHA-256 key derived from the trimmed,
lowercase email. This key is selected without checking whether an account
exists. Both reservations execute in one atomic primary D1 batch. Malformed or
oversized JSON consumes the global budget; pre-budget JSON parsing has a 16 KiB
ceiling. Rotating email addresses cannot create account rows after the global
budget is exhausted. Counters saturate at limit plus one, avoiding unbounded
counter growth. Expired rows may be deleted using the indexed
`window_started_at` column once they are older than the longest active window.

Verification/reset tokens use only the global budget: raw opaque tokens and
passwords never become rate keys. Authenticated verification resends use both
the global budget and a hashed `user:<id>` budget after full-scope JWT and
revocation checks. Recovery email limits and atomic single-use token handling
remain enforced independently. Both `/api` and `/api/v1`, all covered auth
operations, and every caller share the same global budget.

Public voice demos have a **separate deployment-wide five-attempt/hour budget**.
An admitted demo gets a random, short-lived, single-use voice ticket and its own
90-second coordinator. There is no per-person/network claim. Authenticated
voice keeps its per-user concurrency, lifetime, revocation and daily AI quota
checks.

This policy deliberately trades availability for a strict deployment-wide
ceiling on password CPU and public demo costs. A hostile caller can temporarily
consume the shared allowance or a chosen account's allowance. It does not offer
the fair per-network isolation of a verified custom-domain policy and should be
reviewed before a high-traffic launch. Rejected traffic can still consume D1
requests; these counters are not an edge DDoS service or an invoice hard cap.
The optional native Workers Rate Limiting binding can shed traffic earlier, but
is not the authoritative security counter because its limits are location
scoped. A D1 outage fails authentication and public demos closed with 503.
Neither this mode nor its tests changes bcrypt12, JWT scope, account deletion,
revocation, anti-enumeration recovery responses or provider delivery behavior.

`api/auth-budget-native.test.mjs` exercises actual workerd and D1, including
concurrent global/account reservations, rotating/spoofed headers, both prefixes,
invalid configuration, D1 outages and atomic rollback. Hosted bcrypt CPU and
live provider acceptance still require separate deployment verification.

References: [D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/),
[Workers Rate Limiting scope](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
