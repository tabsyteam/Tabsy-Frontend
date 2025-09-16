# Tabsy Frontend Setup Guide

## Prerequisites

1. **Backend Server**: The Tabsy backend must be running on port 5001
2. **Database**: PostgreSQL with the Tabsy database schema
3. **Redis**: Optional but recommended for caching

## Quick Start

### 1. Start the Backend Server

```bash
cd /Users/vishalsoni/Documents/ainexustech/Tabsy-core
npm install  # or pnpm install
npm run dev  # This starts the server on port 5001
```

### 2. Create Test Data

To access the customer app with a QR code, you need a valid table with QR code in the database.

The QR codes in the backend are 32-character hex strings (generated from 16 random bytes).

You have two options:

#### Option A: Use Backend API to Create Test Data

1. Create a restaurant
2. Create a table for that restaurant
3. The system will generate a QR code automatically

#### Option B: Direct Database Access

If you have database access, you can insert test data:

```sql
-- Create a test restaurant
INSERT INTO restaurants (id, name, slug)
VALUES ('test-restaurant-id', 'Test Restaurant', 'test-restaurant');

-- Create a test table with a specific QR code
INSERT INTO tables (id, restaurant_id, number, qr_code, status)
VALUES (
  'test-table-id',
  'test-restaurant-id',
  '1',
  'a1b2c3d4e5f6789012345678901234567',  -- 32 char hex string
  'AVAILABLE'
);
```

### 3. Access the Customer App

Once you have a valid QR code in the database:

1. Start the customer app:
   ```bash
   pnpm run dev:customer
   ```

2. Access using the QR code:
   ```
   http://localhost:3001/table/YOUR_QR_CODE?r=RESTAURANT_ID&t=TABLE_ID
   ```

   For example with the test data above:
   ```
   http://localhost:3001/table/a1b2c3d4e5f6789012345678901234567?r=test-restaurant-id&t=test-table-id
   ```

## Troubleshooting

### API Health Check Errors

The customer app checks the backend health on startup. If you see errors:

1. **Verify backend is running**: Check that the backend is running on port 5001
2. **Check CORS settings**: Ensure `http://localhost:3001` is in the allowed origins in the backend `.env`

### QR Code Not Found Errors

If you get "Invalid QR code" errors:

1. **Check QR code exists**: The QR code must exist in the database `tables.qr_code` field
2. **Format**: QR codes are 32-character hexadecimal strings
3. **Table status**: Ensure the table status is 'AVAILABLE'

### Session Creation Errors

For session creation to work:

1. The QR code must be valid
2. The table must be active
3. The restaurant must be active

## Development Tips

1. **Check Backend Logs**: The backend provides detailed logging for debugging
2. **Use Backend Admin Panel**: If available, use the admin panel to create test data
3. **API Documentation**: Refer to `/API_DOCUMENTATION.md` for detailed endpoint information