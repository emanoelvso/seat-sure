import { randomUUID } from 'crypto';
import {
  INestApplication,
  Injectable,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import {
  CodeSender,
  SendCodeInput,
} from '@identityModule/core/adapter/code-sender.adapter.interface';
import {
  SecurityAlertSender,
  SendSecurityAlertInput,
} from '@identityModule/core/adapter/security-alert-sender.adapter.interface';
import { IdentityModule } from '@identityModule/identity.module';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { UserProfileService } from '@userProfileModule/core/service/user-profile.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

@Injectable()
class FakeCodeSender implements CodeSender {
  sent: SendCodeInput[] = [];
  shouldThrow = false;

  async send(input: SendCodeInput): Promise<void> {
    if (this.shouldThrow) {
      throw new Error('sender failure');
    }
    this.sent.push(input);
  }

  reset(): void {
    this.sent = [];
    this.shouldThrow = false;
  }
}

@Injectable()
class FakeSecurityAlertSender implements SecurityAlertSender {
  sent: SendSecurityAlertInput[] = [];

  async send(input: SendSecurityAlertInput): Promise<void> {
    this.sent.push(input);
  }

  reset(): void {
    this.sent = [];
  }
}

// A trivial Query root is required by Nest's code-first GraphQL schema
// builder; IdentityModule only has mutations so far.
@Resolver()
class SignUpProbeResolver {
  @Query(() => Boolean)
  signUpProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [SignUpProbeResolver] })
class SignUpProbeModule {}

const SIGN_UP_MUTATION = `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      email
      codeSent
      resendAvailableAt
    }
  }
`;

