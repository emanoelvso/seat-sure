import { faker } from '@faker-js/faker';
import { eventFactory } from '@catalogModule/__test__/factory/event.factory';

describe('eventFactory', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps name and description within the 100-character column limit', () => {
    const rows = eventFactory.buildList(10_000);

    const tooLong = rows.filter(
      (row) => row.name!.length > 100 || row.description!.length > 100,
    );

    expect(rows).toHaveLength(10_000);
    expect(tooLong).toHaveLength(0);
  });

  it('truncates a description the generator returns over 100 characters', () => {
    jest.spyOn(faker.lorem, 'sentence').mockReturnValue('d'.repeat(150));

    expect(eventFactory.build().description).toBe('d'.repeat(100));
  });

  it('truncates a name the generator returns over 100 characters', () => {
    jest.spyOn(faker.music, 'artist').mockReturnValue('n'.repeat(150));

    expect(eventFactory.build().name).toBe('n'.repeat(100));
  });
});
