# API Test Determinism Specification

Source: GitHub issue #48 (todo.md L104, L152, L230).

## Problem Statement

Three API test defects make runs nondeterministic or non-terminating: the `eventFactory` can generate a `description` longer than the 100-character column (~0.25% of runs fail the 101-event e2e test); two user-profile tests depend on wall clocks and a 20 ms sleep; and Jest needs open handles closed so it exits without `--forceExit`. An intermittent HTTP parsing error in the profile tests is unexplained.

## Goals

- [ ] `eventFactory` output always fits the `Event` column limits.
- [ ] No user-profile test reads the wall clock for a value the server also computes, and none sleeps to order timestamps.
- [ ] `pnpm --filter api test` terminates by itself, with no `--forceExit`, on repeated focused and full runs.
- [ ] The profile-test HTTP parsing error has a recorded root cause and a fix, or a documented "not reproduced" result.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Injecting a clock into `UserProfileResolver` | Issue asks for the fixed-`now` service path; production code stays unchanged |
| Other todo.md API items (timestamptz, ValidationPipe, index) | Not in the three source TODOs |
| Web test flakiness (notification-card HoverShowsGradient) | Different app and cause |
| Adding `--forceExit` or `--detectOpenHandles` to the scripts | The goal is to remove the need, not mask it |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Already-satisfied items | `package.json` and `test/` contain no `forceExit` today; the zone-ahead and zone-behind "today" tests already use the fixed `NOW` service path. Only the wall-clock test `accepts the current date in the app time zone` remains | Verified by reading source | y |
| Fix for the wall-clock e2e test | Replace it with the fixed-`now` service path; HTTP coverage of the same outcome stays through a date that is far from "today" | The resolver calls `new Date()` and the test cannot freeze it | n |
| Fix for the `updatedAt` sleep | Seed `updatedAt` to a fixed past timestamp with knex, then assert the repository moves it past that value | `DefaultEntity` stamps `new Date()` in app code, so a fixed past seed removes the sleep without a clock injection | n |
| Description cap | Cap `description` at 100 and `name` at 100 using a shorter faker source or truncation in the factory | Column is `varchar(100)`; `name` shares the limit | n |
| Open-handle root cause | Unknown until `--detectOpenHandles` runs; tasks start with a diagnosis step whose findings decide the fix | No reproduction yet | n |
| HTTP parsing error | May share a cause with the leaked handles (a closed server or reused connection); if it does not reproduce in 20 isolated runs it is recorded as not reproduced | Seen once | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Event factory fits the schema ⭐ MVP

**User Story**: As a developer, I want `eventFactory` to respect column limits so the 101-event e2e test never fails on random data.

**Why P1**: Direct random CI failure.

**Acceptance Criteria**:

1. The `eventFactory` SHALL produce a `description` of at most 100 characters for every generated row.
2. The `eventFactory` SHALL produce a `name` of at most 100 characters for every generated row.
3. WHEN 10,000 rows are generated THEN the `eventFactory` SHALL produce zero rows whose `name` or `description` exceeds 100 characters.

**Independent Test**: Unit test generating 10,000 rows and asserting both lengths.

---

### P1: Profile tests do not depend on wall clocks ⭐ MVP

**User Story**: As a developer, I want profile tests to pass at any time of day so a midnight run in Kiritimati (UTC+14) cannot fail them.

**Why P1**: Time-of-day flake.

**Acceptance Criteria**:

1. The `update-my-profile` e2e spec SHALL contain no assertion whose expected value is computed from `new Date()` or `Date.now()` except the JWT expiry.
2. WHEN `updateMyProfile` is called with the fixed `now` of 2031-03-15T23:00:00Z and `birthDate` 2031-03-16 in zone Pacific/Kiritimati THEN the service SHALL accept it.
3. The `user-profile-user-repository` spec SHALL contain no `setTimeout` or sleep.
4. WHEN `updateProfile` runs on a row whose `updatedAt` was seeded to 2000-01-01T00:00:00Z THEN the repository SHALL store an `updatedAt` later than that value.

**Independent Test**: Run both specs with the system clock faked near 10:00 UTC; both pass.

---

### P1: Jest exits on its own ⭐ MVP

**User Story**: As a developer, I want the API suite to terminate without `--forceExit` so leaked connections and servers are visible.

**Why P1**: Leaked handles hide real resource bugs and slow CI.

**Acceptance Criteria**:

1. WHEN `pnpm --filter api test` finishes THEN the Jest process SHALL exit within 5 seconds of the last test result without `--forceExit`.
2. WHEN `pnpm --filter api exec jest --config ./test/jest.e2e.ts --runInBand --detectOpenHandles` runs THEN Jest SHALL report zero open handles.
3. The API test scripts SHALL NOT contain `--forceExit`.
4. WHEN the full suite runs 3 consecutive times THEN each run SHALL pass and terminate without `--forceExit`.

**Independent Test**: Run the full suite 3 times with `timeout 600`; each exits 0.

---

### P2: HTTP parsing error is explained

**User Story**: As a developer, I want the intermittent profile-test HTTP parsing error explained so it stops recurring.

**Why P2**: Seen once, may be fixed by P1 handle cleanup.

**Acceptance Criteria**:

1. WHEN the profile specs run 20 times in isolation after the fixes THEN every run SHALL pass with no HTTP parse error.
2. IF the error reproduces THEN the cause and fix SHALL be recorded in this spec's Assumptions table.

**Independent Test**: A loop of 20 isolated `--testPathPatterns=user-profile` runs.

---

## Edge Cases

- IF `faker.lorem.sentence()` returns more than 100 characters THEN the `eventFactory` SHALL truncate it to 100.
- IF a test closes `app` and the DataSource THEN a second close in `afterAll` SHALL NOT throw.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TDET-01 | P1: Event factory fits the schema | Done (T1) | Verified |
| TDET-02 | P1: Event factory fits the schema | Done (T1) | Verified |
| TDET-03 | P1: Event factory fits the schema | Done (T1) | Verified |
| TDET-04 | P1: Profile tests do not depend on wall clocks | Done (T2) | Verified |
| TDET-05 | P1: Profile tests do not depend on wall clocks | Done (T2) | Verified |
| TDET-06 | P1: Profile tests do not depend on wall clocks | Tasks | Pending |
| TDET-07 | P1: Profile tests do not depend on wall clocks | Tasks | Pending |
| TDET-08 | P1: Jest exits on its own | Tasks | Pending |
| TDET-09 | P1: Jest exits on its own | Tasks | Pending |
| TDET-10 | P1: Jest exits on its own | Tasks | Pending |
| TDET-11 | P1: Jest exits on its own | Tasks | Pending |
| TDET-12 | P2: HTTP parsing error is explained | Tasks | Pending |
| TDET-13 | P2: HTTP parsing error is explained | Tasks | Pending |

**Coverage:** 13 total, 13 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] 10,000 generated events never exceed column limits.
- [ ] Profile specs pass with the clock faked at 10:00 UTC.
- [ ] Three consecutive full API runs exit 0 without `--forceExit`.
