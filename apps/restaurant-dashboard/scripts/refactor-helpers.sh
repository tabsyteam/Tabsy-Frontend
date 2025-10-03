#!/bin/bash

# Restaurant Dashboard Refactoring Helper Scripts
# Senior Architecture: Automated safe transformations

set -e  # Exit on error

RESTAURANT_APP_ROOT="apps/restaurant-dashboard"

echo "🔧 Restaurant Dashboard Refactoring Utilities"
echo "=============================================="

# Function: Find all console.log usage
function find_console_logs() {
    echo ""
    echo "📊 Finding all console.log/error/warn usage..."
    echo ""

    find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -Hn "console\.\(log\|error\|warn\|info\)" {} \; | \
        grep -v "node_modules" | \
        awk -F: '{printf "%-60s Line %-4s: %s\n", $1, $2, substr($0, index($0,$3))}'

    echo ""
    echo "Total occurrences:"
    find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -h "console\.\(log\|error\|warn\|info\)" {} \; | \
        grep -v "node_modules" | wc -l
}

# Function: Find all useWebSocketEvent usage
function find_websocket_listeners() {
    echo ""
    echo "🔌 Finding all useWebSocketEvent registrations..."
    echo ""

    find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -Hn "useWebSocketEvent" {} \; | \
        grep -v "node_modules" | \
        grep -v "useWebSocketSync.ts" | \
        awk -F: '{printf "%-60s Line %-4s\n", $1, $2}'

    echo ""
    echo "Total WebSocket listeners (excluding centralized hooks):"
    find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -h "useWebSocketEvent" {} \; | \
        grep -v "node_modules" | \
        grep -v "useWebSocketSync.ts" | \
        wc -l
}

# Function: Find magic numbers
function find_magic_numbers() {
    echo ""
    echo "🔢 Finding potential magic numbers..."
    echo ""

    # Look for common patterns: setTimeout, interval, limits
    find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -Hn "\(setTimeout\|setInterval\|limit:\|staleTime:\|refetchInterval:\) *[0-9]" {} \; | \
        grep -v "node_modules" | \
        grep -v "constants.ts" | \
        head -20
}

# Function: Verify imports
function check_imports() {
    echo ""
    echo "📦 Checking for incorrect imports..."
    echo ""

    # Check for useWebSocketEvent from wrong package
    echo "❌ useWebSocketEvent from @tabsy/api-client (should be @tabsy/ui-components):"
    find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -Hn "import.*useWebSocketEvent.*@tabsy/api-client" {} \; | \
        grep -v "node_modules" || echo "  ✅ None found"

    # Check for logger imports
    echo ""
    echo "📋 Files missing logger import but using console.log:"
    for file in $(find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -l "console\.\(log\|error\|warn\)" {} \;); do
        if ! grep -q "import.*logger" "$file"; then
            echo "  ⚠️  $file"
        fi
    done
}

# Function: Count current state
function show_stats() {
    echo ""
    echo "📈 Current Refactoring Statistics"
    echo "=================================="

    local total_websocket=$(find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -h "useWebSocketEvent" {} \; | \
        grep -v "useWebSocketSync.ts" | wc -l | tr -d ' ')

    local total_console=$(find "$RESTAURANT_APP_ROOT/src" \( -name "*.tsx" -o -name "*.ts" \) \
        -exec grep -h "console\.\(log\|error\|warn\)" {} \; | wc -l | tr -d ' ')

    local payment_listeners=$(find "$RESTAURANT_APP_ROOT/src/components/payments" -name "*.tsx" \
        -exec grep -h "useWebSocketEvent.*payment:" {} \; | wc -l | tr -d ' ')

    echo "WebSocket Listeners (excluding centralized): $total_websocket"
    echo "Console statements: $total_console"
    echo "Payment-specific listeners in components: $payment_listeners"
    echo ""
    echo "🎯 Target: 0 duplicate listeners, 0 console statements in production"
}

# Main menu
case "${1:-menu}" in
    "console")
        find_console_logs
        ;;
    "websocket")
        find_websocket_listeners
        ;;
    "magic")
        find_magic_numbers
        ;;
    "imports")
        check_imports
        ;;
    "stats")
        show_stats
        ;;
    "all")
        show_stats
        find_console_logs
        find_websocket_listeners
        check_imports
        ;;
    *)
        echo ""
        echo "Usage: $0 {console|websocket|magic|imports|stats|all}"
        echo ""
        echo "Commands:"
        echo "  console    - Find all console.log/error/warn usage"
        echo "  websocket  - Find all useWebSocketEvent registrations"
        echo "  magic      - Find potential magic numbers"
        echo "  imports    - Check for incorrect imports"
        echo "  stats      - Show refactoring statistics"
        echo "  all        - Run all checks"
        echo ""
        exit 1
        ;;
esac

echo ""
echo "✅ Analysis complete!"
