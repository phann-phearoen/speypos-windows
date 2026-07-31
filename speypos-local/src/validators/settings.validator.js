import { SUPPORTED_INTENTS } from '../constants/telegram.constants.js';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(target, allowedKeys, path, { requireAll = true } = {}) {
  const keys = Object.keys(target);
  for (const key of keys) {
    if (!allowedKeys.includes(key)) {
      throw new ValidationError(`Unknown key at ${path}: ${key}`);
    }
  }
  if (requireAll) {
    for (const key of allowedKeys) {
      if (!(key in target)) {
        throw new ValidationError(`Missing required key at ${path}: ${key}`);
      }
    }
  }
}

function assertString(value, path, { allowEmpty = true } = {}) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${path} must be a string`);
  }
  if (!allowEmpty && value.trim().length === 0) {
    throw new ValidationError(`${path} must be a non-empty string`);
  }
}

function assertOptionalString(value, path, { allowEmpty = true } = {}) {
  if (value === undefined || value === null) return;
  assertString(value, path, { allowEmpty });
}

function assertBoolean(value, path) {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${path} must be a boolean`);
  }
}

function assertNumber(value, path) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError(`${path} must be a number`);
  }
}

function assertInteger(value, path) {
  assertNumber(value, path);
  if (!Number.isInteger(value)) {
    throw new ValidationError(`${path} must be an integer`);
  }
}

function validateSystemInitialized(value) {
  assertBoolean(value, 'system.initialized');
}

function validateReceiptCopies(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('receipt.copies must be an object');
  }

  assertAllowedKeys(value, ['version', 'copies'], 'receipt.copies');

  if (value.version !== 1) {
    throw new ValidationError('receipt.copies.version must be 1');
  }

  if (!Array.isArray(value.copies)) {
    throw new ValidationError('receipt.copies.copies must be an array');
  }

  value.copies.forEach((copy, index) => {
    const itemPath = `receipt.copies.copies[${index}]`;
    if (!isPlainObject(copy)) {
      throw new ValidationError(`${itemPath} must be an object`);
    }
    assertAllowedKeys(copy, ['variant', 'count'], itemPath);
    assertString(copy.variant, `${itemPath}.variant`, { allowEmpty: false });
    assertInteger(copy.count, `${itemPath}.count`);
    if (copy.count < 1) {
      throw new ValidationError(`${itemPath}.count must be >= 1`);
    }
  });
}

function validateTelegramIntents(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('telegram.intents must be an object');
  }

  assertAllowedKeys(value, ['version', 'intents'], 'telegram.intents');

  if (value.version !== 1) {
    throw new ValidationError('telegram.intents.version must be 1');
  }

  if (!Array.isArray(value.intents)) {
    throw new ValidationError('telegram.intents.intents must be an array');
  }

  value.intents.forEach((intent, index) => {
    const itemPath = `telegram.intents.intents[${index}]`;
    if (!isPlainObject(intent)) {
      throw new ValidationError(`${itemPath} must be an object`);
    }
    assertAllowedKeys(intent, ['intent', 'enabled', 'chat_id'], itemPath);
    assertString(intent.intent, `${itemPath}.intent`, { allowEmpty: false });
    if (!SUPPORTED_INTENTS.includes(intent.intent)) {
      throw new ValidationError(
        `${itemPath}.intent must be one of: ${SUPPORTED_INTENTS.join(', ')}`
      );
    }
    assertBoolean(intent.enabled, `${itemPath}.enabled`);
    assertString(intent.chat_id, `${itemPath}.chat_id`);
  });
}

function validateCloudSync(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('cloud.sync must be an object');
  }

  const allowedKeys = [
    'version',
    'enabled',
    'api_key',
    'base_url',
    'store_id',
    'store_linked_at',
    'store_client_name',
    'store_last_seen_at',
  ];

  // Allow optional handshake-derived fields while still blocking unknown keys.
  assertAllowedKeys(value, allowedKeys, 'cloud.sync', { requireAll: false });

  for (const key of ['version', 'enabled', 'api_key', 'base_url']) {
    if (!(key in value)) {
      throw new ValidationError(`Missing required key at cloud.sync: ${key}`);
    }
  }

  if (value.version !== 1) {
    throw new ValidationError('cloud.sync.version must be 1');
  }

  assertBoolean(value.enabled, 'cloud.sync.enabled');
  assertString(value.api_key, 'cloud.sync.api_key');
  assertString(value.base_url, 'cloud.sync.base_url', { allowEmpty: false });

  assertOptionalString(value.store_id, 'cloud.sync.store_id');
  assertOptionalString(value.store_linked_at, 'cloud.sync.store_linked_at');
  assertOptionalString(value.store_client_name, 'cloud.sync.store_client_name');
  assertOptionalString(value.store_last_seen_at, 'cloud.sync.store_last_seen_at');

  if (value.enabled) {
    if (!value.api_key || value.api_key.trim().length === 0) {
      throw new ValidationError('cloud.sync.api_key must be provided when enabled');
    }
    if (!value.store_id || value.store_id.trim().length === 0) {
      throw new ValidationError('cloud.sync.store_id must be set when enabled');
    }
  }
}

