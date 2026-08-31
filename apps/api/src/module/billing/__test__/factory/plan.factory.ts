import { PlanInterval } from '@billingModule/core/enum/plan-interval.enum';
import { Plan } from '@billingModule/persistence/entity/plan.entity';
import { faker } from '@faker-js/faker/.';
import * as Factory from 'factory.ts';

export const planFactory = Factory.Sync.makeFactory<Partial<Plan>>({
  id: faker.string.uuid(),
  name: faker.string.sample(),
  description: faker.string.sample(),
  amount: faker.number.float(),
  currency: faker.finance.currencyCode(),
  interval: PlanInterval.Month,
  trialPeriod: 0,
  createdAt: faker.date.recent(),
  updatedAt: faker.date.recent(),
  deletedAt: null,
});
