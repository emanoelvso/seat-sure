import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { LogTicketSender } from '@ticketingModule/integration/provider/log-ticket-sender.provider';

describe('LogTicketSender (integration)', () => {
  let module: TestingModule;
  let sender: LogTicketSender;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [LogTicketSender],
    }).compile();

    sender = module.get(LogTicketSender);
  });

  afterAll(async () => {
    await module.close();
  });

  it('logs "Sending tickets" with the email, event name and codes (PAY-39)', async () => {
    const logSpy = jest.spyOn(AppLogger.prototype, 'log');

    await sender.send({
      email: 'negar@example.com',
      eventName: 'Coldplay: Music of the Spheres',
      codes: ['ABCDEFGH2345', 'ZYXWVUTS9876'],
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Sending tickets', {
      email: 'negar@example.com',
      eventName: 'Coldplay: Music of the Spheres',
      codes: ['ABCDEFGH2345', 'ZYXWVUTS9876'],
    });
    logSpy.mockRestore();
  });
});
