/**
 * Cold-start retry behaviour.
 *
 * The free hosting tier sleeps when idle, so the first request after a quiet
 * period times out while the instance wakes. Reads are retried once; writes
 * never are, since a POST that timed out may already have been applied.
 */
import MockAdapter from 'axios-mock-adapter';
import api from '../api';

let mock;
beforeEach(() => { mock = new MockAdapter(api); });
afterEach(() => mock.restore());

it('retries a timed-out GET once, then succeeds', async () => {
  let calls = 0;
  mock.onGet('/customers').reply((config) => {
    calls += 1;
    if (calls === 1) {
      const err = new Error('timeout of 30000ms exceeded');
      err.code = 'ECONNABORTED';
      err.config = config;
      return Promise.reject(err);
    }
    return [200, [{ id: 1 }]];
  });
  const { data } = await api.get('/customers');
  expect(calls).toBe(2);
  expect(data).toEqual([{ id: 1 }]);
});

it('never retries a POST', async () => {
  let calls = 0;
  mock.onPost('/bills').reply((config) => {
    calls += 1;
    const err = new Error('timeout'); err.code = 'ECONNABORTED'; err.config = config;
    return Promise.reject(err);
  });
  await expect(api.post('/bills', {})).rejects.toBeTruthy();
  expect(calls).toBe(1);
});

it('gives up after one retry', async () => {
  let calls = 0;
  mock.onGet('/products').reply((config) => {
    calls += 1;
    const err = new Error('timeout'); err.code = 'ECONNABORTED'; err.config = config;
    return Promise.reject(err);
  });
  await expect(api.get('/products')).rejects.toBeTruthy();
  expect(calls).toBe(2);
});

it('does not retry a real HTTP error', async () => {
  let calls = 0;
  mock.onGet('/x').reply(() => { calls += 1; return [500, { detail: 'boom' }]; });
  await expect(api.get('/x')).rejects.toBeTruthy();
  expect(calls).toBe(1);
});
