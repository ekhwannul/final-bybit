# Bybit Analyzer Pro

Advanced cryptocurrency trading analyzer with real-time data from Bybit, AI-powered insights, and futures trading simulator.

## Features

### 📊 Real-Time Chart Analysis
- TradingView widget integration with Bybit data
- Multiple timeframe support (1m, 5m, 15m, 1h, 4h, 1D)
- WebSocket real-time price updates
- 500+ cryptocurrency pairs

### 🤖 AI-Powered Insights
- Candlestick pattern detection
- Technical indicators (RSI, MACD, EMA, Volume)
- AI trading recommendations (Groq AI)
- Smart alerts and market sentiment

### 💰 Futures Trading Simulator
- Long/Short positions with leverage (1x-20x)
- Real-time PnL calculation
- Margin call detection
- Trade history tracking
- Custom capital management

### 📈 Market Scanner
- Real-time market data for 100+ coins
- Multi-timeframe change tracking (1m, 5m, 15m, 1h, 2h, 24h)
- Gainers/Losers filter
- AI-powered coin search

### 👤 User System
- Sign up & Login
- Save watchlist
- Save trade history
- Persistent data storage (localStorage)

## Setup

### Local Development

1. Clone repository:
```bash
git clone https://github.com/ekhwannul/final-bybit.git
cd final-bybit/bybit-analyzer
```

2. Open `index.html` in browser

### Deploy to Vercel

1. Fork/Clone repository
2. Import to Vercel
3. Add environment variable:
   - Key: `GROQ_API_KEY`
   - Value: Your Groq API key
4. Deploy

**Note**: API key akan secure dalam serverless function, tidak exposed di client

## API Keys

### Groq AI API
Get free API key: https://console.groq.com/keys

**For Vercel Deployment:**
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add: `GROQ_API_KEY` = your_api_key
3. Redeploy

**For Local Development:**
API proxy tidak akan berfungsi locally. Untuk test locally, masukkan API key terus dalam `groq-ai.js` (jangan commit!)

## Technologies

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Chart**: TradingView Widget
- **Data Source**: Bybit API (REST + WebSocket)
- **AI**: Groq AI (Llama 3.3 70B)
- **Storage**: localStorage

## File Structure

```
bybit-analyzer/
├── index.html              # Main analyzer page
├── scanner.html            # Market scanner page
├── style.css              # Main styles
├── scanner-style.css      # Scanner styles
├── app.js                 # Main application logic
├── scanner.js             # Scanner logic
├── bybit-api.js           # Bybit API integration
├── bybit-symbols.js       # Cryptocurrency symbols
├── candlestick-patterns.js # Pattern detection
├── technical-indicators.js # Technical analysis
└── groq-ai.js             # AI integration
```

## Features Detail

### Chart Analysis
- Real-time candlestick chart from Bybit
- Automatic timeframe sync with analysis
- Pattern detection (Doji, Hammer, Engulfing, etc)
- Technical indicators calculation

### Trade Simulator
- Simulate futures trading without risk
- Track performance with trade history
- Margin call protection
- Reset functionality

### Watchlist
- Add coins to watchlist
- Track entry price vs current price
- Real-time percentage change
- Color-coded (green/red)

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Notes

- All data from Bybit public API (no authentication required)
- AI features require Groq API key
- Data saved locally in browser (localStorage)
- No backend server required

## License

MIT License

## Author

Created by ekhwannul

## Support

For issues or questions, open an issue on GitHub.
