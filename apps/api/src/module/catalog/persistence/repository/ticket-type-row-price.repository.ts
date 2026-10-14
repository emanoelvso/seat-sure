import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { TicketTypeRowPrice } from '@catalogModule/persistence/entity/ticket-type-row-price.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TicketTypeRowPriceRepository extends DefaultTypeOrmRepository<TicketTypeRowPrice> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(TicketTypeRowPrice, datasource.manager);
  }

  async findByTicketType(ticketTypeId: string): Promise<TicketTypeRowPrice[]> {
    return this.entityManager
      .createQueryBuilder(TicketTypeRowPrice, 'rowPrice')
      .where('rowPrice.ticketTypeId = :ticketTypeId', { ticketTypeId })
      .getMany();
  }

  // One grouped query for a page of ticket types. Ticket types without a row
  // price are missing from the map.
  async findMaxPremiumByTicketTypeIds(
    ticketTypeIds: string[],
  ): Promise<Map<string, number>> {
    if (ticketTypeIds.length === 0) {
      return new Map();
    }

    const rows = await this.entityManager
      .createQueryBuilder(TicketTypeRowPrice, 'rowPrice')
      .select('rowPrice.ticketTypeId', 'ticketTypeId')
      .addSelect('MAX(rowPrice.premiumCents)', 'maxPremiumCents')
      .where('rowPrice.ticketTypeId IN (:...ticketTypeIds)', { ticketTypeIds })
      .groupBy('rowPrice.ticketTypeId')
      .getRawMany<{ ticketTypeId: string; maxPremiumCents: string }>();

    return new Map(
      rows.map(({ ticketTypeId, maxPremiumCents }) => [
        ticketTypeId,
        Number(maxPremiumCents),
      ]),
    );
  }
}