describe('SignUp (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let fakeCodeSender: FakeCodeSender;
  let fakeSecurityAlertSender: FakeSecurityAlertSender;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, IdentityModule, SignUpProbeModule],
    })
      .overrideProvider(CodeSender)
      .useClass(FakeCodeSender)
      .overrideProvider(SecurityAlertSender)
      .useClass(FakeSecurityAlertSender)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    fakeCodeSender = module.get<FakeCodeSender>(CodeSender);
    fakeSecurityAlertSender =
      module.get<FakeSecurityAlertSender>(SecurityAlertSender);
  });

  beforeEach(async () => {
    fakeCodeSender.reset();
    fakeSecurityAlertSender.reset();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient.destroy();
    const identityDs = module.get<DataSource>(getDataSourceToken('identity'));
    if (identityDs.isInitialized) {
      await identityDs.destroy();
    }
    const profileDs = module.get<DataSource>(
      getDataSourceToken('user-profile'),
    );
    if (profileDs.isInitialized) {
      await profileDs.destroy();
    }
    await app.getHttpServer().close();
  });

  const signUp = (input: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({ query: SIGN_UP_MUTATION, variables: { input } });

  const validInput = (overrides: Record<string, unknown> = {}) => ({
    firstName: 'Negar',
    lastName: 'Khosravi',
    email: `negar-${randomUUID()}@example.com`,
    password: 'correct-horse',
    ...overrides,
  });

  it('creates an unverified user with a normalized email and a matching profile (AUTH-02, AUTH-03)', async () => {
    const response = await signUp({
      firstName: '  Negar ',
      lastName: ' Khosravi  ',
      email: '  Negar.K@Example.COM ',
      password: 'correct-horse',
    });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.signUp.email).toBe('negar.k@example.com');

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email: 'negar.k@example.com' })
      .first();
    expect(userRow).toBeDefined();
    expect(userRow.emailVerifiedAt).toBeNull();

    const profileRow = await testDbClient(Tables.UserProfileUser)
      .where({ id: userRow.id })
      .first();
    expect(profileRow.firstName).toBe('Negar');
    expect(profileRow.lastName).toBe('Khosravi');
  });

  it('sends one 6-digit code and returns codeSent/resendAvailableAt (AUTH-04)', async () => {
    const email = `negar-code-${randomUUID()}@example.com`;
    const response = await signUp(validInput({ email }));

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.signUp.codeSent).toBe(true);
    expect(response.body.data.signUp.resendAvailableAt).toBeDefined();
    expect(fakeCodeSender.sent).toHaveLength(1);
    expect(fakeCodeSender.sent[0].email).toBe(email);
    expect(fakeCodeSender.sent[0].code).toMatch(/^\d{6}$/);
  });

  it('stores a bcrypt hash of the password and never echoes it back (AUTH-05)', async () => {
    const email = `negar-hash-${randomUUID()}@example.com`;
    const response = await signUp(
      validInput({ email, password: 'sw0rdfish!' }),
    );

    const responseText = JSON.stringify(response.body);
    expect(responseText).not.toContain('sw0rdfish!');

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    expect(userRow.passwordHash).not.toBe('sw0rdfish!');
    expect(JSON.stringify(response.body)).not.toContain(userRow.passwordHash);
    await expect(
      bcrypt.compare('sw0rdfish!', userRow.passwordHash),
    ).resolves.toBe(true);
  });

  it('rejects an empty first name and a whitespace last name, creating nothing (AUTH-06)', async () => {
    const email = `negar-empty-names-${randomUUID()}@example.com`;
    const response = await signUp(
      validInput({ email, firstName: '   ', lastName: '   ' }),
    );

    const originalError = response.body.errors[0].extensions.originalError;
    expect(originalError.fields.firstName).toBe('Enter your name.');
    expect(originalError.fields.lastName).toBe('Enter your last name.');

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    expect(userRow).toBeUndefined();
  });

  it('rejects a 51-char name and accepts a 50-char name (AUTH-07)', async () => {
    const tooLong = 'a'.repeat(51);
    const atLimit = 'a'.repeat(50);

    const rejected = await signUp(
      validInput({
        email: `negar-51-${randomUUID()}@example.com`,
        firstName: tooLong,
      }),
    );
    expect(
      rejected.body.errors[0].extensions.originalError.fields.firstName,
    ).toBe('Must be 50 characters or fewer.');

    const accepted = await signUp(
      validInput({
        email: `negar-50-${randomUUID()}@example.com`,
        firstName: atLimit,
      }),
    );
    expect(accepted.body.errors).toBeUndefined();
  });

  it('rejects an invalid email and a 255-char email (AUTH-08)', async () => {
    const notAnEmail = await signUp(validInput({ email: 'not-an-email' }));
    expect(
      notAnEmail.body.errors[0].extensions.originalError.fields.email,
    ).toBe('Enter a valid email address.');

    const localPart = 'a'.repeat(255 - '@example.com'.length);
    const tooLongEmail = `${localPart}@example.com`;
    expect(tooLongEmail).toHaveLength(255);
    const tooLong = await signUp(validInput({ email: tooLongEmail }));
    expect(tooLong.body.errors[0].extensions.originalError.fields.email).toBe(
      'Enter a valid email address.',
    );
  });

  it('rejects a 7-char and a 73-char password, accepts 8 and 72 (AUTH-09)', async () => {
    const tooShort = await signUp(
      validInput({
        email: `negar-7-${randomUUID()}@example.com`,
        password: '1234567',
      }),
    );
    expect(
      tooShort.body.errors[0].extensions.originalError.fields.password,
    ).toBe('Password must be between 8 and 72 characters.');

    const tooLong = await signUp(
      validInput({
        email: `negar-73-${randomUUID()}@example.com`,
        password: 'a'.repeat(73),
      }),
    );
    expect(
      tooLong.body.errors[0].extensions.originalError.fields.password,
    ).toBe('Password must be between 8 and 72 characters.');

    const min = await signUp(
      validInput({
        email: `negar-8-${randomUUID()}@example.com`,
        password: 'a'.repeat(8),
      }),
    );
    expect(min.body.errors).toBeUndefined();

    const max = await signUp(
      validInput({
        email: `negar-72-${randomUUID()}@example.com`,
        password: 'a'.repeat(72),
      }),
    );
    expect(max.body.errors).toBeUndefined();
  });

  it('treats a duplicate email in another casing as a normal signup, alerting the existing account instead of sending a code, whether verified or not (AUTH-10)', async () => {
    const email = `negar-dup-${randomUUID()}@example.com`;
    await signUp(validInput({ email }));
    fakeCodeSender.reset();

    const unverifiedDup = await signUp(
      validInput({ email: email.toUpperCase() }),
    );
    expect(unverifiedDup.body.errors).toBeUndefined();
    expect(unverifiedDup.body.data.signUp.email).toBe(email);
    expect(unverifiedDup.body.data.signUp.codeSent).toBe(true);
    expect(fakeCodeSender.sent).toHaveLength(0);
    expect(fakeSecurityAlertSender.sent).toEqual([
      { email, event: 'duplicate_sign_up_attempt' },
    ]);

    await testDbClient(Tables.IdentityUser)
      .where({ email })
      .update({ emailVerifiedAt: new Date() });
    fakeSecurityAlertSender.reset();

    const verifiedDup = await signUp(
      validInput({ email: email.toUpperCase() }),
    );
    expect(verifiedDup.body.errors).toBeUndefined();
    expect(fakeCodeSender.sent).toHaveLength(0);
    expect(fakeSecurityAlertSender.sent).toEqual([
      { email, event: 'duplicate_sign_up_attempt' },
    ]);

    const rows = await testDbClient(Tables.IdentityUser).where({ email });
    expect(rows).toHaveLength(1);
  });

  it('lets only one of two concurrent sign-ups with the same email create a user, alerting on the other (AUTH-11)', async () => {
    const email = `negar-race-${randomUUID()}@example.com`;

    const [first, second] = await Promise.all([
      signUp(validInput({ email })),
      signUp(validInput({ email })),
    ]);

    expect(first.body.errors).toBeUndefined();
    expect(second.body.errors).toBeUndefined();

    const rows = await testDbClient(Tables.IdentityUser).where({ email });
    expect(rows).toHaveLength(1);
    expect(fakeCodeSender.sent).toHaveLength(1);
    expect(fakeCodeSender.sent[0].email).toBe(email);
    expect(fakeSecurityAlertSender.sent).toEqual([
      { email, event: 'duplicate_sign_up_attempt' },
    ]);
  });

  it('hard-deletes the user and lets the email be reused when profile creation fails (AUTH-12)', async () => {
    const email = `negar-profile-fail-${randomUUID()}@example.com`;
    jest
      .spyOn(UserProfileService.prototype, 'createProfile')
      .mockRejectedValueOnce(new Error('profile boom'));

    const failed = await signUp(validInput({ email }));
    expect(failed.body.errors).toBeDefined();

    const rowsAfterFailure = await testDbClient(Tables.IdentityUser).where({
      email,
    });
    expect(rowsAfterFailure).toHaveLength(0);

    const retried = await signUp(validInput({ email }));
    expect(retried.body.errors).toBeUndefined();
    const rowsAfterRetry = await testDbClient(Tables.IdentityUser).where({
      email,
    });
    expect(rowsAfterRetry).toHaveLength(1);
  });

  it('keeps the user and reports codeSent: false when the sender throws (AUTH-13)', async () => {
    const email = `negar-sender-fail-${randomUUID()}@example.com`;
    fakeCodeSender.shouldThrow = true;

    const response = await signUp(validInput({ email }));

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.signUp.codeSent).toBe(false);

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    expect(userRow).toBeDefined();
  });
});
