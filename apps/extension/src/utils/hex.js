/**
 * Convert a Uint8Array to hex string
 * @param {Uint8Array} bytes 
 * @returns {string}
 */
export function toHex(bytes) {
  if (!bytes) return '';
  if (!(bytes instanceof Uint8Array)) {
    // If it's an array, convert to Uint8Array
    if (Array.isArray(bytes)) {
      bytes = new Uint8Array(bytes);
    } else {
      console.error('Invalid input to toHex:', {
        type: bytes?.constructor?.name,
        value: bytes
      });
      return '';
    }
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex string to Uint8Array
 * @param {string} hex 
 * @returns {Uint8Array}
 */
export function fromHex(hex) {
  if (!hex) return new Uint8Array();
  if (typeof hex !== 'string') {
    console.error('Invalid input to fromHex:', {
      type: typeof hex,
      value: hex
    });
    return new Uint8Array();
  }
  const matches = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

/**
 * Parse ASN.1 DER length
 * @param {Uint8Array} bytes 
 * @param {number} offset 
 * @returns {{length: number, bytesRead: number}}
 */
function parseDerLength(bytes, offset) {
  const firstByte = bytes[offset];
  console.log('Parsing DER length at offset', offset, ':', {
    firstByte: firstByte.toString(16),
    isLongForm: !!(firstByte & 0x80)
  });
  
  if (firstByte & 0x80) {
    // Long form
    const numLengthBytes = firstByte & 0x7f;
    console.log('Long form length:', { numLengthBytes });
    
    let length = 0;
    for (let i = 0; i < numLengthBytes; i++) {
      length = (length << 8) | bytes[offset + 1 + i];
    }
    console.log('Parsed long form length:', {
      length,
      bytesRead: 1 + numLengthBytes
    });
    return { length, bytesRead: 1 + numLengthBytes };
  } else {
    // Short form
    console.log('Parsed short form length:', {
      length: firstByte,
      bytesRead: 1
    });
    return { length: firstByte, bytesRead: 1 };
  }
}

/**
 * Convert DER-encoded key to raw key
 * @param {Uint8Array|number[]} derBytes 
 * @returns {Uint8Array}
 */
export function derToRaw(derBytes) {
  // Ensure we have Uint8Array
  const bytes = derBytes instanceof Uint8Array ? derBytes : new Uint8Array(derBytes);
  
  // Log the incoming key
  console.log('Decoding DER key:', {
    length: bytes.length,
    firstByte: bytes[0]?.toString(16),
    firstBytes: toHex(bytes.slice(0, Math.min(10, bytes.length))),
    fullHex: toHex(bytes)
  });

  try {
    // Check if this is a simple DER key (0x04 + 64 bytes)
    if (bytes.length === 65 && bytes[0] === 0x04) {
      const rawKey = bytes.slice(1);
      console.log('Simple DER key detected:', {
        length: rawKey.length,
        firstBytes: toHex(rawKey.slice(0, Math.min(10, rawKey.length)))
      });
      return rawKey;
    }

    // Check if this is ASN.1 DER format
    if (bytes[0] === 0x30) { // SEQUENCE
      console.log('Found SEQUENCE tag');
      let offset = 1;
      
      const { length: seqLength, bytesRead: seqBytesRead } = parseDerLength(bytes, offset);
      console.log('SEQUENCE length:', { seqLength, bytesRead: seqBytesRead });
      offset += seqBytesRead;

      // Examine each byte
      console.log('Examining sequence bytes:', {
        startOffset: offset,
        nextByte: bytes[offset]?.toString(16),
        remainingBytes: toHex(bytes.slice(offset, offset + Math.min(20, seqLength)))
      });

      // Look for OCTET STRING (0x04)
      let foundKey = false;
      while (offset < bytes.length) {
        const tag = bytes[offset];
        console.log('Examining tag at offset', offset, ':', {
          tag: tag?.toString(16),
          nextBytes: toHex(bytes.slice(offset, offset + 5))
        });

        if (tag === 0x04) { // OCTET STRING
          console.log('Found OCTET STRING at offset', offset);
          const { length: keyLength, bytesRead: keyBytesRead } = parseDerLength(bytes, offset + 1);
          console.log('OCTET STRING length:', { keyLength, bytesRead: keyBytesRead });
          
          offset += 1 + keyBytesRead;
          console.log('Key data at offset', offset, ':', {
            length: keyLength,
            bytes: toHex(bytes.slice(offset, offset + Math.min(20, keyLength)))
          });

          // Extract the key bytes
          const rawKey = bytes.slice(offset, offset + keyLength);
          
          // For EC public keys, we might need to handle the 0x04 prefix here too
          if (rawKey.length === 65 && rawKey[0] === 0x04) {
            console.log('Found EC public key with 0x04 prefix');
            const finalKey = rawKey.slice(1);
            if (finalKey.length === 64) {
              console.log('Successfully extracted 64-byte key');
              return finalKey;
            }
          }
          
          // If it's already 64 bytes, use it directly
          if (rawKey.length === 64) {
            console.log('Found 64-byte key');
            return rawKey;
          }

          foundKey = true;
          console.log('Invalid key length:', rawKey.length);
          break;
        }

        // Skip this field
        const { length: fieldLength, bytesRead } = parseDerLength(bytes, offset + 1);
        offset += 1 + bytesRead + fieldLength;
      }

      if (!foundKey) {
        throw new Error('No OCTET STRING found in DER sequence');
      }
    }

    // If it's already 64 bytes, assume it's already raw
    if (bytes.length === 64) {
      console.log('Raw key detected:', {
        length: bytes.length,
        firstBytes: toHex(bytes.slice(0, Math.min(10, bytes.length)))
      });
      return bytes;
    }

    throw new Error(`Invalid key format: length ${bytes.length}, first byte ${bytes[0]?.toString(16)}`);
  } catch (error) {
    console.error('DER decoding error:', error, '\nFull key:', toHex(bytes));
    throw error;
  }
}
