# Web3 Integration Documentation

## Overview
RhinoSpider uses Internet Computer Protocol (ICP) for Web3 integration, providing secure authentication and identity management through Internet Identity.

## Authentication Methods

### Internet Identity (Current Implementation)
- ICP's native identity service
- Uses cryptographic public/private key pairs
- Secure and decentralized
- No email/password required
- Session management with idle timeout

### Configuration
```typescript
// .env
VITE_II_URL=https://identity.ic0.app  # Optional, defaults to this URL
```

### Usage in Components
```jsx
import { useAuthContext } from '@rhinospider/web3-client';

function MyComponent() {
  const { login, logout, isAuthenticated, identity } = useAuthContext();
  
  // Login with Internet Identity
  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  // Get user's principal
  const principal = identity?.getPrincipal();
}
```

### Security Features
1. **Session Management**
   - 30-minute idle timeout
   - Automatic logout on timeout
   - Secure session storage

2. **Identity Management**
   - Cryptographic identity using ICP principals
   - No sensitive data stored locally
   - Secure key management

## Future Integrations (Planned)

### NFID
- Email/password authentication
- Google account integration
- Compatible with Internet Identity

### Plug Wallet
- Full Web3 wallet integration
- Asset management (ICP, cycles, tokens)
- Transaction support

### Cross-Chain Support
- Sign in with Bitcoin
- Sign in with Ethereum
- Sign in with Solana

## Implementation Details

### Authentication Flow
1. User clicks "Sign in with Internet Identity"
2. Internet Identity dialog opens
3. User authenticates with their device
4. On success:
   - Identity is stored securely
   - User session is established
   - App state updates to reflect authentication

### Security Considerations
1. **Identity Storage**
   - No sensitive data in localStorage
   - Session data encrypted
   - Keys never leave the secure context

2. **Session Management**
   - Short-lived sessions (30 minutes)
   - Secure session renewal
   - Automatic cleanup on logout

3. **Error Handling**
   - Graceful error recovery
   - Clear user feedback
   - Secure error logging

## Development Setup

1. Install dependencies:
```bash
pnpm add @dfinity/agent @dfinity/auth-client @dfinity/identity @dfinity/principal
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Import and use the AuthProvider:
```jsx
import { AuthProvider } from '@rhinospider/web3-client';

function App() {
  return (
    <AuthProvider
      appName="RhinoSpider"
      logo="/icons/icon128.png"
      iiUrl={import.meta.env.VITE_II_URL}
    >
      {/* Your app components */}
    </AuthProvider>
  );
}
```

## Testing
Run the test suite:
```bash
pnpm test
```

Key test cases:
- Authentication flow
- Session management
- Error handling
- Identity persistence

## Resources
- [Internet Identity Specification](https://internetcomputer.org/docs/current/references/ii-spec/)
- [DFINITY SDK Documentation](https://sdk.dfinity.org/docs/index.html)
- [ICP Integration Guide](https://internetcomputer.org/docs/current/developer-docs/integrations/)
