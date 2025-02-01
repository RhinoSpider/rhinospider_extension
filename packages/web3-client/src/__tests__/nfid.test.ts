import { renderHook, act } from '@testing-library/react';
import { useNFID } from '../hooks/useNFID';
import { AuthClient } from '@dfinity/auth-client';

// Mock AuthClient
jest.mock('@dfinity/auth-client', () => ({
  AuthClient: {
    create: jest.fn(),
  },
}));

describe('useNFID', () => {
  const mockConfig = {
    appName: 'Test App',
    logo: 'test-logo.png',
    host: 'https://nfid.one',
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should initialize with default values', async () => {
    const mockAuthClient = {
      getIdentity: jest.fn().mockReturnValue({
        getPrincipal: jest.fn().mockReturnValue({ isAnonymous: () => true }),
      }),
    };

    (AuthClient.create as jest.Mock).mockResolvedValue(mockAuthClient);

    const { result } = renderHook(() => useNFID(mockConfig));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.identity).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should handle login success', async () => {
    const mockAuthClient = {
      login: jest.fn().mockResolvedValue(true),
      getIdentity: jest.fn().mockReturnValue({
        getPrincipal: jest.fn().mockReturnValue({ isAnonymous: () => false }),
      }),
    };

    (AuthClient.create as jest.Mock).mockResolvedValue(mockAuthClient);

    const { result } = renderHook(() => useNFID(mockConfig));

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle login failure', async () => {
    const mockAuthClient = {
      login: jest.fn().mockResolvedValue(false),
      getIdentity: jest.fn().mockReturnValue({
        getPrincipal: jest.fn().mockReturnValue({ isAnonymous: () => true }),
      }),
    };

    (AuthClient.create as jest.Mock).mockResolvedValue(mockAuthClient);

    const { result } = renderHook(() => useNFID(mockConfig));

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should handle logout', async () => {
    const mockAuthClient = {
      logout: jest.fn().mockResolvedValue(undefined),
      getIdentity: jest.fn().mockReturnValue({
        getPrincipal: jest.fn().mockReturnValue({ isAnonymous: () => true }),
      }),
    };

    (AuthClient.create as jest.Mock).mockResolvedValue(mockAuthClient);

    const { result } = renderHook(() => useNFID(mockConfig));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.identity).toBe(null);
    expect(result.current.error).toBe(null);
  });
});
