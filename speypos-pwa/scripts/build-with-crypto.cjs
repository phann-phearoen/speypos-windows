const nodeCrypto = require("node:crypto");

// Some dependency build paths assume a global `crypto` object exists.
if (typeof globalThis.crypto === "undefined") {
  if (nodeCrypto.webcrypto) {
    globalThis.crypto = nodeCrypto.webcrypto;
  } else {
    globalThis.crypto = {
      getRandomValues(typedArray) {
        return nodeCrypto.randomFillSync(typedArray);
      },
      randomUUID() {
        return nodeCrypto.randomUUID();
      },
    };
  }
}
