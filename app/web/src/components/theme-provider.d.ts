type Theme = "dark" | "light" | "system";
type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};
export declare function ThemeProvider({ children, defaultTheme, storageKey, ...props }: ThemeProviderProps): any;
export declare const useTheme: () => any;
export {};
