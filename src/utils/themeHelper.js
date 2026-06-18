import { themes } from './themes';

let systemMediaQuery = null;

// Handle system theme updates reactively when 'auto' is selected
const handleSystemThemeChange = (e) => {
  const targetThemeId = e.matches ? 'dark' : 'light';
  const theme = themes.find(t => t.id === targetThemeId);
  if (!theme) return;

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  root.setAttribute('data-theme', theme.id);
};

export const getSavedTheme = () => {
  return localStorage.getItem('bookstore_theme') || 'auto';
};

export const applyTheme = (themeId) => {
  // 1. Clean up old listener if exists
  if (systemMediaQuery) {
    systemMediaQuery.removeEventListener('change', handleSystemThemeChange);
    systemMediaQuery = null;
  }

  let targetThemeId = themeId;

  if (themeId === 'auto') {
    // 2. Query system preference and add listener
    systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    targetThemeId = systemMediaQuery.matches ? 'dark' : 'light';
    systemMediaQuery.addEventListener('change', handleSystemThemeChange);
  }

  // 3. Find target theme variables
  const theme = themes.find(t => t.id === targetThemeId) || themes.find(t => t.id === 'dark');
  if (!theme) return;

  // 4. Inject colors on documentElement
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // 5. Annotate html tag with data-theme attribute
  root.setAttribute('data-theme', theme.id);
};

export const saveTheme = (themeId) => {
  localStorage.setItem('bookstore_theme', themeId);
  applyTheme(themeId);
};

export const initTheme = () => {
  const saved = getSavedTheme();
  applyTheme(saved);
};
