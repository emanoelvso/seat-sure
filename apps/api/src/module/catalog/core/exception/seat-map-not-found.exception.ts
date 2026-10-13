import { NotFoundException } from '@nestjs/common';

export class SeatMapNotFoundException extends NotFoundException {
  constructor() {
    super('Seat map not found');
  }
}
