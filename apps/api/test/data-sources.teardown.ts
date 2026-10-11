import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { UnknownElementException } from '@nestjs/core/errors/exceptions/unknown-element.exception';
import { DataSource } from 'typeorm';

const DATA_SOURCE_NAMES = [
  'billing',
  'catalog',
  'identity',
  'notifications',
  'ticketing',
  'user-profile',
];

// Closes every module DataSource the test app opened; safe to call twice.
export const destroyDataSources = async (module: TestingModule) => {
  for (const name of DATA_SOURCE_NAMES) {
    let dataSource: DataSource;
    try {
      dataSource = module.get<DataSource>(getDataSourceToken(name));
    } catch (error) {
      if (error instanceof UnknownElementException) continue;
      throw error;
    }
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
};
