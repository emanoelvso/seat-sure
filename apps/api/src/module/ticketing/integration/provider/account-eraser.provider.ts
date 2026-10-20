import { Injectable } from '@nestjs/common';
import {
  AccountEraser,
  AccountErasure,
  AccountErasureBlocker,
} from '@sharedModules/integration/interface/account-erasure.interface';
import { OrderRepository } from '@ticketingModule/persistence/repository/order.repository';
import { SeatHoldRepository } from '@ticketingModule/persistence/repository/seat-hold.repository';
import { TicketRepository } from '@ticketingModule/persistence/repository/ticket.repository';

// Found by Identity through DiscoveryService when it deletes an account.
// Orders, items and tickets are financial records and are kept (DEL-07).
@AccountErasure()
@Injectable()
export class TicketingAccountEraser implements AccountEraser {
  readonly name = 'ticketing';

  constructor(
    private readonly orders: OrderRepository,
    private readonly tickets: TicketRepository,
    private readonly seatHolds: SeatHoldRepository,
  ) {}

  async findBlocker(
    userId: string,
    now: Date,
  ): Promise<AccountErasureBlocker | null> {
    const blocked =
      (await this.orders.hasOpenOrder(userId, now)) ||
      (await this.tickets.hasUpcomingIssued(userId, now));
    return blocked ? 'ACCOUNT_HAS_ACTIVE_ORDERS' : null;
  }

  async erase(userId: string): Promise<void> {
    await this.seatHolds.deleteForUser(userId);
  }
}
