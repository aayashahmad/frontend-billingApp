import MockAdapter from 'axios-mock-adapter';

import api from '../api';
import { listCustomers } from '../customerService';
import { listProducts } from '../productService';

/**
 * The server caps a page at 500 rows. These assert the services keep paging
 * until a short page — before this, a shop past the cap silently lost every
 * row beyond the first page, with no error anywhere.
 */
describe('list pagination', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  const rows = (count, offset = 0) =>
    Array.from({ length: count }, (_, i) => ({ id: offset + i + 1 }));

  it('fetches every page of customers until a short page', async () => {
    mock.onGet('/customers').reply((config) => {
      const offset = Number(config.params.offset);
      expect(config.params.limit).toBe(500);
      return [200, offset === 0 ? rows(500) : rows(120, 500)];
    });

    const result = await listCustomers();

    expect(result).toHaveLength(620);
    expect(result[0].id).toBe(1);
    expect(result[619].id).toBe(620);
    expect(mock.history.get).toHaveLength(2);
  });

  it('stops after one request when the first page is short', async () => {
    mock.onGet('/customers').reply(200, rows(3));

    const result = await listCustomers();

    expect(result).toHaveLength(3);
    expect(mock.history.get).toHaveLength(1);
  });

  it('pages products and carries the search query on every page', async () => {
    mock.onGet('/products').reply((config) => {
      expect(config.params.q).toBe('rice');
      const offset = Number(config.params.offset);
      return [200, offset === 0 ? rows(500) : rows(1, 500)];
    });

    const result = await listProducts('rice');

    expect(result).toHaveLength(501);
    expect(mock.history.get).toHaveLength(2);
  });
});
