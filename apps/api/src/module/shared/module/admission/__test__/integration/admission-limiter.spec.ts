import { AdmissionBusyException } from '@sharedModules/admission/exception/admission-busy.exception';
import { AdmissionLimiter } from '@sharedModules/admission/service/admission-limiter.service';
import { ConfigService } from '@sharedModules/config/service/config.service';

const limiterWith = (maxConcurrent: number) =>
  new AdmissionLimiter({
    get: () => maxConcurrent,
  } as unknown as ConfigService);

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('AdmissionLimiter', () => {
  it('runs work and returns its result while under the limit', async () => {
    const limiter = limiterWith(2);

    await expect(limiter.run(async () => 'done')).resolves.toBe('done');
  });

  it('runs concurrent work up to the limit', async () => {
    const limiter = limiterWith(2);
    const gate = deferred();

    const first = limiter.run(() => gate.promise.then(() => 1));
    const second = limiter.run(() => gate.promise.then(() => 2));
    gate.resolve();

    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
  });

  it('rejects the excess with a retryable BUSY business error at the limit', async () => {
    const limiter = limiterWith(1);
    const gate = deferred();
    const running = limiter.run(() => gate.promise);
    const work = jest.fn(async () => 'never');

    const rejected = await limiter.run(work).catch((error: unknown) => error);

    expect(rejected).toBeInstanceOf(AdmissionBusyException);
    expect((rejected as AdmissionBusyException).getStatus()).toBe(422);
    expect((rejected as AdmissionBusyException).getResponse()).toMatchObject({
      statusCode: 422,
      reason: 'BUSY',
    });
    expect(work).not.toHaveBeenCalled();
    gate.resolve();
    await running;
  });

  it('releases the slot after the work completes', async () => {
    const limiter = limiterWith(1);

    await limiter.run(async () => 'first');

    await expect(limiter.run(async () => 'second')).resolves.toBe('second');
  });

  it('releases the slot after the work throws', async () => {
    const limiter = limiterWith(1);

    await expect(
      limiter.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    await expect(limiter.run(async () => 'after')).resolves.toBe('after');
  });
});
