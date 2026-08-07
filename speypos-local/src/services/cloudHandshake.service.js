import { logger } from '../utils/logger.js';

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl || typeof baseUrl !== 'string') return 'https://speypos-analytics-api.ryong.net';
  return baseUrl.replace(/\/+$/, '');
}

function selectCanonicalStoreIdentity(data) {
  const candidates = [
    ['data.store.id', data?.store?.id],
    ['data.store_id', data?.store_id],
    ['data.store_client.store_id', data?.store_client?.store_id],
  ];

  const [source, canonicalStoreId] = candidates.find(([, value]) => value !== null && value !== undefined) || [];
  return { canonicalStoreId: canonicalStoreId || null, source: source || null };
}

/**
 * Performs a handshake with the cloud to resolve the canonical store identity.
 * Returns cloud store metadata that should be persisted in cloud.sync settings.
 */
export async function performHandshake({ apiKey, baseUrl }) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const url = `${normalizedBaseUrl}/pos/handshake`;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('Cloud handshake requires a non-empty api_key');
  }

  let json = {};
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({}),
    });
  } catch (error) {
    error.operation = 'cloud_handshake';
    error.url = url;
    throw error;
  }

  try {
    json = await response.json();
  } catch (error) {
    json = {};
  }

  const requestId = json?.meta?.request_id;
  if (!response.ok) {
    const message = json?.errors?.[0]?.message || response.statusText;
    const code = json?.errors?.[0]?.code;
    const error = new Error(message);
    error.code = code;
    error.status = response.status;
    error.requestId = requestId;
    error.operation = 'cloud_handshake';
    error.url = url;
    error.errorDetails = json?.errors?.[0]?.details;
    throw error;
  }

  const data = json?.data || {};
  const storeClient = data.store_client || {};
  const { canonicalStoreId, source: storeIdSource } = selectCanonicalStoreIdentity(data);
  const storeIdString =
    typeof canonicalStoreId === 'number' ? canonicalStoreId.toString() : canonicalStoreId;

  if (!storeIdString) {
    const error = new Error('Cloud handshake: missing store id in response');
    error.requestId = requestId;
    error.operation = 'cloud_handshake';
    error.url = url;
    throw error;
  }

  const metadata = {
    store_id: storeIdString,
    store_linked_at: storeClient?.linked_at || null,
    store_client_name: storeClient?.name || null,
    store_last_seen_at: storeClient?.last_seen_at || null,
    requestId,
  };

  logger.info('Cloud handshake succeeded.', {
    operation: 'cloud_handshake',
    url,
    selectedStoreId: storeIdString,
    selectedStoreIdSource: storeIdSource,
    requestId,
  });
  return metadata;
}
