function safeStringify(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

export function getErrorDetails(error) {
  if (!error) {
    return {
      error: 'Unknown error',
      errorName: null,
      errorCode: null,
      errorType: null,
      errorStatus: null,
      errorErrno: null,
      errorSyscall: null,
      errorAddress: null,
      errorPort: null,
      errorRequestId: null,
      errorCause: null,
      errorStack: null,
    };
  }

  return {
    error: error.message || String(error),
    errorName: error.name || null,
    errorCode: error.code || null,
    errorType: error.type || null,
    errorStatus: error.status || null,
    errorErrno: error.errno || null,
    errorSyscall: error.syscall || null,
    errorAddress: error.address || null,
    errorPort: error.port || null,
    errorRequestId: error.requestId || null,
    errorCause: safeStringify(error.cause),
    errorStack: error.stack || null,
  };
}