function validatePrinterConfig(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('printer.config must be an object');
  }

  assertAllowedKeys(
    value,
    ['version', 'enabled', 'transport', 'endpoint', 'engine'],
    'printer.config',
    { requireAll: false }
  );

  for (const key of ['version', 'enabled', 'transport', 'endpoint']) {
    if (!(key in value)) {
      throw new ValidationError(`Missing required key at printer.config: ${key}`);
    }
  }

  if (value.version !== 1) {
    throw new ValidationError('printer.config.version must be 1');
  }

  assertBoolean(value.enabled, 'printer.config.enabled');
  assertString(value.transport, 'printer.config.transport', { allowEmpty: false });
  assertString(value.endpoint, 'printer.config.endpoint');

  if (!['windows_printer', 'raw_usb', 'raw_tcp'].includes(value.transport)) {
    throw new ValidationError(
      'printer.config.transport must be one of: windows_printer, raw_usb, raw_tcp'
    );
  }

  if (value.engine !== undefined && value.engine !== 'canvas') {
    throw new ValidationError('printer.config.engine is deprecated and only canvas is supported');
  }
}

function validateOutboxConfig(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('outbox.config must be an object');
  }

  assertAllowedKeys(
    value,
    ['version', 'mode', 'batch_size', 'poll_interval_ms', 'lease_ms', 'max_attempts'],
    'outbox.config'
  );

  if (value.version !== 1) {
    throw new ValidationError('outbox.config.version must be 1');
  }

  assertString(value.mode, 'outbox.config.mode', { allowEmpty: false });
  if (!['legacy_sync', 'outbox_shadow', 'outbox_async'].includes(value.mode)) {
    throw new ValidationError(
      'outbox.config.mode must be one of: legacy_sync, outbox_shadow, outbox_async'
    );
  }

  assertInteger(value.batch_size, 'outbox.config.batch_size');
  assertInteger(value.poll_interval_ms, 'outbox.config.poll_interval_ms');
  assertInteger(value.lease_ms, 'outbox.config.lease_ms');
  assertInteger(value.max_attempts, 'outbox.config.max_attempts');

  if (value.batch_size < 1) {
    throw new ValidationError('outbox.config.batch_size must be >= 1');
  }
  if (value.poll_interval_ms < 100) {
    throw new ValidationError('outbox.config.poll_interval_ms must be >= 100');
  }
  if (value.lease_ms < 1000) {
    throw new ValidationError('outbox.config.lease_ms must be >= 1000');
  }
  if (value.max_attempts < 1) {
    throw new ValidationError('outbox.config.max_attempts must be >= 1');
  }
}

function validateMaintenanceLastRunAt(value) {
  assertNumber(value, 'maintenance.last_run_at');
}

function validateMaintenanceRetentionIntervalDays(value) {
  assertInteger(value, 'maintenance.retention_interval_days');
  if (value < 1) {
    throw new ValidationError('maintenance.retention_interval_days must be >= 1');
  }
}

const SETTING_SCHEMAS = {
  'system.initialized': {
    value_type: 'boolean',
    validate: validateSystemInitialized,
  },
  'receipt.copies': {
    value_type: 'json',
    validate: validateReceiptCopies,
  },
  'telegram.intents': {
    value_type: 'json',
    validate: validateTelegramIntents,
  },
  'cloud.sync': {
    value_type: 'json',
    validate: validateCloudSync,
  },
  'outbox.config': {
    value_type: 'json',
    validate: validateOutboxConfig,
  },
  'printer.config': {
    value_type: 'json',
    validate: validatePrinterConfig,
  },
  'maintenance.last_run_at': {
    value_type: 'number',
    validate: validateMaintenanceLastRunAt,
  },
  'maintenance.retention_interval_days': {
    value_type: 'number',
    validate: validateMaintenanceRetentionIntervalDays,
  },
};

export function validateSetting(key, value, valueType) {
  const schema = SETTING_SCHEMAS[key];
  if (!schema) {
    throw new ValidationError(`Unsupported setting key: ${key}`);
  }
  if (schema.value_type !== valueType) {
    throw new ValidationError(
      `Invalid value_type for ${key}. Expected ${schema.value_type}, received ${valueType}`
    );
  }
  schema.validate(value);
}
