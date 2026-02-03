# Media Monitoring Dashboard

React + Vite frontend with a Node.js backend that pulls private Google Sheets data via a service account.

## Prerequisites

- Node.js 18+ (recommended)
- A Google Cloud service account with access to the target Google Sheet

## Backend setup

1. Create backend environment file

Copy the example file [backend/.env.example](backend/.env.example) to backend/.env and fill in your values:

- SHEET_ID: the spreadsheet ID (not the full URL)
- SHEET_NAME: the exact tab name (case-sensitive)
- GOOGLE_APPLICATION_CREDENTIALS: path to the service account JSON file

2. Share the Google Sheet with the service account email

Open the service account JSON and copy the client_email. Share the sheet with Viewer access.

3. Install and run backend

```bash
cd backend
npm install
npm start
```

Backend runs on http://localhost:4000 and exposes GET /api/news.

## Frontend setup

```bash
npm install
npm run dev
```

Frontend runs on http://localhost:5173.

The dev server proxies /api to http://localhost:4000.

## Data flow

- Frontend calls GET /api/news
- Backend fetches Google Sheets data with a service account
- First row is treated as headers
- Rows are returned as JSON objects
- Frontend maps columns to dashboard fields

## Troubleshooting

404 from Google Sheets API:

- Confirm SHEET_ID is correct (use the middle segment of the sheet URL)
- Confirm SHEET_NAME matches the tab name exactly
- Confirm the sheet is shared with the service account email

If /api/news fails in the browser:

- Ensure the backend is running on port 4000
- Check backend logs for credential or permission errors
- Verify the .env file values

## Scripts

Frontend:

- npm run dev
- npm run build
- npm run preview

Backend:

- npm start
