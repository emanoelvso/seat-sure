import { TicketCodeGenerator } from '@ticketingModule/core/service/ticket-code-generator.service';

describe('TicketCodeGenerator (integration)', () => {
  it('generates distinct 12-character codes without 0, 1, I or O (PAY-38)', () => {
    const generator = new TicketCodeGenerator();

    const codes = Array.from({ length: 1_000 }, () => generator.generate());

    for (const code of codes) {
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
      expect(code).not.toMatch(/[01IO]/);
    }
    expect(new Set(codes).size).toBe(1_000);
  });
});
