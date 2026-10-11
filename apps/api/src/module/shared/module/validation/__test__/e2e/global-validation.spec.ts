import { INestApplication, Module } from '@nestjs/common';
import {
  Args,
  Field,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';
import { IsEmail, IsInt, Min } from 'class-validator';
import request from 'supertest';

// The schema types an Int field but cannot express "at least 1" or "an email",
// so these rules only run when the global ValidationPipe is registered.
@InputType()
class ProbeInput {
  @IsEmail()
  @Field()
  email: string;

  @IsInt()
  @Min(1)
  @Field(() => Int, { defaultValue: 1 })
  quantity: number;
}

const probeHandler = jest.fn();

@Resolver()
class ValidationProbeResolver {
  @Query(() => Boolean)
  validationProbeHealthCheck(): boolean {
    return true;
  }

  @Mutation(() => String)
  validationProbe(@Args('input') input: ProbeInput): string {
    probeHandler(input);
    return `${input.email}:${input.quantity}`;
  }
}

@Module({ providers: [ValidationProbeResolver] })
class ValidationProbeModule {}

describe('Global input validation (e2e)', () => {
  let app: INestApplication;

  // Built the way main.ts builds the app (module -> app -> helper), not via
  // createNestApp, so a regression in the shared helper shows up here.
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [GraphqlModule, ValidationProbeModule],
    }).compile();
    app = module.createNestApplication();
    applyGlobalValidation(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const send = (input: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `mutation { validationProbe(input: ${input}) }`,
      });

  it('rejects an input that breaks a class-validator rule with BAD_REQUEST and skips the resolver (VALID-02)', async () => {
    const response = await send('{ email: "not-an-email", quantity: 1 }');

    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(response.body.data).toBeNull();
    expect(probeHandler).not.toHaveBeenCalled();
  });

  it('rejects an Int field that breaks @Min with BAD_REQUEST (VALID-02)', async () => {
    const response = await send('{ email: "a@b.co", quantity: 0 }');

    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(probeHandler).not.toHaveBeenCalled();
  });

  it('returns the resolver result for a valid input (VALID-03)', async () => {
    const response = await send('{ email: "a@b.co", quantity: 3 }');

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.validationProbe).toBe('a@b.co:3');
    expect(probeHandler).toHaveBeenCalledTimes(1);
  });

  it('validates and accepts the GraphQL default of an omitted field', async () => {
    const response = await send('{ email: "a@b.co" }');

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.validationProbe).toBe('a@b.co:1');
  });
});
