import * as React from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeProviderState | undefined>(undefined);
const STORAGE_KEY = 'sports-staff-theme';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system');
  const [resolvedTheme, setResolvedTheme] = React.useState<'dark' | 'light'>('light');

  React.useEffect(() => {
    const root = document.documentElement;
    const applied = theme === 'system' ? getSystemTheme() : theme;
    root.classList.toggle('dark', applied === 'dark');
    setResolvedTheme(applied);

    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const next = getSystemTheme();
      root.classList.toggle('dark', next === 'dark');
      setResolvedTheme(next);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const value = React.useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeProviderState {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
