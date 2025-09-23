# Restart All Servers

Stop all running servers and restart both backend and frontend.

## Steps:
1. Stop all existing backend and frontend processes
2. Build backend if needed
3. Start backend server
4. Build frontend packages if needed
5. Start all frontend applications
6. Verify all servers are running correctly

## Usage:
Type `/restart-all` or `/restart` to restart all servers.

## Full Stack Startup:
- Backend: npm run dev (port 5001)
- Frontend: pnpm turbo dev (ports 3001, 3000, 3003)

## Directories:
- Backend: `/Users/vishalsoni/Documents/ainexustech/Tabsy-core`
- Frontend: `/Users/vishalsoni/Documents/ainexustech/Tabsy-Frontend`