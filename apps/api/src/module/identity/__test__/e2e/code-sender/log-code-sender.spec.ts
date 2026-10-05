import { Test, TestingModule } from '@nestjs/testing';
import { LogCodeSender } from '@identityModule/integration/provider/log-code-sender.provider';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { LoggerModule } from '@sharedModules/logger/logger.module';

describe('LogCodeSender (e2e)', () => {
  let module: TestingModule;
  let logCodeSender: LogCodeSender;
  let logSpy: jest.SpyInstance;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [LogCodeSender],
    }).compile();

    logCodeSender = module.get(LogCodeSender);
  });

  beforeEach(() => {
    logSpy = jest.spyOn(AppLogger.prototype, 'log');
  });

  afterAll(async () => {
    await module.close();
  });

  it('logs one entry containing the email, purpose and a code whose leading zero survives', async () => {
    await logCodeSender.send({
      email: 'negar@example.com',
      purpose: 'verify_email',
      code: '052817',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [, context] = logSpy.mock.calls[0];
    expect(context).toMatchObject({
      email: 'negar@example.com',
      purpose: 'verify_email',
      code: '052817',
    });
  });
});
