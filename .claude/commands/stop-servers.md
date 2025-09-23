# Stop All Servers

Stop all running Tabsy backend and frontend servers.

## Steps:
1. Kill all Node.js processes running on typical development ports
2. Stop any pnpm/npm processes
3. Clean up any background processes
4. Confirm all servers are stopped

## Usage:
Type `/stop-servers` or `/stop` to stop all running servers.

## Ports Checked:
- Backend: 5001
- Customer App: 3001
- Restaurant Dashboard: 3000
- Admin Portal: 3002
- Any other Node.js processes