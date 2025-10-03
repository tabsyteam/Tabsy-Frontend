#!/bin/bash

# Fix remaining hardcoded colors in restaurant dashboard components

COMPONENTS_DIR="src/components"

echo "Fixing remaining hardcoded colors..."

# Gray colors to semantic tokens
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/\btext-gray-600\b/text-content-secondary/g' \
  -e 's/\btext-gray-400\b/text-content-disabled/g' \
  {} \;

# Error colors
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/\btext-red-500\b/text-status-error/g' \
  -e 's/\btext-red-800\b/text-status-error-dark/g' \
  -e 's/\bborder-red-600\b/border-status-error/g' \
  {} \;

# Info colors
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/\btext-blue-700\b/text-status-info/g' \
  -e 's/\btext-blue-900\b/text-status-info-dark/g' \
  {} \;

# Success colors
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/\btext-green-500\b/text-status-success/g' \
  -e 's/\btext-green-900\b/text-status-success-dark/g' \
  -e 's/\btext-emerald-600\b/text-status-success/g' \
  {} \;

# Warning/accent colors
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/\btext-orange-500\b/text-accent/g' \
  -e 's/\btext-orange-800\b/text-accent/g' \
  -e 's/\bborder-orange-600\b/border-accent/g' \
  {} \;

# Amber warnings
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/\btext-amber-500\b/text-status-warning/g' \
  {} \;

# Purple (secondary)
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/\btext-purple-800\b/text-secondary-dark/g' \
  {} \;

echo "Done! Fixed remaining hardcoded colors."
