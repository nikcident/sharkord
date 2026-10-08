import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { drainLoginsQueue, enqueueLogin } from '..';
import { tdb } from '../../../__tests__/setup';
import { logins } from '../../../db/schema';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

const getLogins = () =>
  tdb.select().from(logins).where(eq(logins.userId, 1)).all();

describe('enqueueLogin', () => {
  test('should record the login without location when the lookup fails', async () => {
    globalThis.fetch = (async () => {
      throw new Error('connection refused');
    }) as unknown as typeof fetch;

    enqueueLogin(1, { ip: '203.0.113.10', os: 'Linux' });
    await drainLoginsQueue();

    const rows = await getLogins();

    expect(rows).toHaveLength(1);
    expect(rows[0]!.ip).toBe('203.0.113.10');
    expect(rows[0]!.city).toBeNull();
  });

  test('should record the login without location when the lookup never answers', async () => {
    globalThis.fetch = ((_: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('aborted'))
        );
      })) as unknown as typeof fetch;

    enqueueLogin(1, { ip: '203.0.113.11' });
    await drainLoginsQueue();

    expect(await getLogins()).toHaveLength(1);
  });
});
