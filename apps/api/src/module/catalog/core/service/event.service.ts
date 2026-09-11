import { EventRepository } from '@catalogModule/persistence/repository/event.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventService {
  constructor(private readonly eventRepository: EventRepository) {}
}
