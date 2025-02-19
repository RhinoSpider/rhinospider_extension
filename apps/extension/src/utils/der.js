/**
 * Parse ASN.1 DER encoded ECDSA public key
 * @param {Uint8Array} derBytes - DER encoded public key bytes
 * @returns {Uint8Array} Raw public key bytes
 */
export function parsePublicKeyDer(derBytes) {
  // Validate input
  if (!derBytes || !(derBytes instanceof Uint8Array)) {
    throw new Error('Invalid DER bytes');
  }

  let offset = 0;

  // Sequence
  if (derBytes[offset++] !== 0x30) {
    throw new Error('Expected sequence');
  }

  // Sequence length
  let seqLen = derBytes[offset++];
  if (seqLen !== derBytes.length - 2) {
    throw new Error(`Invalid sequence length: ${seqLen}`);
  }

  // Inner sequence
  if (derBytes[offset++] !== 0x30) {
    throw new Error('Expected inner sequence');
  }

  // Inner sequence length
  let innerSeqLen = derBytes[offset++];
  if (innerSeqLen !== 19) { // Fixed length for EC params
    throw new Error(`Invalid inner sequence length: ${innerSeqLen}`);
  }

  // Skip curve parameters
  offset += innerSeqLen;

  // Bitstring
  if (derBytes[offset++] !== 0x03) {
    throw new Error('Expected bitstring');
  }

  // Bitstring length
  let bitstringLen = derBytes[offset++];
  if (bitstringLen !== derBytes.length - offset) {
    throw new Error(`Invalid bitstring length: ${bitstringLen}, remaining: ${derBytes.length - offset}`);
  }

  // Skip unused bits byte
  offset++;

  // Uncompressed point marker
  if (derBytes[offset++] !== 0x04) {
    throw new Error('Expected uncompressed point');
  }

  // Extract raw 64-byte public key
  const remaining = derBytes.length - offset;
  if (remaining !== 64) {
    throw new Error(`Invalid key length: ${remaining}, expected 64`);
  }

  return derBytes.slice(offset);
}

/**
 * Parse ASN.1 DER encoded CBOR signature
 * @param {Uint8Array} derBytes - DER encoded signature bytes
 * @returns {Uint8Array} Raw CBOR bytes
 */
export function parseSignatureDer(derBytes) {
  // For now just return the raw bytes since the signature is already CBOR
  return derBytes;
}
