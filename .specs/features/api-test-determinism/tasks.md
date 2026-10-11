# API Test Determinism Tasks

## Execution Protocol

Use tlc-spec-driven: one verified atomic commit per task (apps/api only, succinct, no attribution), then independent verifier. Planning only in this session; no implementation authorized yet. Five tasks fit one inline batch.

Status: In progress (T1–T3 done).

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Test factory | unit | 10,000 rows within limits | `catalog/__test__/integration/event-factory.spec.ts` (lint allows only `*.factory.ts` in `factory/`) | `pnpm --filter api exec jest --config ./test/jest.shared.ts --rootDir . event-factory` |
| Profile e2e / repository | e2e, integration | Fixed clock, no sleep, real database | user-profile `__test__` | `pnpm --filter api test --testPathPatterns=user-profile` |
| Suite lifecycle | integration | Exit without forceExit, zero open handles | full suite | `pnpm --filter api test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| quick | Factory or profile task | `pnpm --filter api test --testPathPatterns=user-profile` |
| full | Handle and final tasks | `pnpm --filter api test` (3 runs) |
| build | Final integration | `pnpm --filter api lint:check`; `pnpm --filter api build` |

## Execution Plan

### Phase 1: Deterministic tests

```text
T1 → T2 → T3 → T4 → T5
```

## Task Breakdown

### T1: Bound eventFactory strings ✅

**Where**: `apps/api/src/module/catalog/__test__/factory/event.factory.ts`
**Depends on**: None
**Requirement**: TDET-01, TDET-02, TDET-03
**Tests**: unit
**Gate**: quick
**Done when**:
- [x] `name` and `description` are capped at 100 characters; a new spec generates 10,000 rows and asserts both lengths, and the 101-event e2e test still passes.

### T2: Use the fixed clock in the update-my-profile e2e ✅

**Where**: `apps/api/src/module/user-profile/__test__/e2e/update-my-profile/update-my-profile.spec.ts`
**Depends on**: T1
**Requirement**: TDET-04, TDET-05
**Tests**: e2e
**Gate**: quick
**Done when**:
- [x] The test `accepts the current date in the app time zone` uses the fixed-`now` service path; the spec passes with the system clock faked at 10:00 UTC.

### T3: Remove the sleep from the updatedAt test ✅

**Where**: `apps/api/src/module/user-profile/__test__/integration/user-profile-user-repository.spec.ts`
**Depends on**: T2
**Requirement**: TDET-06, TDET-07
**Tests**: integration
**Gate**: quick
**Done when**:
- [x] `refreshes updatedAt` seeds `updatedAt` to 2000-01-01T00:00:00Z via knex, has no `setTimeout`, and asserts the stored value is later.

### T4: Diagnose and close leaked Jest handles

**Where**: `apps/api/test/`, `apps/api/src/**/__test__/`
**Depends on**: T3
**Requirement**: TDET-08, TDET-09, TDET-10, TDET-11
**Tests**: integration
**Gate**: full
**Done when**:
- [ ] `--detectOpenHandles` output is recorded, each leaked handle (DataSource, knex `testDbClient`, HTTP server, Nest app) is closed in its owning `afterAll`, `--detectOpenHandles` reports zero handles, and the full suite exits without `--forceExit` 3 times in a row.

### T5: Investigate the HTTP parsing error

**Where**: `apps/api/src/module/user-profile/__test__/`, this spec's Assumptions table
**Depends on**: T4
**Requirement**: TDET-12, TDET-13
**Tests**: e2e
**Gate**: full
**Done when**:
- [ ] 20 isolated `--testPathPatterns=user-profile` runs pass with no parse error; if it reproduces, the cause and fix are recorded in the Assumptions table.
