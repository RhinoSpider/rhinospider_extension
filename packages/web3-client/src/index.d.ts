declare module '@rhinospider/web3-client' {
  export interface UserData {
    avatar?: string;
    username?: string;
    email?: string;
  }

  export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserData | null;
  }

  export class AuthClient {
    static getInstance(): AuthClient;
    isAuthenticated(): Promise<boolean>;
    login(): Promise<void>;
    logout(): Promise<void>;
    getUserData(): Promise<UserData>;
  }

  export function useAuth(): {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserData | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
  };
}
