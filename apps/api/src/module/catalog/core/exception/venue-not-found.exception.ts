import { NotFoundException } from '@nestjs/common';

export class VenueNotFoundException extends NotFoundException {
  constructor() {
    super('Venue not found');
  }
}
