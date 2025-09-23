# Start Frontend Server

Start the Tabsy frontend applications. If already running, stops existing processes first.

## Steps:
1. Check if frontend servers are already running
2. Kill any existing frontend processes if found
3. Navigate to the frontend directory (Tabsy-Frontend)
4. Build packages if needed with `pnpm turbo build`
5. Start all frontend applications with `pnpm turbo dev`

## Usage:
Type `/start-frontend` or `/sf` to start all frontend applications.

## Frontend Directory:
`/Users/vishalsoni/Documents/ainexustech/Tabsy-Frontend`

## Commands:
- Build: `pnpm turbo build`
- Run: `pnpm turbo dev`

## Applications Started:
- Customer App (port 3001)
- Restaurant Dashboard (port 3000)
- Admin Portal (port 3002)