import { artistFactory } from '@catalogModule/__test__/factory/artist.factory';
import { eventArtistFactory } from '@catalogModule/__test__/factory/event-artist.factory';
import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatFactory } from '@catalogModule/__test__/factory/seat.factory';
import { seatMapSectionViewFactory } from '@catalogModule/__test__/factory/seat-map-section-view.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { ticketTypeRowPriceFactory } from '@catalogModule/__test__/factory/ticket-type-row-price.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { CatalogModule } from '@catalogModule/catalog.module';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { SeatPerk } from '@catalogModule/core/enum/seat-perk.enum';
import { SeatMapLayout } from '@catalogModule/persistence/entity/seat-map.entity';
import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

describe('CatalogResolver findTicketTypeSeats (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  const venue = venueFactory.build({
    name: 'Allianz Parque',
    city: 'São Paulo',
    country: 'Brazil',
  });

  const EMPTY = { event: null, ticketType: null, seatMap: null, seats: [] };

  const hoursFromNow = (hours: number) =>
    new Date(Date.now() + hours * 3_600_000);

  const deleteRows = async () => {
    await testDbClient(Tables.Seat).del();
    await testDbClient(Tables.TicketType).del();
    await testDbClient(Tables.EventArtist).del();
    await testDbClient(Tables.Artist).del();
    await testDbClient(Tables.Event).del();
    await testDbClient(Tables.SeatMap).del();
  };

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([CatalogModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    await testDbClient.batchInsert(Tables.Venue, [venue]);
  });

  beforeEach(async () => {
    await deleteRows();
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient(Tables.Venue).where('id', venue.id).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  // The event and seat map fields the seat page selects, the same ones
  // findEventTickets returns (SEAT-01).
  const EVENT_FIELDS = `
    id
    name
    type
    coverImage
    venue
    city
    country
    startAt
    endsAt
    headliner {
      slug
      name
    }
  `;
  const SEAT_MAP_FIELDS = `
    id
    name
    viewBoxWidth
    viewBoxHeight
    labelSize
    labelWeight
    stage {
      label
      labelX
      labelY
      shapes {
        path
        color
      }
    }
    sections {
      key
      label
      color
      shapes {
        path
        labelX
        labelY
        labelRotation
      }
    }
  `;

  const findTicketTypeSeats = async (
    eventId: string,
    ticketTypeId: string,
    {
      eventFields = 'id name',
      seatMapFields = 'id name',
      seatFields = 'id row number x y',
      extraFields = '',
    } = {},
  ) => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query FindTicketTypeSeats($FindTicketTypeSeatsInput: FindTicketTypeSeatsInput!) {
            findTicketTypeSeats(FindTicketTypeSeatsInput: $FindTicketTypeSeatsInput) {
              event {
                ${eventFields}
              }
              ticketType {
                id
                sectionKey
                name
                priceCents
                serviceFeeCents
                taxCents
                currency
                seatsAvailable
                maxPerOrder
                tags
              }
              seatMap {
                ${seatMapFields}
              }
              seats {
                ${seatFields}
              }
              ${extraFields}
            }
          }
        `,
        variables: { FindTicketTypeSeatsInput: { eventId, ticketTypeId } },
      })
      .expect(200);

    return response.body;
  };

  const insertSeatMap = async (name: string, layout?: SeatMapLayout) => {
    const seatMap = seatMapFactory.build({
      name,
      venueId: venue.id,
      ...(layout && { layout: JSON.stringify(layout) }),
    });
    await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);
    return seatMap;
  };

  const insertEvent = async ({
    status = EventStatus.PUBLISHED,
    startAt = hoursFromNow(24),
    seatMapId = null,
  }: {
    status?: EventStatus;
    startAt?: Date;
    seatMapId?: string | null;
  } = {}) => {
    const event = {
      ...eventFactory.build({ venueId: venue.id, status, startAt }),
      seatMapId,
    };
    await testDbClient.batchInsert(Tables.Event, [event]);
    return event;
  };

  const insertVipTicketType = async (eventId: string) => {
    const ticketType = ticketTypeFactory.build({ eventId, sectionKey: 'vip' });
    await testDbClient.batchInsert(Tables.TicketType, [ticketType]);
    return ticketType;
  };

  const insertSeats = async (
    seatMapId: string,
    sectionKey: string,
    count: number,
  ) => {
    const seats = seatFactory.buildList(count, { seatMapId, sectionKey });
    await testDbClient.batchInsert(Tables.Seat, seats);
    return seats;
  };

  // An event that would return a ticket type and seats if the condition under
  // test didn't null the response.
  const insertEventWithVipSeats = async (
    event: Parameters<typeof insertEvent>[0] = {},
  ) => {
    const seatMap = await insertSeatMap('Concentric Arena');
    const inserted = await insertEvent({ ...event, seatMapId: seatMap.id });
    const ticketType = await insertVipTicketType(inserted.id!);
    await insertSeats(seatMap.id, 'vip', 2);
    return { seatMap, event: inserted, ticketType };
  };

  it('returns the event, the requested ticket type with every field, and the seat map (SEAT-01)', async () => {
    // width ≠ height, size ≠ weight, x ≠ y, and the last section has two
    // shapes, so a swapped or dropped field changes the response.
    const seatMap = await insertSeatMap('Concentric Arena', {
      viewBox: { width: 800, height: 600 },
      labelStyle: { size: 24, weight: 700 },
      stage: {
        label: 'STAGE',
        labelAt: [350, 35],
        shapes: [{ path: 'M10 10L690 10L690 60L10 60Z', color: '#999999' }],
      },
      sections: [
        {
          key: 'vip',
          label: 'VIP',
          color: '#454545',
          shapes: [
            {
              path: 'M252 200A100 100 0 1 0 452 200A100 100 0 1 0 252 200Z',
              labelAt: [352, 300],
              labelRotation: 0,
            },
          ],
        },
        {
          key: 'a',
          label: 'A',
          color: '#303030',
          shapes: [
            {
              path: 'M20 200L90 110L120 130L50 220Z',
              labelAt: [96.8, 172.3],
              labelRotation: -57,
            },
            {
              path: 'M600 110L680 200L650 220L580 130Z',
              labelAt: [625.4, 185.7],
              labelRotation: 55,
            },
          ],
        },
      ],
    });
    const event = await insertEvent({ seatMapId: seatMap.id });
    const headliner = artistFactory.build({
      slug: 'hello-adkins',
      stage_name: 'Adele',
    });
    await testDbClient.batchInsert(Tables.Artist, [headliner]);
    await testDbClient.batchInsert(Tables.EventArtist, [
      eventArtistFactory.build({ eventId: event.id!, artistId: headliner.id }),
    ]);
    const vip = ticketTypeFactory.build({
      eventId: event.id!,
      sectionKey: 'vip',
      name: 'VIP',
      priceCents: 45000,
      serviceFeeCents: 6750,
      taxCents: 3600,
      currency: 'EUR',
      seatsAvailable: 40,
      maxPerOrder: 6,
      tags: 'discounted,vip',
    });
    const sectionA = ticketTypeFactory.build({
      eventId: event.id!,
      sectionKey: 'a',
      name: 'A',
      priceCents: 40000,
      serviceFeeCents: 5000,
      taxCents: 2800,
      currency: 'USD',
      seatsAvailable: 120,
      maxPerOrder: 10,
      tags: 'best seller',
    });
    await testDbClient.batchInsert(Tables.TicketType, [vip, sectionA]);

    const forVip = await findTicketTypeSeats(event.id!, vip.id, {
      eventFields: EVENT_FIELDS,
      seatMapFields: SEAT_MAP_FIELDS,
    });
    const forSectionA = await findTicketTypeSeats(event.id!, sectionA.id);

    expect(forVip.errors).toBeUndefined();
    expect(forVip.data.findTicketTypeSeats.event).toEqual({
      id: event.id,
      name: event.name,
      type: event.type,
      coverImage: event.coverImage,
      venue: 'Allianz Parque',
      city: 'São Paulo',
      country: 'Brazil',
      startAt: event.startAt!.toISOString(),
      endsAt: event.endsAt!.toISOString(),
      headliner: { slug: 'hello-adkins', name: 'Adele' },
    });
    expect(forVip.data.findTicketTypeSeats.ticketType).toEqual({
      id: vip.id,
      sectionKey: 'vip',
      name: 'VIP',
      priceCents: 45000,
      serviceFeeCents: 6750,
      taxCents: 3600,
      currency: 'EUR',
      seatsAvailable: 40,
      maxPerOrder: 6,
      tags: ['discounted', 'vip'],
    });
    expect(forVip.data.findTicketTypeSeats.seatMap).toEqual({
      id: seatMap.id,
      name: 'Concentric Arena',
      viewBoxWidth: 800,
      viewBoxHeight: 600,
      labelSize: 24,
      labelWeight: 700,
      stage: {
        label: 'STAGE',
        labelX: 350,
        labelY: 35,
        shapes: [{ path: 'M10 10L690 10L690 60L10 60Z', color: '#999999' }],
      },
      sections: [
        {
          key: 'vip',
          label: 'VIP',
          color: '#454545',
          shapes: [
            {
              path: 'M252 200A100 100 0 1 0 452 200A100 100 0 1 0 252 200Z',
              labelX: 352,
              labelY: 300,
              labelRotation: 0,
            },
          ],
        },
        {
          key: 'a',
          label: 'A',
          color: '#303030',
          shapes: [
            {
              path: 'M20 200L90 110L120 130L50 220Z',
              labelX: 96.8,
              labelY: 172.3,
              labelRotation: -57,
            },
            {
              path: 'M600 110L680 200L650 220L580 130Z',
              labelX: 625.4,
              labelY: 185.7,
              labelRotation: 55,
            },
          ],
        },
      ],
    });

    expect(forSectionA.errors).toBeUndefined();
    expect(forSectionA.data.findTicketTypeSeats.ticketType).toEqual({
      id: sectionA.id,
      sectionKey: 'a',
      name: 'A',
      priceCents: 40000,
      serviceFeeCents: 5000,
      taxCents: 2800,
      currency: 'USD',
      seatsAvailable: 120,
      maxPerOrder: 10,
      tags: ['best seller'],
    });
  });

  it('defaults serviceFeeCents and taxCents to 0 when the columns are not set on insert (PAY-64)', async () => {
    const event = await insertEvent();
    const ticketType = ticketTypeFactory.build({
      eventId: event.id!,
      sectionKey: 'vip',
    }) as { serviceFeeCents?: number; taxCents?: number; id: string };
    delete ticketType.serviceFeeCents;
    delete ticketType.taxCents;
    await testDbClient.batchInsert(Tables.TicketType, [ticketType]);

    const body = await findTicketTypeSeats(event.id!, ticketType.id);

    expect(body.errors).toBeUndefined();
    expect(body.data.findTicketTypeSeats.ticketType).toEqual(
      expect.objectContaining({ serviceFeeCents: 0, taxCents: 0 }),
    );
  });

  it.each(['serviceFeeCents', 'taxCents'])(
    'rejects a negative %s on insert (PAY-64)',
    async (column) => {
      const event = await insertEvent();
      const ticketType = ticketTypeFactory.build({
        eventId: event.id!,
        sectionKey: 'vip',
        [column]: -1,
      });

      await expect(
        testDbClient.batchInsert(Tables.TicketType, [ticketType]),
      ).rejects.toMatchObject({ code: '23514' });
      expect(
        await testDbClient(Tables.TicketType).where({ id: ticketType.id }),
      ).toHaveLength(0);
    },
  );

  it("returns exactly the live seats of the ticket type's section on the event's seat map (SEAT-02)", async () => {
    const seatMap = await insertSeatMap('Concentric Arena');
    const otherSeatMap = await insertSeatMap('Football Stadium');
    const event = await insertEvent({ seatMapId: seatMap.id });
    const ticketType = await insertVipTicketType(event.id!);

    const vipSeats = [
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'vip',
        row: '4',
        number: '09',
        x: 283.5,
        y: 369.25,
      }),
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'vip',
        row: '4',
        number: '10',
        x: 337.5,
        y: 377.25,
      }),
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'vip',
        row: '12',
        number: '01',
        x: 40,
        y: 553,
      }),
    ];
    const sectionASeats = [
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'a',
        row: '4',
        number: '09',
      }),
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'a',
        row: '4',
        number: '10',
      }),
    ];
    const otherMapVipSeat = seatFactory.build({
      seatMapId: otherSeatMap.id,
      sectionKey: 'vip',
      row: '4',
      number: '09',
    });
    const deletedVipSeat = {
      ...seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'vip',
        row: '5',
        number: '02',
      }),
      deletedAt: new Date(),
    };
    await testDbClient.batchInsert(Tables.Seat, [
      ...vipSeats,
      ...sectionASeats,
      otherMapVipSeat,
      deletedVipSeat,
    ]);

    const body = await findTicketTypeSeats(event.id!, ticketType.id);

    expect(body.errors).toBeUndefined();
    const byId = (a: { id: string }, b: { id: string }) =>
      a.id.localeCompare(b.id);
    expect([...body.data.findTicketTypeSeats.seats].sort(byId)).toEqual(
      vipSeats
        .map(({ id, row, number, x, y }) => ({ id, row, number, x, y }))
        .sort(byId),
    );
  });

  describe('SEAT-03: unknown, unpublished or past events', () => {
    it('returns the empty shape for an unknown event id', async () => {
      const { ticketType } = await insertEventWithVipSeats();

      const body = await findTicketTypeSeats(
        faker.string.uuid(),
        ticketType.id,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape for a draft event', async () => {
      const { event, ticketType } = await insertEventWithVipSeats({
        status: EventStatus.DRAFT,
      });

      const body = await findTicketTypeSeats(event.id!, ticketType.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape for a published event that started 1 hour ago', async () => {
      const { event, ticketType } = await insertEventWithVipSeats({
        startAt: hoursFromNow(-1),
      });

      const body = await findTicketTypeSeats(event.id!, ticketType.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });
  });

  describe('SEAT-04: a ticket type that is not a live one of the event', () => {
    it('returns the empty shape for a ticket type of another upcoming event', async () => {
      const { event } = await insertEventWithVipSeats();
      const otherEvent = await insertEvent({
        startAt: hoursFromNow(48),
        seatMapId: event.seatMapId,
      });
      const otherTicketType = await insertVipTicketType(otherEvent.id!);

      const body = await findTicketTypeSeats(event.id!, otherTicketType.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape for an unknown ticket type id', async () => {
      const { event } = await insertEventWithVipSeats();

      const body = await findTicketTypeSeats(event.id!, faker.string.uuid());

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape for a soft-deleted ticket type', async () => {
      const seatMap = await insertSeatMap('Concentric Arena');
      const event = await insertEvent({ seatMapId: seatMap.id });
      const deleted = {
        ...ticketTypeFactory.build({ eventId: event.id!, sectionKey: 'vip' }),
        deletedAt: new Date(),
      };
      await testDbClient.batchInsert(Tables.TicketType, [deleted]);
      await insertSeats(seatMap.id, 'vip', 2);

      const body = await findTicketTypeSeats(event.id!, deleted.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });
  });

  describe('SEAT-05: malformed ids', () => {
    it('returns the empty shape when the event id is not a UUID', async () => {
      const { ticketType } = await insertEventWithVipSeats();

      const body = await findTicketTypeSeats('not-a-uuid', ticketType.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape when the ticket type id is not a UUID', async () => {
      const { event } = await insertEventWithVipSeats();

      const body = await findTicketTypeSeats(event.id!, 'not-a-uuid');

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });
  });

  it('returns the event and ticket type with seatMap: null and no seats for an event without a seat map (SEAT-06)', async () => {
    // Seats of the same section exist on another seat map.
    const otherSeatMap = await insertSeatMap('Football Stadium');
    await insertSeats(otherSeatMap.id, 'vip', 2);
    const event = await insertEvent({ seatMapId: null });
    const ticketType = await insertVipTicketType(event.id!);

    const body = await findTicketTypeSeats(event.id!, ticketType.id);

    expect(body.errors).toBeUndefined();
    expect(body.data.findTicketTypeSeats.event).toEqual({
      id: event.id,
      name: event.name,
    });
    expect(body.data.findTicketTypeSeats.ticketType.id).toBe(ticketType.id);
    expect(body.data.findTicketTypeSeats.seatMap).toBeNull();
    expect(body.data.findTicketTypeSeats.seats).toEqual([]);
  });

  describe('seat price and perks', () => {
    const findSeats = async (eventId: string, ticketTypeId: string) => {
      const body = await findTicketTypeSeats(eventId, ticketTypeId, {
        seatFields: 'row number priceCents perks',
      });
      expect(body.errors).toBeUndefined();
      return body.data.findTicketTypeSeats.seats as {
        row: string;
        number: string;
        priceCents: number;
        perks: string[];
      }[];
    };

    const setup = async () => {
      const seatMap = await insertSeatMap('Concentric Arena');
      const event = await insertEvent({ seatMapId: seatMap.id });
      const vip = ticketTypeFactory.build({
        eventId: event.id!,
        sectionKey: 'vip',
        priceCents: 45000,
      });
      const sectionA = ticketTypeFactory.build({
        eventId: event.id!,
        sectionKey: 'a',
        priceCents: 45000,
      });
      await testDbClient.batchInsert(Tables.TicketType, [vip, sectionA]);
      return { seatMap, event, vip, sectionA };
    };

    it("prices a seat at the ticket type's base plus its row's premium (PRICE-01)", async () => {
      const { seatMap, event, vip } = await setup();
      await testDbClient.batchInsert(Tables.Seat, [
        seatFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'vip',
          row: '1',
          number: '01',
        }),
        seatFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'vip',
          row: '7',
          number: '01',
        }),
      ]);
      await testDbClient.batchInsert(Tables.TicketTypeRowPrice, [
        ticketTypeRowPriceFactory.build({
          ticketTypeId: vip.id,
          row: '1',
          premiumCents: 15000,
        }),
      ]);

      const seats = await findSeats(event.id!, vip.id);

      expect(
        seats
          .map(({ row, priceCents }) => ({ row, priceCents }))
          .sort((a, b) => a.row.localeCompare(b.row)),
      ).toEqual([
        { row: '1', priceCents: 60000 },
        { row: '7', priceCents: 45000 },
      ]);
    });

    it('prices a seat at the base price when its ticket type has no row prices (PRICE-01)', async () => {
      const { seatMap, event, vip } = await setup();
      await testDbClient.batchInsert(Tables.Seat, [
        seatFactory.build({ seatMapId: seatMap.id, sectionKey: 'vip' }),
      ]);

      const seats = await findSeats(event.id!, vip.id);

      expect(seats).toEqual([expect.objectContaining({ priceCents: 45000 })]);
    });

    it("ignores another ticket type's premium for the same row (PRICE-01)", async () => {
      const { seatMap, event, vip, sectionA } = await setup();
      await testDbClient.batchInsert(Tables.Seat, [
        seatFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'vip',
          row: '1',
        }),
      ]);
      await testDbClient.batchInsert(Tables.TicketTypeRowPrice, [
        ticketTypeRowPriceFactory.build({
          ticketTypeId: sectionA.id,
          row: '1',
          premiumCents: 15000,
        }),
      ]);

      const seats = await findSeats(event.id!, vip.id);

      expect(seats).toEqual([expect.objectContaining({ priceCents: 45000 })]);
    });

    it('returns each seat with the perks it has, in stored order, and [] for a seat without perks (PERK-01)', async () => {
      const { seatMap, event, vip } = await setup();
      await testDbClient.batchInsert(Tables.Seat, [
        seatFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'vip',
          row: '1',
          number: '01',
          perks: [SeatPerk.AISLE, SeatPerk.ACCESSIBLE],
        }),
        seatFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'vip',
          row: '1',
          number: '02',
          perks: [SeatPerk.EXTRA_LEGROOM],
        }),
        seatFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'vip',
          row: '1',
          number: '03',
        }),
      ]);

      const seats = await findSeats(event.id!, vip.id);

      expect(
        seats
          .map(({ number, perks }) => ({ number, perks }))
          .sort((a, b) => a.number.localeCompare(b.number)),
      ).toEqual([
        { number: '01', perks: ['AISLE', 'ACCESSIBLE'] },
        { number: '02', perks: ['EXTRA_LEGROOM'] },
        { number: '03', perks: [] },
      ]);
    });
  });

  describe('section view rating', () => {
    const findSectionView = async (eventId: string, ticketTypeId: string) => {
      const body = await findTicketTypeSeats(eventId, ticketTypeId, {
        extraFields: 'sectionView { score label }',
      });
      expect(body.errors).toBeUndefined();
      return body.data.findTicketTypeSeats.sectionView;
    };

    it("returns the rating of the ticket type's section on the event's seat map, with the score as a number (VIEW-01)", async () => {
      const seatMap = await insertSeatMap('Concentric Arena');
      const event = await insertEvent({ seatMapId: seatMap.id });
      const vip = await insertVipTicketType(event.id!);
      await testDbClient.batchInsert(Tables.SeatMapSectionView, [
        seatMapSectionViewFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'vip',
          score: 4.7,
          label: 'Clear View',
        }),
        seatMapSectionViewFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'a',
          score: 3.2,
          label: 'Distant View',
        }),
      ]);

      const sectionView = await findSectionView(event.id!, vip.id);

      expect(sectionView).toEqual({ score: 4.7, label: 'Clear View' });
      // The response is parsed JSON, so a string score would not equal 4.7.
    });

    it('returns null for a section without a rating (VIEW-01)', async () => {
      const seatMap = await insertSeatMap('Concentric Arena');
      const otherMap = await insertSeatMap('Football Stadium');
      const event = await insertEvent({ seatMapId: seatMap.id });
      const vip = await insertVipTicketType(event.id!);
      // Same section on another map and another section on this map.
      await testDbClient.batchInsert(Tables.SeatMapSectionView, [
        seatMapSectionViewFactory.build({
          seatMapId: otherMap.id,
          sectionKey: 'vip',
        }),
        seatMapSectionViewFactory.build({
          seatMapId: seatMap.id,
          sectionKey: 'a',
        }),
      ]);

      expect(await findSectionView(event.id!, vip.id)).toBeNull();
    });

    it('returns null for an event without a seat map (VIEW-01)', async () => {
      const otherMap = await insertSeatMap('Football Stadium');
      const event = await insertEvent({ seatMapId: null });
      const vip = await insertVipTicketType(event.id!);
      await testDbClient.batchInsert(Tables.SeatMapSectionView, [
        seatMapSectionViewFactory.build({
          seatMapId: otherMap.id,
          sectionKey: 'vip',
        }),
      ]);

      expect(await findSectionView(event.id!, vip.id)).toBeNull();
    });
  });

  it("returns the ticket type's maxPriceCents as its base plus the highest row premium (PRICE-10)", async () => {
    const seatMap = await insertSeatMap('Concentric Arena');
    const event = await insertEvent({ seatMapId: seatMap.id });
    const vip = ticketTypeFactory.build({
      eventId: event.id!,
      sectionKey: 'vip',
      priceCents: 45000,
    });
    await testDbClient.batchInsert(Tables.TicketType, [vip]);
    await testDbClient.batchInsert(Tables.TicketTypeRowPrice, [
      ticketTypeRowPriceFactory.build({
        ticketTypeId: vip.id,
        row: '1',
        premiumCents: 15000,
      }),
      ticketTypeRowPriceFactory.build({
        ticketTypeId: vip.id,
        row: '2',
        premiumCents: 5000,
      }),
    ]);

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `query { findTicketTypeSeats(FindTicketTypeSeatsInput: { eventId: "${event.id}", ticketTypeId: "${vip.id}" }) { ticketType { priceCents maxPriceCents } } }`,
      })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.findTicketTypeSeats.ticketType).toEqual({
      priceCents: 45000,
      maxPriceCents: 60000,
    });
  });
});
