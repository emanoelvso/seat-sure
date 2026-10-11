import { INestApplication, ValidationPipe } from '@nestjs/common';

// The one place that decides how request inputs are validated, shared by the
// real bootstrap and the e2e harness so the tests run what production runs.
export const applyGlobalValidation = (app: INestApplication): void => {
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
};
