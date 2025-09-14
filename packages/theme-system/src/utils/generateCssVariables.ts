import { Theme, SemanticColors } from '../types/theme.types';
import { hexToRgb } from './colors';

function flattenColors(colors: SemanticColors, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  function processValue(key: string, value: any, currentPrefix: string) {
    const varName = currentPrefix ? `${currentPrefix}-${key}` : key;

    if (typeof value === 'string') {
      result[varName] = value.startsWith('#') ? hexToRgb(value) : value;
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        processValue(subKey === 'DEFAULT' ? '' : subKey, subValue, varName);
      });
    }
  }

  Object.entries(colors).forEach(([key, value]) => {
    processValue(key, value, prefix);
  });

  return result;
}

export function generateCssVariables(theme: Theme): string {
  const cssVars = flattenColors(theme.colors);

  const cssContent = Object.entries(cssVars)
    .map(([key, value]) => {
      const varName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `  --${varName}: ${value};`;
    })
    .join('\n');

  return `:root {\n${cssContent}\n}`;
}

export function generateTailwindExtend(theme: Theme): Record<string, any> {
  const extend: Record<string, any> = {
    colors: {},
  };

  function processColors(obj: any, prefix = ''): any {
    const result: Record<string, any> = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (key === 'DEFAULT') {
          result[key] = value.startsWith('#') ? value : `rgb(var(--${prefix}))`;
        } else {
          const varName = prefix ? `${prefix}-${key}` : key;
          result[key] = value.startsWith('#') ? value : `rgb(var(--${varName}))`;
        }
      } else if (typeof value === 'object' && value !== null) {
        const newPrefix = prefix ? `${prefix}-${key}` : key;
        result[key] = processColors(value, newPrefix);
      }
    });

    return result;
  }

  extend.colors = processColors(theme.colors);

  return extend;
}

export function generateSemanticClasses(theme: Theme): string {
  const classes: string[] = [];

  classes.push(`
/* Semantic Background Classes */
.bg-surface { background-color: rgb(var(--surface)); }
.bg-surface-secondary { background-color: rgb(var(--surface-secondary)); }
.bg-surface-tertiary { background-color: rgb(var(--surface-tertiary)); }
.bg-surface-elevated { background-color: rgb(var(--surface-elevated)); }

.bg-background { background-color: rgb(var(--background)); }
.bg-background-secondary { background-color: rgb(var(--background-secondary)); }
.bg-background-tertiary { background-color: rgb(var(--background-tertiary)); }

/* Semantic Text Classes */
.text-content-primary { color: rgb(var(--content-primary)); }
.text-content-secondary { color: rgb(var(--content-secondary)); }
.text-content-tertiary { color: rgb(var(--content-tertiary)); }
.text-content-disabled { color: rgb(var(--content-disabled)); }
.text-content-inverse { color: rgb(var(--content-inverse)); }
.text-content-brand { color: rgb(var(--content-brand)); }

/* Semantic Border Classes */
.border-default { border-color: rgb(var(--border)); }
.border-secondary { border-color: rgb(var(--border-secondary)); }
.border-tertiary { border-color: rgb(var(--border-tertiary)); }
.border-focus { border-color: rgb(var(--border-focus)); }
.border-error { border-color: rgb(var(--border-error)); }

/* Semantic Button Classes */
.btn-primary {
  background-color: rgb(var(--primary));
  color: rgb(var(--primary-foreground));
  transition: all 0.2s;
}
.btn-primary:hover {
  background-color: rgb(var(--primary-hover));
}
.btn-primary:active {
  background-color: rgb(var(--primary-active));
}

.btn-secondary {
  background-color: rgb(var(--secondary));
  color: rgb(var(--secondary-foreground));
  transition: all 0.2s;
}
.btn-secondary:hover {
  background-color: rgb(var(--secondary-hover));
}

.btn-accent {
  background-color: rgb(var(--accent));
  color: rgb(var(--accent-foreground));
  transition: all 0.2s;
}
.btn-accent:hover {
  background-color: rgb(var(--accent-hover));
}

/* Status Classes */
.status-success {
  background-color: rgb(var(--status-success-light));
  color: rgb(var(--status-success-dark));
  border-color: rgb(var(--status-success-border));
}

.status-warning {
  background-color: rgb(var(--status-warning-light));
  color: rgb(var(--status-warning-dark));
  border-color: rgb(var(--status-warning-border));
}

.status-error {
  background-color: rgb(var(--status-error-light));
  color: rgb(var(--status-error-dark));
  border-color: rgb(var(--status-error-border));
}

.status-info {
  background-color: rgb(var(--status-info-light));
  color: rgb(var(--status-info-dark));
  border-color: rgb(var(--status-info-border));
}
`);

  return classes.join('\n');
}