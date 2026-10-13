import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { graphql } from './graphql.mjs';

export const BUYER_PASSWORD = 'correct-horse';
const KNOWN_CODE = '123456';

const SIGN_UP = `mutation ($input: SignUpInput!) { signUp(input: $input) { email codeSent } }`;
const VERIFY_EMAIL = `mutation ($input: VerifyEmailInput!) {
  verifyEmail(input: $input) { accessToken expiresAt }
}`;

const unwrap = (result, field) => {
  if (result.errors || !result.data?.[field]) {
    throw new Error(
      `${field} failed (HTTP ${result.status}): ${JSON.stringify(result.errors)}`,
    );
  }
  return result.data[field];
};

// Creates `count` verified buyers through the real sign-up and verification
// flow. The API stores only a bcrypt hash of each code, so the load setup
// replaces it in the identity database with the hash of a known code, then
// verifies by email. Returns one session per buyer.
export const createBuyerSessions = async ({
  baseUrl,
  databaseUrl,
  count,
  concurrency = 10,
}) => {
  const runId = randomUUID().slice(0, 8);
  const knownHash = await bcrypt.hash(KNOWN_CODE, 4);
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();

  const createBuyer = async (index) => {
    const email = `load-${runId}-${index}@example.com`;
    unwrap(
      await graphql(baseUrl, SIGN_UP, {
        input: {
          firstName: 'Load',
          lastName: `Buyer ${index}`,
          email,
          password: BUYER_PASSWORD,
        },
      }),
      'signUp',
    );
    await db.query(
      `UPDATE "IdentityVerificationCode" SET "codeHash" = $2
       WHERE purpose = 'verify_email' AND "consumedAt" IS NULL
         AND "userId" = (SELECT id FROM "IdentityUser" WHERE email = $1)`,
      [email, knownHash],
    );
    const session = unwrap(
      await graphql(baseUrl, VERIFY_EMAIL, {
        input: { email, code: KNOWN_CODE, rememberMe: false },
      }),
      'verifyEmail',
    );
    return {
      email,
      password: BUYER_PASSWORD,
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
    };
  };

  try {
    const sessions = new Array(count);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(concurrency, count) }, async () => {
        while (next < count) {
          const index = next++;
          sessions[index] = await createBuyer(index);
        }
      }),
    );
    return sessions;
  } finally {
    await db.end();
  }
};
