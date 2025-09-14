# Tabsy Theme System Documentation

## Overview
The Tabsy Frontend uses a semantic, theme-based color system that provides consistent theming across all three applications. Each app has its own distinct theme while maintaining a unified approach to color management.

## Theme System Architecture

### Color Format
- **CSS Variables**: RGB format (e.g., `16 185 129`) for maximum flexibility
- **shadcn/ui Components**: HSL format for compatibility
- **Utility Classes**: Semantic naming for consistent usage

### Theme Structure
Each theme includes:
- **Primary Colors**: Main brand colors with hover/active states
- **Secondary Colors**: Supporting brand colors
- **Accent Colors**: Highlight and emphasis colors
- **Surface Colors**: Card and component backgrounds
- **Background Colors**: Page and section backgrounds
- **Content Colors**: Text and icon colors with hierarchy
- **Border Colors**: Consistent border styling
- **Status Colors**: Success, warning, error, and info states
- **Interactive States**: Hover, active, disabled, and focus states

## Application Themes

### 1. Customer App - Fresh Green/Teal Theme
**Primary**: Emerald Green (#10B981)
**Secondary**: Teal (#14B8A6)
**Accent**: Amber (#F59E0B)

This theme creates a fresh, inviting atmosphere that's perfect for food ordering. The green conveys freshness and health, while teal adds a modern touch.

### 2. Restaurant Dashboard - Warm Orange Theme
**Primary**: Orange (#F97316)
**Secondary**: Amber (#F59E0B)
**Accent**: Red (#EF4444)

The warm orange theme creates an energetic, appetizing environment ideal for restaurant management. It conveys warmth, hospitality, and culinary passion.

### 3. Admin Portal - Professional Blue Theme
**Primary**: Blue (#3B82F6)
**Secondary**: Indigo (#6366F1)
**Accent**: Purple (#A855F7)

The blue theme provides a professional, trustworthy appearance suitable for administrative tasks. It promotes clarity, efficiency, and reliability.

## Implementation Details

### CSS Variables
Each app has a `theme.css` file with CSS custom properties:

```css
:root {
  /* Primary Colors */
  --primary: 16 185 129;
  --primary-hover: 5 150 105;
  --primary-active: 4 120 87;
  --primary-light: 236 253 245;
  --primary-dark: 6 78 59;
  --primary-foreground: 255 255 255;

  /* ... other color definitions */
}
```

### Dark Mode Support
Each theme includes dark mode variants:

```css
.dark {
  --primary: 52 211 153;
  --primary-hover: 16 185 129;
  /* ... dark mode colors */
}
```

### Utility Classes
Semantic utility classes for consistent usage:

```css
/* Background utilities */
.bg-surface
.bg-surface-secondary
.bg-surface-tertiary

/* Text utilities */
.text-content-primary
.text-content-secondary
.text-content-tertiary

/* Border utilities */
.border-default
.border-secondary
.border-focus

/* Button variants */
.btn-primary
.btn-secondary
.btn-accent
.btn-outline

/* Status utilities */
.status-success
.status-warning
.status-error
.status-info
```

## Usage Guidelines

### 1. Color Selection
- Use semantic color names instead of direct color values
- Prefer CSS variables over hard-coded colors
- Maintain consistency within each app's theme

### 2. Component Styling
```jsx
// Good - using semantic classes
<button className="btn-primary">Click me</button>
<div className="bg-surface border-default">Content</div>

// Bad - using direct colors
<button className="bg-orange-500">Click me</button>
<div className="bg-white border-gray-200">Content</div>
```

### 3. Custom Components
When creating new components, use the theme variables:

```css
.custom-component {
  background-color: rgb(var(--surface));
  color: rgb(var(--content-primary));
  border-color: rgb(var(--border));
}
```

### 4. Status Indicators
Use the predefined status colors for consistency:

```jsx
<div className="status-success">Operation successful</div>
<div className="status-error">Error occurred</div>
<div className="status-warning">Warning message</div>
<div className="status-info">Information</div>
```

## Migration Guide

### Converting from Static Colors
1. Replace Tailwind color utilities with semantic classes:
   - `bg-orange-500` → `bg-primary`
   - `text-gray-600` → `text-content-secondary`
   - `border-gray-200` → `border-default`

2. Update component libraries to use CSS variables:
   ```css
   /* Before */
   background-color: #F97316;

   /* After */
   background-color: rgb(var(--primary));
   ```

3. Use semantic status colors:
   ```jsx
   /* Before */
   <div className="bg-green-100 text-green-700">Success</div>

   /* After */
   <div className="status-success">Success</div>
   ```

## shadcn/ui Integration

For shadcn/ui components, the theme provides HSL format variables:

```css
:root {
  --ring: 217 91% 60%;
  --input: 214 59% 87%;
  --muted: 210 40% 98%;
  --destructive: 0 84% 60%;
  /* ... other shadcn variables */
}
```

These are automatically applied to shadcn/ui components for seamless integration.

## Best Practices

1. **Consistency**: Always use theme variables for colors
2. **Semantic Naming**: Choose semantic classes over color-specific ones
3. **Dark Mode**: Test all components in both light and dark modes
4. **Documentation**: Document any custom color usage
5. **Performance**: Use CSS variables for dynamic theming without JavaScript

## Theme Extension

To add new semantic colors:

1. Add the color definition to `theme.css`:
   ```css
   :root {
     --custom-color: 123 45 67;
     --custom-color-foreground: 255 255 255;
   }
   ```

2. Add dark mode variant:
   ```css
   .dark {
     --custom-color: 234 56 78;
     --custom-color-foreground: 0 0 0;
   }
   ```

3. Create utility classes:
   ```css
   .bg-custom { background-color: rgb(var(--custom-color)); }
   .text-custom { color: rgb(var(--custom-color)); }
   ```

## Troubleshooting

### Common Issues

1. **Colors not applying**: Ensure `theme.css` is imported in `globals.css`
2. **Build errors with @apply**: Use direct CSS instead of `@apply` with custom properties
3. **Dark mode not working**: Check that the `dark` class is properly applied to the root element
4. **shadcn/ui component colors**: Ensure HSL format is used for shadcn variables

## Future Enhancements

- [ ] Theme switching capability
- [ ] Custom theme creation UI
- [ ] Color palette generator
- [ ] Accessibility contrast checker
- [ ] Theme preview components