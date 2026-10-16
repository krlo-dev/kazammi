// Public API of the fingerprint module. Import this module only through this file.
export { fingerprint, type Fingerprint, type FingerprintDebug } from "./fingerprint";
export { decodeHash, encodeHash } from "./hash";
export { DEFAULT_PARAMS, FINGERPRINT_VERSION, type FingerprintParams } from "./params";
export type { Peak } from "./peaks";
