# FarmScan

A mobile-first PWA that helps farmers detect crop diseases early using Sentinel Hub satellite imagery and AI-powered disease detection.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Sentinel Hub account
- Supabase account
- OpenWeatherMap API key (optional)

### Installation

```bash
# Install dependencies
npm install

# Create .env.local with required credentials
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Sentinel Hub Credentials
SH_CLIENT_ID=your_client_id
SH_CLIENT_SECRET=your_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenWeatherMap (Optional)
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_api_key

# Configuration (Optional)
SENTINEL_MAX_CLOUD_COVER=20
NDVI_DROP_FRACTION=0.15
MIN_NDVI_THRESHOLD=0.3
```

## 🗄️ Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration:
   ```sql
   -- Execute: supabase/migrations/20240126000000_init_schema.sql
   ```
3. Create a `field-maps` storage bucket

## 📦 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + PostGIS)
- **APIs**: Sentinel Hub, OpenWeatherMap
- **ML**: TensorFlow.js for disease detection
- **Maps**: Leaflet + React-Leaflet

## 📁 Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # Reusable React components
├── config/          # Configuration files
├── contexts/        # React contexts
├── lib/             # Utility functions and services
├── messages/        # i18n translations
supabase/           # Database migrations
public/             # Static assets
```

## 🛠️ Scripts

```bash
npm run dev         # Start dev server
npm run build       # Build for production
npm start           # Start production server
npm run lint        # Run ESLint
```

## 🔐 Security

- Environment variables are never exposed to the client
- Sentinel Hub credentials stored securely server-side
- Supabase provides authentication and authorization

## 📝 License

MIT
