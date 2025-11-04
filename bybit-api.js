// Bybit API Integration - Real-time Data
class BybitAPI {
    constructor() {
        this.baseUrl = 'https://api.bybit.com';
        this.wsUrl = 'wss://stream.bybit.com/v5/public/linear';
        this.ws = null;
        this.wsCallbacks = {};
    }

    // Get real-time klines/candlestick data
    async getKlines(symbol, interval, limit = 200) {
        try {
            const endpoint = `${this.baseUrl}/v5/market/kline`;
            const params = new URLSearchParams({
                category: 'linear',
                symbol: symbol,
                interval: interval,
                limit: Math.min(limit, 1000),
                _t: Date.now()
            });

            const response = await fetch(`${endpoint}?${params}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            const data = await response.json();

            if (data.retCode !== 0) {
                throw new Error(data.retMsg);
            }

            return data.result.list.reverse().map(candle => ({
                time: parseInt(candle[0]) / 1000,
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
            }));
        } catch (error) {
            console.error('Bybit API Error:', error);
            return null;
        }
    }

    // Get current ticker price
    async getTicker(symbol) {
        try {
            const endpoint = `${this.baseUrl}/v5/market/tickers`;
            const params = new URLSearchParams({
                category: 'linear',
                symbol: symbol
            });

            const response = await fetch(`${endpoint}?${params}`);
            const data = await response.json();

            if (data.retCode !== 0) {
                throw new Error(data.retMsg);
            }

            const ticker = data.result.list[0];
            return {
                symbol: ticker.symbol,
                lastPrice: parseFloat(ticker.lastPrice),
                price24hPcnt: parseFloat(ticker.price24hPcnt) * 100,
                volume24h: parseFloat(ticker.volume24h),
                highPrice24h: parseFloat(ticker.highPrice24h),
                lowPrice24h: parseFloat(ticker.lowPrice24h)
            };
        } catch (error) {
            console.error('Bybit Ticker Error:', error);
            return null;
        }
    }

    // Get all tickers for scanner
    async getAllTickers() {
        try {
            const endpoint = `${this.baseUrl}/v5/market/tickers`;
            const params = new URLSearchParams({
                category: 'linear'
            });

            const response = await fetch(`${endpoint}?${params}`);
            const data = await response.json();

            if (data.retCode !== 0) {
                throw new Error(data.retMsg);
            }

            return data.result.list.map(ticker => ({
                symbol: ticker.symbol,
                price: parseFloat(ticker.lastPrice),
                change24h: parseFloat(ticker.price24hPcnt) * 100,
                volume: parseFloat(ticker.volume24h),
                high24h: parseFloat(ticker.highPrice24h),
                low24h: parseFloat(ticker.lowPrice24h)
            }));
        } catch (error) {
            console.error('Bybit All Tickers Error:', error);
            return null;
        }
    }

    // Calculate percentage change for different timeframes
    async calculateTimeframeChanges(symbol) {
        try {
            const intervals = {
                '1m': '1',
                '5m': '5', 
                '15m': '15',
                '1h': '60',
                '2h': '120',
                '24h': 'D'
            };

            const changes = {};
            const currentPrice = await this.getTicker(symbol);
            
            if (!currentPrice) return null;

            for (const [key, interval] of Object.entries(intervals)) {
                const limit = key === '24h' ? 2 : key === '2h' ? 3 : key === '1h' ? 2 : 2;
                const klines = await this.getKlines(symbol, interval, limit);
                
                if (klines && klines.length >= 2) {
                    const oldPrice = klines[0].open;
                    const newPrice = currentPrice.lastPrice;
                    changes[key] = ((newPrice - oldPrice) / oldPrice) * 100;
                }
            }

            return {
                symbol,
                price: currentPrice.lastPrice,
                changes,
                volume: currentPrice.volume24h
            };
        } catch (error) {
            console.error('Calculate changes error:', error);
            return null;
        }
    }

    // Convert timeframe to Bybit interval format
    getBybitInterval(minutes) {
        const intervalMap = {
            '1': '1',
            '5': '5',
            '15': '15',
            '30': '30',
            '60': '60',
            '240': '240',
            '1440': 'D'
        };
        return intervalMap[minutes] || '5';
    }

    // WebSocket for real-time updates
    connectWebSocket(symbol, interval, callback, statusCallback) {
        if (this.ws) this.ws.close();

        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
            console.log('✓ WebSocket connected');
            statusCallback('connected');
            this.ws.send(JSON.stringify({
                op: 'subscribe',
                args: [`kline.${interval}.${symbol}`]
            }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.topic && data.data) {
                const candle = data.data[0];
                const formattedCandle = {
                    time: parseInt(candle.start) / 1000,
                    open: parseFloat(candle.open),
                    high: parseFloat(candle.high),
                    low: parseFloat(candle.low),
                    close: parseFloat(candle.close),
                    volume: parseFloat(candle.volume)
                };
                callback(formattedCandle);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            statusCallback('error');
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket closed');
            statusCallback('disconnected');
        };
    }

    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    isWebSocketConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

window.BybitAPI = BybitAPI;