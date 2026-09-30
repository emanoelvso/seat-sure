import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { EventArtist } from '@catalogModule/persistence/entity/event-artist.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EventArtistRepository extends DefaultTypeOrmRepository<EventArtist> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(EventArtist, datasource.manager);
  }

  // Headliners of these events with their artist and event id, the event's
  // headliner first: lowest performance_order (nulls last), then lowest slug.
  async findHeadlinersByEventIds(eventIds: string[]): Promise<EventArtist[]> {
    if (!eventIds.length) {
      return [];
    }

    return this.entityManager
      .createQueryBuilder(EventArtist, 'eventArtist')
      .innerJoinAndSelect('eventArtist.artist', 'artist')
      .innerJoin('eventArtist.event', 'event')
      .addSelect('event.id')
      .where('event.id IN (:...eventIds)', { eventIds })
      .andWhere('eventArtist.headliner = :headliner', { headliner: true })
      .orderBy('eventArtist.performance_order', 'ASC', 'NULLS LAST')
      .addOrderBy('artist.slug', 'ASC')
      .getMany();
  }
}
