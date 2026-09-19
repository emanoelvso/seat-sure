import { registerEnumType } from '@nestjs/graphql';

export enum EventType {
  CONCERT = 'concert',
  SHOW = 'show',
  SPORT = 'sport',
  FESTIVAL = 'festival',
}

registerEnumType(EventType, {
  name: 'EventType',
});
