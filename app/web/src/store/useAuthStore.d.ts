export interface AuthStore {
    user: string | null;
    isAuth: boolean;
    signInStep: string;
    setUser: (user: string) => void;
    setIsAuthenticated: (isAuth: boolean) => void;
    setSignInStep: (signInStep: string) => void;
}
export declare const useAuthStore: any;
export declare const useCredentialStore: any;
