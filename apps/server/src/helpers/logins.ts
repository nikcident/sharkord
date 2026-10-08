import { getErrorMessage, type TIpInfo } from '@sharkord/shared';
import { logger } from '../logger';
import { ipCache } from '../utils/ip-cache';

const IP_INFO_TIMEOUT_MS = 2000;

const getIpInfo = async (ip: string): Promise<TIpInfo | undefined> => {
  const isLocalIp =
    ip.startsWith('192.168.') || ip.startsWith('::1') || ip === '127.0.0.1';

  const cachedData = ipCache.get(ip);

  if (cachedData) {
    return cachedData;
  }

  const url = isLocalIp
    ? 'https://ipinfo.io/json'
    : `https://ipinfo.io/${ip}/json`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(IP_INFO_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`ipinfo.io answered ${response.status}`);
    }

    const data = (await response.json()) as TIpInfo;

    ipCache.set(ip, data);

    return data;
  } catch (error) {
    logger.warn(
      'Could not look up %s, recording the login without location: %s',
      ip,
      getErrorMessage(error)
    );

    return undefined;
  }
};

export { getIpInfo };
