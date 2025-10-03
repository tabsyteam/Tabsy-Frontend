#!/bin/bash

# Fix final remaining hardcoded colors

COMPONENTS_DIR="src/components"

echo "Fixing final remaining hardcoded colors..."

# Status badge colors - text-amber/purple/red with numbers
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/text-amber-800/text-status-warning-dark/g' \
  -e 's/text-purple-800/text-secondary-dark/g' \
  -e 's/text-red-800/text-status-error-dark/g' \
  {} \;

# Final gray text instances
find "$COMPONENTS_DIR" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/text-gray-900/text-content-primary/g' \
  {} \;

# Loading spinners
find "$COMPONENTS_DIR" -type f \( -name "ClientWrapper.tsx" -o -name "PendingCashPayments.tsx" \) -exec sed -i '' \
  -e 's/border-orange-600/border-primary/g' \
  -e 's/border-red-600/border-status-error/g' \
  {} \;

# Table management icon
find "$COMPONENTS_DIR/tables" -type f -name "*.tsx" -exec sed -i '' \
  -e 's/text-gray-600/text-content-secondary/g' \
  {} \;

echo "Done! Fixed final hardcoded colors."
