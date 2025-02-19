# RhinoSpider Extension Authentication Flow

## Overview
RhinoSpider uses Internet Identity (II) for authentication, implementing a delegation chain pattern for secure cross-context identity management in the Chrome extension.

## Key Components

### 1. Internet Identity Authentication
- User authenticates with II
- II provides a delegation chain containing:
  - Public keys
  - Signatures
  - Expiration timestamps
  - Optional target restrictions

### 2. Delegation Chain Storage
```javascript
{
  delegations: [{
    delegation: {
      pubkey: Array.from(pubkey),
      expiration: expiration.toString(16), // Stored as hex string
      targets: targets || []
    },
    signature: Array.from(signature)
  }],
  publicKey: Array.from(publicKey)
}
```

### 3. Identity Reconstruction Process
1. Convert stored arrays back to Uint8Arrays
2. Convert stored hex expiration back to BigInt
3. Create proper Delegation objects
4. Build DelegationChain using fromDelegations
5. Create base identity for signing support
6. Combine with delegation chain for final identity

## Implementation Details

### Base Identity
```javascript
// Create temporary base identity for signing support
const baseIdentity = Ed25519KeyIdentity.generate();

// Create final identity combining base with II delegation
const identity = DelegationIdentity.fromDelegation(baseIdentity, delegationChain);
```

Important Notes:
- The base identity (Ed25519KeyIdentity) is:
  - Generated fresh each time
  - Never persisted
  - Never used for actual authentication
  - Only provides required signing implementation
- All actual authentication uses:
  - II delegation chain
  - II principal
  - II signatures

### Request Flow
1. User action triggers request
2. DelegationIdentity signs request using:
   - II delegation chain for authentication
   - Base identity for technical signing support
3. Request includes:
   - II principal
   - Delegation chain
   - Proper signatures
4. Canister verifies:
   - Delegation chain validity
   - Signature correctness
   - Principal authorization

## Attempted Solutions Log

### 1. Direct Delegation Chain Usage
```javascript
const agent = new HttpAgent({
  transform: async (request) => ({
    body: {
      content: body,
      sender_delegation: delegationChain.delegations,
      sender_pubkey: delegationChain.publicKey
    }
  })
});
```
Result: Failed - Cannot properly sign requests without identity

### 2. Ed25519KeyIdentity as Base
```javascript
const baseIdentity = Ed25519KeyIdentity.generate();
const identity = DelegationIdentity.fromDelegation(baseIdentity, delegationChain);
```
Result: Failed - Signature scheme mismatch (Ed25519 vs ECDSA P256)

### 3. Secp256k1KeyIdentity as Base
```javascript
const baseIdentity = await Secp256k1KeyIdentity.generate();
const identity = DelegationIdentity.fromDelegation(baseIdentity, delegationChain);
```
Result: Failed - Invalid ECDSA signature verification

### 4. Anonymous Identity as Base
```javascript
const anonymousIdentity = new AnonymousIdentity();
const identity = DelegationIdentity.fromDelegation(anonymousIdentity, delegationChain);
```
Result: Failed - Missing sign implementation

### 5. Custom Signing Key Object
```javascript
const signingKey = {
  toDer: () => lastDelegation.delegation.pubkey,
  sign: async (message) => lastDelegation.signature
};
```
Result: Failed - Signature verification issues

### Common Error Patterns

1. Missing Sign Implementation
```
TypeError: this._inner.sign is not a function
```

2. ECDSA Verification
```
Invalid signature: Invalid basic signature: EcdsaP256 signature could not be verified
```

3. Signature Size
```
ECDSA signature must have 64 bytes, got [different size]
```

## Security Considerations

### 1. Storage Security
- Binary data (pubkeys, signatures) stored as arrays
- Expiration stored as hex string to preserve u64 value
- No private keys are ever stored

### 2. Identity Handling
- Fresh base identity generated for each session
- II delegation chain provides actual security
- All requests authenticated via II principal

### 3. Delegation Chain Validation
- Expiration times checked
- Target restrictions enforced
- Signature verification at each step

## Common Issues and Solutions

### 1. Signature Verification Errors
```
Error: "this._inner.sign is not a function"
Solution: Ensure base identity properly implements sign method
```

### 2. Expiration Issues
```
Error: "Failed to deserialize cbor request: invalid type"
Solution: Store expiration as hex string, parse back as BigInt
```

### 3. Binary Data Handling
```javascript
// Correct way to handle binary data
const pubkeyBuffer = new Uint8Array(d.delegation.pubkey).buffer;
const signatureBuffer = new Uint8Array(d.signature).buffer;
```

## Best Practices

1. Always reconstruct full delegation chain
2. Verify expiration times
3. Handle binary data correctly
4. Use proper base identity
5. Never expose base identity to canister
6. Clear storage on logout

## References

- [DFINITY Identity Documentation](https://internetcomputer.org/docs/current/references/ii-spec)
- [Internet Identity Specification](https://github.com/dfinity/internet-identity/blob/main/docs/ii-spec.md)
- [Delegation Chain Specification](https://github.com/dfinity/agent-js/blob/main/packages/identity/src/identity/delegation.ts)
