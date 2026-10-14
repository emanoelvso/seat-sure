import { registerEnumType } from '@nestjs/graphql';

export enum SeatPerk {
  AISLE = 'AISLE',
  EXTRA_LEGROOM = 'EXTRA_LEGROOM',
  ACCESSIBLE = 'ACCESSIBLE',
}

registerEnumType(SeatPerk, {
  name: 'SeatPerk',
});
