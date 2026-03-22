import { create } from "zustand";

export type AppRole = "Admin" | "Editor" | "Viewer";

export interface AuthStore {
  user: string | null; // an object that stores user information
  isAuth: boolean;
  signInStep: string;
  roles: AppRole[];
  setUser: (user: string) => void; // a function to set user information
  setIsAuthenticated: (isAuth: boolean) => void;
  setSignInStep: (signInStep: string) => void;
  setRoles: (roles: AppRole[]) => void;
}

interface CredentialStoreInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credentials: any; // an object that stores user information
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setCredential: (credential: any) => void; // a function to set user information
}
export const useAuthStore = create<AuthStore>((set) => ({
  user: "", // initial value of user property
  isAuth: false,
  signInStep: "",
  roles: [],
  setUser: (user) => set({ user }), // function to set user information
  setIsAuthenticated: (isAuth) => set({ isAuth }),
  setSignInStep: (signInStep) => set({ signInStep }),
  setRoles: (roles) => set({ roles }),
}));

/** Check if the current user has at least one of the given roles */
export const useHasRole = (...allowed: AppRole[]) => {
  const roles = useAuthStore((s) => s.roles);
  return allowed.some((r) => roles.includes(r));
};

export const useCredentialStore = create<CredentialStoreInterface>((set) => ({
  credentials: {}, // initial value of credential property
  setCredential: (credentials) => set({ credentials }), // function to credential
}));
