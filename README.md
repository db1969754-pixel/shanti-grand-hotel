# Royal Grand Hotel — Complete Website

## Project structure
- `public/index.html` — frontend
- `public/style.css` — responsive styling
- `public/script.js` — frontend logic/API calls
- `server.js` — Node.js backend/API
- `data.json` — created automatically on first run; stores users, bookings, orders and services
- `Procfile` / `render.yaml` — deployment helpers
- `Dockerfile` — container deployment

## Run locally
Requires Node.js 18+.

```bash
node server.js
```

Open `http://localhost:3000`.

No `npm install` is required because this build uses only Node's built-in modules.

## Included requirements
- Login / Register / Guest Login
- Automatic Home after login
- Home with About, hotel photos and reviews
- 56 rooms with distinct image URLs
- Room search/filter and date availability
- Guest details and separate booking/payment modal
- Booking confirmation
- 400 food items with food-name-based image URLs
- Food search/filter, cart, quantity and totals
- Food ordering
- Room service, airport pickup, laundry, housekeeping, taxi/cab, extra bed, event/banquet, breakfast and luggage assistance
- WhatsApp order/service/booking links to +91 7894410792
- Facilities, Gallery, Reviews, Google Maps, direct call
- Dashboard and logout
- Mobile/desktop responsive UI
- Section navigation: clicking a menu opens only that section

## Hosting / public URL
This package is deployment-ready, but a public URL is created by your hosting provider after deployment. The ZIP itself cannot create a permanent public URL without a hosting account.

### Render
1. Create a GitHub repository and upload this folder.
2. In Render, create a new Web Service from the repository.
3. Build command: leave blank.
4. Start command: `node server.js`.
5. Deploy. Render gives a public `onrender.com` URL.

### Railway / other Node hosts
Use:
- Start command: `node server.js`
- Port: the app reads `process.env.PORT` automatically.

## Production note
The included JSON database is intended for a simple deployment/demo. For a serious multi-user production hotel, replace it with PostgreSQL/MySQL and use a persistent volume/database service. Also connect a real payment gateway before accepting online payments.
