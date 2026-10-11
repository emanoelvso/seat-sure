import { Test } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';
import { initializeTransactionalContext } from 'typeorm-transactional';

export const createNestApp = async (modules: any[] = [AppModule]) => {
  initializeTransactionalContext();
  const module = await Test.createTestingModule({
    imports: [GraphqlModule, ...modules],
  }).compile();

  const app = module.createNestApplication();
  applyGlobalValidation(app);
  await app.init();
  return { module, app };
};
