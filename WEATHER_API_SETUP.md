# Weather API Setup Guide

The FarmScan app uses real-time weather data from OpenWeatherMap API to display current conditions, including temperature, humidity, wind speed, visibility, and sunrise/sunset times.

## Features

- **Automatic Location Detection**: Uses browser's geolocation API to get user's coordinates
- **Real-time Weather Data**: Fetches current weather conditions from OpenWeatherMap
- **Dynamic Weather Icons**: Shows appropriate icons based on weather conditions (sun, cloud, rain, etc.)
- **Comprehensive Weather Stats**:
  - Current temperature and "feels like" temperature
  - Wind speed (km/h)
  - Humidity percentage
  - Visibility (miles)
  - Atmospheric pressure (inHg)
  - Sunrise and sunset times

## Setup Instructions

### 1. Get OpenWeatherMap API Key

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to API Keys section in your account
4. Generate a new API key (free tier allows 60 calls/minute)

### 2. Configure Environment Variables

1. Create a `.env.local` file in the project root:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your API key to `.env.local`:
   ```
   NEXT_PUBLIC_OPENWEATHER_API_KEY=your_actual_api_key_here
   ```

### 3. Restart Development Server

```bash
npm run dev
```

## How It Works

1. **Location Detection**: When the app loads, it requests the user's location permission
2. **API Call**: Once location is granted, it fetches weather data using the coordinates
3. **Data Display**: Weather information is displayed in a beautiful card with:
   - Temperature and location
   - Weather icon based on conditions
   - Detailed stats grid
   - Sunrise/sunset times with visual curve

## Fallback Behavior

If location permission is denied or API call fails:
- Shows default weather data
- Displays "Your Location" as the city name
- User can manually refresh the page to retry

## API Rate Limits

**Free Tier**: 60 calls/minute, 1,000,000 calls/month

The app makes one API call when the page loads, so you'll be well within limits for typical usage.

## Privacy

- Location data is only used for fetching weather information
- No location data is stored or sent to any server
- All API calls are made directly from the user's browser

## Troubleshooting

### Weather not loading?
1. Check if location permission is enabled in browser
2. Verify API key is correctly set in `.env.local`
3. Check browser console for error messages
4. Ensure you have internet connection

### "Failed to fetch weather data" error?
- Your API key might not be activated yet (takes ~10 minutes after signup)
- You might have exceeded the free tier rate limits
- Check OpenWeatherMap service status

## Alternative Weather APIs

You can easily swap to other weather APIs by modifying the fetch URL in `src/app/page.tsx`:
- **WeatherAPI.com** - Alternative free weather API
- **OpenMeteo** - No API key required
- **AccuWeather** - More detailed forecasts
