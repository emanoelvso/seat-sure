# Validation: API Test Determinism

**Verdict**: PASS
**Date**: 2026-10-11
**Spec**: `.specs/features/api-test-determinism/spec.md`
**Diff range**: `b6e89df..4093783` (6 commits, branch `fix/api-test-determinism`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Iteration**: re-verify 1/3. Iteration 0 (`b6e89df..aa189f5`) was FAIL: surviving mutant M6, which meant the double-close edge case had no test. Commit 4093783 (T6) fixes it, and M6 is now killed.

All 13 ACs (TDET-01..13) have evidence and pass. Both spec edge cases are now tested. One spec-precision gap stays open on purpose: the TDET-09 wording (see Gap 2). The spec is not being re-specified, and this gap does not block.

---

## Scope Check

- `git diff b6e89df..4093783 --name-only`: 15 files. 13 are under `apps/api/src/**/__test__/` or `apps/api/test/`, and 2 are under `.specs/`. No production file changed. Command evidence: `grep -v "/__test__/\|^apps/api/test/\|^\.specs/"` over the name list prints nothing.
- `test/data-sources.teardown.ts` lists `billing, catalog, identity, notifications, ticketing, user-profile`. This matches the six `TypeOrmPersistenceModule.forRoot({ name })` values in `src/module/*/persistence/*-persistence.module.ts`.

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | 7428665 |
| T2 | ✅ Done | 9101949 |
| T3 | ✅ Done | 9aa8520 |
| T4 | ✅ Done | 2072602 |
| T5 | ✅ Done | aa189f5 (docs only, "not reproduced") |
| T6 | ✅ Done | 4093783: verifier fix for M6 (double-close test) |

---

## Spec-Anchored Acceptance Criteria

| ID | Criterion | Spec-defined outcome | `file:line` + assertion / evidence | Result |
| -- | --------- | -------------------- | ---------------------------------- | ------ |
| TDET-01 | `description` ≤ 100 for every row | length ≤ 100 | `apps/api/src/module/catalog/__test__/integration/event-factory.spec.ts:13,17`: `row.description!.length > 100` filter, then `expect(tooLong).toHaveLength(0)`. Plus `:23`: `expect(eventFactory.build().description).toBe('d'.repeat(100))` with a 150-char generator. Implementation: `factory/event.factory.ts:18` `.slice(0, MAX_TEXT_LENGTH)` with `:8` `= 100` | ✅ PASS |
| TDET-02 | `name` ≤ 100 for every row | length ≤ 100 | `event-factory.spec.ts:13,17` (`row.name!.length > 100`). Plus `:29`: `expect(eventFactory.build().name).toBe('n'.repeat(100))`. Implementation: `event.factory.ts:16` | ✅ PASS |
| TDET-03 | 10,000 rows → zero over-limit rows | 0 rows > 100 | `event-factory.spec.ts:10,16,17`: `buildList(10_000)`, `expect(rows).toHaveLength(10_000)`, `expect(tooLong).toHaveLength(0)` | ✅ PASS |
| TDET-04 | No expected value from `new Date()`/`Date.now()` in the update-my-profile spec, except the JWT expiry | Only the JWT `exp` may read the wall clock | `grep -nE "new Date\(\|Date\.now"` on `user-profile/__test__/e2e/update-my-profile/update-my-profile.spec.ts` returns only `:115` `exp: Math.floor(Date.now() / 1000) + 900` (JWT) and `:297` `NOW = new Date('2031-03-15T23:00:00.000Z')` (fixed literal). The wall-clock test was replaced at `:303-317` and formats `NOW`, not `new Date()`. Independent check: the 8 user-profile suites (138 tests) pass with the global `Date` shifted to 09:59:58 UTC in scratch | ✅ PASS |
| TDET-05 | Fixed `now` 2031-03-15T23:00Z, `birthDate` 2031-03-16, Pacific/Kiritimati → accepted | Service resolves and saves `2031-03-16` | `update-my-profile.spec.ts:309-316`: `userProfileService.updateMyProfile(userId, {...birthDate: today}, NOW)`, then `expect(saved.birthDate).toBe('2031-03-16')`. The zone is Kiritimati via `:82` and `afterEach` at `:299-301`. Also covered at `:319-329` | ✅ PASS |
| TDET-06 | No `setTimeout`/sleep in the repository spec | No sleep | `grep -nE "setTimeout\|sleep\|setInterval\|delay"` on `user-profile/__test__/integration/user-profile-user-repository.spec.ts`: 0 matches | ✅ PASS |
| TDET-07 | `updatedAt` seeded to 2000-01-01T00:00:00Z → stored value is later | stored > 946684800000 | `user-profile-user-repository.spec.ts:164-167` seeds via knex. `:172`: `expect(after.getTime()).toBeGreaterThan(seeded.getTime())` | ✅ PASS |
| TDET-08 | `pnpm --filter api test` exits ≤ 5 s after the last result, without `--forceExit` | exit tail ≤ 5 s | Iteration 1 at 4093783 (`pnpm --filter api test`, pipefail): exit 0, 53/53 suites, 598/598 tests. "Ran all test suites." at 1791741015.56, pipe closed at 1791741015.70, a tail of about 0.14 s. No "did not exit" line | ✅ PASS (see O1) |
| TDET-09 | `--detectOpenHandles` reports zero open handles | 0 handles | Iteration 0 run (`jest --config ./test/jest.e2e.ts --runInBand --detectOpenHandles`): 52/52 suites and 596/596 tests pass, with no "open handle" output and a tail of about 0.1 s | ✅ PASS (⚠️ Spec-precision gap, Gap 2, open) |
| TDET-10 | Scripts contain no `--forceExit` | absent | `grep -rn forceExit apps/api` (excluding node_modules), root `package.json`, and `.github`: 0 matches. `apps/api/package.json:19` `"test": "jest --config ./test/jest.e2e.ts --runInBand"` | ✅ PASS |
| TDET-11 | 3 consecutive full runs pass and terminate | 3× exit 0 | Iteration 0 (aa189f5): 3 back-to-back runs, each 52/52 and 596/596, tail ≤ 0.15 s, 0 "did not exit" lines. Iteration 1 (4093783): the run on the final tree passed 53/53 and 598/598 with a tail of about 0.14 s. The run just before it hit an unrelated 5 s timeout under host load (O6) | ✅ PASS |
| TDET-12 | 20 isolated profile runs pass with no HTTP parse error | 20/20 pass | Iteration 0 loop of 20 runs of `jest --config ./test/jest.e2e.ts --runInBand --testPathPatterns=user-profile` (scratch at aa189f5): every run `Tests: 138 passed, 138 total`, with 0 matches for `parse error\|HPE_\|did not exit`. T6 adds a suite under `user-profile/`, and it passed in the full runs | ✅ PASS |
| TDET-13 | IF it reproduces THEN record the cause and fix | Conditional | It did not reproduce (TDET-12). `spec.md` Assumptions row "HTTP parsing error" records "Not reproduced" | ✅ PASS (vacuous) |

**Status**: ✅ All 13 ACs covered. ⚠️ 1 spec-precision gap noted (TDET-09, kept open on purpose).

---

## Edge Cases

- [x] `faker.lorem.sentence()` > 100 → truncated to 100. Covered by `event-factory.spec.ts:20-24` (deterministic, mocked 150-char input).
- [x] A second close SHALL NOT throw. Covered by `apps/api/src/module/user-profile/__test__/integration/data-sources-teardown.spec.ts:35-36`: `await expect(destroyDataSources(module)).resolves.toBeUndefined()`, run after `:30-32` has already closed the source (`expect(dataSource.isInitialized).toBe(false)`). The skip path for absent sources is exercised at `:24-33`, where the module has only `user-profile`.

---

## Discrimination Sensor

Scratch: temporary `git worktree add --detach /tmp/tdet-scratch*` (iteration 0 at aa189f5, iteration 1 at 4093783), each set up with `pnpm install --frozen-lockfile` and copied `.env` and `.env.test` (DB `seat-sure-determinism`). All were removed with `git worktree remove --force`. The real tree's `git status --porcelain` was identical before and after each sensor run.

| # | File:line | Mutation | Tests run | Result |
| - | --------- | -------- | --------- | ------ |
| M1 | `catalog/__test__/factory/event.factory.ts:18` | Removed `.slice(0, MAX_TEXT_LENGTH)` from `description` | `event-factory` | ✅ Killed (3/3 runs). The `:20` truncation test always fails, and the 10k test also failed in 1 of 3 runs |
| M2 | `event.factory.ts:16` | Removed `.slice(...)` from `name` | `event-factory` | ✅ Killed (`:26` truncation test) |
| M3 | `event.factory.ts:8` | Off-by-one: `MAX_TEXT_LENGTH = 101` | `event-factory` | ✅ Killed (2 tests fail) |
| M4 | `user-profile/persistence/repository/user-profile-user.repository.ts:66` | `.set(data)` → `.set({ ...data, updatedAt: () => '"updatedAt"' })` (no refresh) | `user-profile-user-repository` | ✅ Killed: `Expected: > 946684800000, Received: 946684800000` |
| M5 | `apps/api/test/data-sources.teardown.ts:10` | Dropped `'notifications'` from `DATA_SOURCE_NAMES` | `identity-api` | ✅ Detected by the TDET-08 measure: "Jest did not exit one second after the test run has completed.", with a tail of about 9.85 s against 0.09 s for an unmutated control. Exit code is still 0 (see O1) |
| M5b | same as M5 | same, run with `--detectOpenHandles` | `identity-api` | ⚠️ Not detected by the TDET-09 check: no open handle reported, and the process still hung about 9.8 s (Gap 2, spec-precision) |
| M6 | `apps/api/test/data-sources.teardown.ts:25` | Removed the `if (dataSource.isInitialized)` guard | `data-sources-teardown` (at 4093783) | ✅ **Killed**: `does not throw when called a second time` fails with `Rejected to value: [CannotExecuteNotConnectedError ...]`. It survived in iteration 0 |
| M7 | `apps/api/test/data-sources.teardown.ts:22` | Removed the `UnknownElementException` → `continue` skip | `data-sources-teardown` | ✅ Killed: both tests fail |

Unmutated control at 4093783: `data-sources-teardown` passes 2/2.

**Sensor depth**: lightweight+ (7 behavior mutants). Not a P0 path.
**Result**: 7/7 behavior mutants killed or detected by their AC measure. M5b is a weakness of TDET-09's check (a spec issue), not of the tests. **PASS ✅**

---

## Gate Check

- **Full (iteration 1, 4093783)**: `pnpm --filter api test` passed 53/53 suites and 598/598 tests, exit 0, no "did not exit" warning, tail of about 0.14 s. A run just before it failed 1 test, `log-in.spec.ts:380` AUTH-35 "Exceeded timeout of 5000 ms", under host load average about 12. That suite is outside the diff, and it passed 3/3 when re-run in isolation (O6).
- **Full (iteration 0, aa189f5)**: 3 consecutive runs, each 52/52 and 596/596.
- **Build**: `pnpm --filter api lint:check` exit 0. `pnpm --filter api build` exit 0 (iteration 0. T6 only adds a spec file).
- **Quick**: 20× `--testPathPatterns=user-profile`, 138/138 each (iteration 0).
- **Test count before feature**: 593 (derived from the diff)
- **Test count after feature**: 598
- **Delta**: +5 (3 factory tests and 2 teardown tests; `update-my-profile` replaced 1 test). No test deleted without replacement, and no assertion weakened.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (only test code; 7 hand-rolled teardown loops replaced by one helper) |
| No scope creep | ✅ |
| Matches patterns | ✅ (`@testInfra/` alias, factory style) |
| Spec-anchored outcome check | ✅ (exact values: `'d'.repeat(100)`, `'2031-03-16'`, `> seeded`, `.resolves.toBeUndefined()`) |
| Per-layer coverage expectation | ✅ (both spec edge cases tested) |
| Every test maps to a spec requirement | ✅ (`:303-317` maps to TDET-05, but see O2) |
| Documented guidelines followed | none found for test infra; strong defaults applied |

### Open spec-precision gap (non-blocking)

- **Gap 2: the check in TDET-09 cannot catch the leak class this feature fixes.** With a module `DataSource` (pg pool) leaked on purpose, `--detectOpenHandles` reports zero handles (M5b), so TDET-09 passes vacuously. The orchestrator left the wording unchanged on purpose. If the spec is revised, TDET-09 should require no "Jest did not exit one second after the test run has completed" line instead.

### Observations (non-blocking)

- **O1**: A leak regression is not gated. With a leaked `DataSource` (M5), Jest still exits 0 and only prints a warning plus about 10 s of delay. TDET-08 is checked only by human observation, so CI would not fail on a regression.
- **O2**: `update-my-profile.spec.ts:303-317` duplicates `:319-329`: same input `2031-03-16`, same `NOW`, same assertion. `:315` `expect(today).toBe('2031-03-16')` asserts `Intl` formatting, not app behavior.
- **O3**: The 10,000-row test (TDET-03) catches a description-slice regression only some of the time (1 of 3 runs in M1). The deterministic truncation tests (`:20-30`) are what reliably guard TDET-01 and TDET-02.
- **O4**: `data-sources-teardown.spec.ts:35` relies on `:24` having run first. Run on its own (for example with `-t "second time"`), it calls the helper on an open source and would pass even without the guard. It discriminates only in file order, which is how the suite runs under `--runInBand`.
- **O5**: The new teardown spec lives under `user-profile/__test__/integration/` although it tests the shared `apps/api/test/` helper. The location is acceptable, given the jest `testMatch` and the lint rule on `factory/` folders.
- **O6 (out of scope)**: `identity/__test__/e2e/log-in/log-in.spec.ts:380` (AUTH-35 lockout) hit the default 5 s Jest timeout once under heavy host load (load average about 12, with other sessions running suites). That test is not in this diff, and it passed in every other run. It is a candidate for a separate todo entry (an explicit timeout, or fewer bcrypt rounds in tests).

---

## Fix Plans

None blocking. Fix 1 from iteration 0 is done in T6 (4093783), and M6 is now killed. Gap 2 is kept as a noted spec-precision gap at the orchestrator's decision.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| TDET-01..08, 10..13 | Verified (author) | ✅ Verified (independent) |
| TDET-09 | Verified (author) | ✅ Verified, with a ⚠️ spec-precision gap (non-discriminating check) |
| Edge case: double close | ❌ Needs test (iteration 0) | ✅ Verified (T6) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 13/13 ACs matched the spec outcome, with 1 spec-precision gap noted (TDET-09)
**Sensor**: 7/7 behavior mutants killed or detected (M6 is now killed)
**Gate**: 598/598 on the final tree, exit 0 with a tail of about 0.14 s; lint and build clean; 20/20 profile runs

**What works**: The factory caps both fields. The profile tests are clock-independent. The `updatedAt` test discriminates without a sleep. The suite exits by itself about 0.1 s after the last result, with no `--forceExit`. The teardown helper is idempotent and tested. No production code changed.

**Next steps**: Optional: reword TDET-09 in a future spec revision, and log O6 (AUTH-35 timeout under load) as a separate todo.
