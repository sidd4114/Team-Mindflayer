# Real Price Integration (Market Intelligence)

The Shop page can show **real market prices** when you sync data from an external feed into the `market_prices` table.

## Options

### 1. data.gov.in (India Open Government Data)

Data is sourced from AGMARKNET. You need an API key.

1. Go to [data.gov.in](https://data.gov.in) and sign in / register.
2. Open **Profile** → **API Key** and generate a key.
3. Add to `.env.local`:
   ```env
   DATA_GOV_IN_API_KEY=your_api_key_here
   PRICE_FEED_STATE=Maharashtra
   ```
4. The app uses the resource *Current daily price of various commodities from various markets (Mandi)*. If the resource ID changes, set `DATA_GOV_IN_RESOURCE_ID` in env (see `src/lib/price-feed.ts`).

### 2. Custom JSON feed URL

If you have your own API or CSV→JSON that returns prices:

**Expected JSON shape** (array of objects):

```json
[
  { "date": "2025-02-01", "crop_type": "Tomato", "region": "Maharashtra", "price_per_kg": 28.5 },
  { "date": "2025-02-01", "crop_type": "Potato", "region": "Maharashtra", "price_per_kg": 22.0 }
]
```

- `date`: `YYYY-MM-DD`
- `crop_type`: e.g. Tomato, Potato, Onion, Wheat, Rice, Cotton (or we map from your names)
- `region`: e.g. Maharashtra, Karnataka
- `price_per_kg`: number (₹ per kg)

Add to `.env.local`:

```env
CUSTOM_PRICE_FEED_URL=https://your-server.com/api/prices
```

## Syncing prices into the app

1. **Supabase**
   - Run the migration that creates `market_prices` (if not already):
     ```bash
     supabase db push
     ```
   - In Dashboard → **Settings** → **API**, copy the **service_role** key (keep it secret).

2. **Env**
   - Set either `DATA_GOV_IN_API_KEY` or `CUSTOM_PRICE_FEED_URL` (and optionally `PRICE_FEED_STATE`).
   - Set `SUPABASE_SERVICE_ROLE_KEY` so the sync route can insert into `market_prices`.
   - Optional: set `PRICE_SYNC_CRON_SECRET` to protect the sync endpoint.

3. **Run sync**
   - **Manual:**  
     ```bash
     curl -H "x-cron-secret: YOUR_PRICE_SYNC_CRON_SECRET" "https://your-app.vercel.app/api/shop/sync-prices"
     ```
     (Omit the header if you did not set `PRICE_SYNC_CRON_SECRET`.)
   - **Cron (e.g. Vercel):** In the Vercel project, add a cron job that calls `GET /api/shop/sync-prices` daily, and send the same `x-cron-secret` header if configured.

After sync, the **Shop** page will show real price trends (when there is enough data for the selected crop/region). Sell alerts and predictions use this same data.

## Crop and region mapping

- **Price trends** and **sell alerts** use `crop_type` and `region` from `market_prices`. Use the same crop names (Tomato, Potato, Onion, Wheat, Rice, Cotton) for consistency with the Shop dropdown.
- For **data.gov.in**, we map common commodity names to these crops (see `src/lib/price-feed.ts`). Other commodities are stored but may not appear in the default crop list until you add them to the UI.

## Troubleshooting

- **Sync returns "No price feed configured"**  
  Set either `DATA_GOV_IN_API_KEY` or `CUSTOM_PRICE_FEED_URL`.

- **Sync returns 401**  
  You set `PRICE_SYNC_CRON_SECRET` but the request did not send `x-cron-secret: <same value>`.

- **data.gov.in error (e.g. 403 / 404)**  
  Check that your API key is valid and that the resource ID in use is still correct on data.gov.in. Some resources may require approval.

- **No points on chart**  
  Ensure sync has run and that there are rows in `market_prices` for the selected crop and region (e.g. `region = 'Maharashtra'` and `crop_type = 'Tomato'`). The app falls back to mock data when there are too few rows.
