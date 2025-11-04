class MarketScanner {
    constructor() {
        this.symbols = BYBIT_SYMBOLS;
        this.marketData = [];
        this.currentSort = '24h';
        this.currentFilter = 'all';
        this.groqAI = new GroqAI();
        this.bybitAPI = new BybitAPI();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadMarketData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderTable();
        });

        document.getElementById('filterBy').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderTable();
        });

        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadMarketData();
        });

        document.getElementById('aiSearchBtn').addEventListener('click', () => {
            this.performAISearch();
        });

        document.getElementById('aiSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performAISearch();
            }
        });
    }

    async loadMarketData() {
        const refreshBtn = document.getElementById('refreshBtn');
        const icon = refreshBtn.querySelector('i');
        
        icon.classList.add('fa-spin');
        
        try {
            this.marketData = await this.generateMarketData();
            this.renderTable();
        } catch (error) {
            console.error('Error loading market data:', error);
        } finally {
            icon.classList.remove('fa-spin');
        }
    }

    async generateMarketData() {
        try {
            const allTickers = await this.bybitAPI.getAllTickers();
            if (!allTickers) throw new Error('Failed to fetch tickers');

            const usdtPairs = allTickers.filter(t => t.symbol.endsWith('USDT'));
            const topSymbols = usdtPairs.slice(0, 100);
            
            return topSymbols.map(ticker => ({
                symbol: ticker.symbol,
                price: ticker.price,
                changes: {
                    '1m': 0, '5m': 0, '15m': 0, '1h': 0, '2h': 0, '24h': ticker.change24h
                },
                volume: ticker.volume
            }));
        } catch (error) {
            console.error('Error generating market data:', error);
            return [];
        }
    }

    async calculateQuickChanges(symbol, currentPrice) {
        try {
            const klines1m = await this.bybitAPI.getKlines(symbol, '1', 2);
            const klines5m = await this.bybitAPI.getKlines(symbol, '5', 2);
            const klines15m = await this.bybitAPI.getKlines(symbol, '15', 2);
            const klines1h = await this.bybitAPI.getKlines(symbol, '60', 2);
            const klines2h = await this.bybitAPI.getKlines(symbol, '120', 2);
            const klines24h = await this.bybitAPI.getKlines(symbol, 'D', 2);

            return {
                '1m': this.calcChange(klines1m, currentPrice),
                '5m': this.calcChange(klines5m, currentPrice),
                '15m': this.calcChange(klines15m, currentPrice),
                '1h': this.calcChange(klines1h, currentPrice),
                '2h': this.calcChange(klines2h, currentPrice),
                '24h': this.calcChange(klines24h, currentPrice)
            };
        } catch (error) {
            return null;
        }
    }

    calcChange(klines, currentPrice) {
        if (!klines || klines.length < 1) return 0;
        const oldPrice = klines[0].open;
        return ((currentPrice - oldPrice) / oldPrice) * 100;
    }

    getBasePrice(symbol) {
        const prices = {
            'BTCUSDT': 97000, 'ETHUSDT': 3350, 'BNBUSDT': 695, 'ADAUSDT': 0.95, 'XRPUSDT': 2.45,
            'SOLUSDT': 195, 'DOGEUSDT': 0.32, 'DOTUSDT': 6.8, 'AVAXUSDT': 38, 'MATICUSDT': 0.48,
            'LINKUSDT': 22, 'LTCUSDT': 105, 'ATOMUSDT': 6.5, 'UNIUSDT': 13, 'FILUSDT': 5.2,
            'NEARUSDT': 5.5, 'APTUSDT': 9.5, 'ARBUSDT': 0.78, 'OPUSDT': 1.85, 'SUIUSDT': 4.2,
            'INJUSDT': 28, 'SEIUSDT': 0.42, 'TIAUSDT': 6.8, 'WLDUSDT': 2.2, 'JUPUSDT': 1.05,
            'STRKUSDT': 0.52, 'PYTHUSDT': 0.38, 'DYMUSDT': 2.8, 'ALTUSDT': 0.12, 'JTOUSDT': 3.5,
            'MANTAUSDT': 1.2, 'ONDOUSDT': 0.95, 'PIXELUSDT': 0.18, 'PORTALUSDT': 0.35, 'AXLUSDT': 0.58,
            'METISUSDT': 45, 'AEVOUSDT': 0.42, 'BOMEUSDT': 0.0085, 'ETHFIUSDT': 2.1, 'ENAUSDT': 0.95,
            'WUSDT': 0.28, 'TNSRUSDT': 0.65, 'SAGAUSDT': 1.85, 'TAOUSDT': 485, 'REZUSDT': 0.048,
            'NOTUSDT': 0.0065, 'IOUSDT': 2.8, 'ZKUSDT': 0.18, 'ZROUSDT': 4.2, 'GUSDT': 0.032,
            'RENDERUSDT': 7.2, 'TONUSDT': 5.4, 'DOGSUSDT': 0.00058, 'POPCATUSDT': 0.42, 'NEIROUSDT': 0.0012,
            'HMSTRUSDT': 0.0038, 'CATIUSDT': 0.48, 'EIGENUSDT': 3.8, 'GOATUSDT': 0.52, 'PNUTUSDT': 0.68,
            'ACTUSDT': 0.32, 'MOVEUSDT': 0.78, 'MEUSDT': 0.0095, 'VANAUSDT': 18.5, 'PENGUUSDT': 0.028,
            'HYPEUSDT': 28, 'VIRTUALUSDT': 2.85, 'AEROUSDT': 1.25, 'MORPHOUSDT': 1.95, 'CHILLGUYUSDT': 0.18
        };
        return prices[symbol] || 1;
    }

    renderTable() {
        const tbody = document.getElementById('scannerTableBody');
        let filteredData = [...this.marketData];

        // Apply filter
        if (this.currentFilter === 'gainers') {
            filteredData = filteredData.filter(item => item.changes[this.currentSort] > 0);
        } else if (this.currentFilter === 'losers') {
            filteredData = filteredData.filter(item => item.changes[this.currentSort] < 0);
        }

        // Sort by selected timeframe
        filteredData.sort((a, b) => b.changes[this.currentSort] - a.changes[this.currentSort]);

        tbody.innerHTML = filteredData.map(item => `
            <tr>
                <td class="symbol-cell">${item.symbol.replace('USDT', '/USDT')}</td>
                <td class="price-cell">$${item.price.toFixed(4)}</td>
                <td class="change-cell ${this.getChangeClass(item.changes['1m'])}">
                    ${this.formatChange(item.changes['1m'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['5m'])}">
                    ${this.formatChange(item.changes['5m'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['15m'])}">
                    ${this.formatChange(item.changes['15m'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['1h'])}">
                    ${this.formatChange(item.changes['1h'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['2h'])}">
                    ${this.formatChange(item.changes['2h'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['24h'])}">
                    ${this.formatChange(item.changes['24h'])}
                </td>
                <td class="volume-cell">${this.formatVolume(item.volume)}</td>
                <td>
                    <button class="analyze-btn" onclick="window.analyzeSymbol('${item.symbol}')">
                        Analyze
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getChangeClass(change) {
        if (change > 0) return 'change-positive';
        if (change < 0) return 'change-negative';
        return 'change-neutral';
    }

    formatChange(change) {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    }

    formatVolume(volume) {
        if (volume >= 1000000) {
            return `${(volume / 1000000).toFixed(1)}M`;
        } else if (volume >= 1000) {
            return `${(volume / 1000).toFixed(1)}K`;
        }
        return volume.toFixed(0);
    }

    analyzeSymbol(symbol) {
        // Redirect to main analyzer with selected symbol
        window.location.href = `index.html?symbol=${symbol}`;
    }

    async performAISearch() {
        const searchInput = document.getElementById('aiSearch');
        const query = searchInput.value.trim();
        
        if (!query) {
            alert('Sila masukkan query search');
            return;
        }

        const searchBtn = document.getElementById('aiSearchBtn');
        const icon = searchBtn.querySelector('i');
        icon.classList.add('fa-spin');

        try {
            // Get AI search results
            const matchingSymbols = await this.groqAI.searchCoins(query, this.marketData);
            
            if (matchingSymbols.length > 0) {
                // Filter table to show only matching symbols
                this.renderFilteredTable(matchingSymbols);
                
                // Get market sentiment
                const sentiment = await this.groqAI.analyzeSentiment(this.marketData);
                this.displaySentiment(sentiment);
            } else {
                alert('Tiada coin yang sepadan dengan query anda');
            }
        } catch (error) {
            console.error('AI Search Error:', error);
            alert('Error dalam AI search');
        } finally {
            icon.classList.remove('fa-spin');
        }
    }

    renderFilteredTable(symbols) {
        const tbody = document.getElementById('scannerTableBody');
        const filteredData = this.marketData.filter(item => symbols.includes(item.symbol));
        
        if (filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="loading-row">Tiada hasil</td></tr>';
            return;
        }

        tbody.innerHTML = filteredData.map(item => `
            <tr>
                <td class="symbol-cell">${item.symbol.replace('USDT', '/USDT')}</td>
                <td class="price-cell">$${item.price.toFixed(4)}</td>
                <td class="change-cell ${this.getChangeClass(item.changes['1m'])}">
                    ${this.formatChange(item.changes['1m'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['5m'])}">
                    ${this.formatChange(item.changes['5m'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['15m'])}">
                    ${this.formatChange(item.changes['15m'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['1h'])}">
                    ${this.formatChange(item.changes['1h'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['2h'])}">
                    ${this.formatChange(item.changes['2h'])}
                </td>
                <td class="change-cell ${this.getChangeClass(item.changes['24h'])}">
                    ${this.formatChange(item.changes['24h'])}
                </td>
                <td class="volume-cell">${this.formatVolume(item.volume)}</td>
                <td>
                    <button class="analyze-btn" onclick="window.analyzeSymbol('${item.symbol}')">
                        Analyze
                    </button>
                </td>
            </tr>
        `).join('');
    }

    displaySentiment(sentiment) {
        const sentimentPanel = document.getElementById('aiSentiment');
        const sentimentResult = document.getElementById('sentimentResult');
        
        if (!sentiment) {
            sentimentPanel.style.display = 'none';
            return;
        }

        sentimentPanel.style.display = 'block';
        
        const sentimentColor = sentiment.sentiment === 'bullish' ? '#00ff7f' : 
                              sentiment.sentiment === 'bearish' ? '#ff453a' : '#ffd60a';
        
        sentimentResult.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <strong style="color: ${sentimentColor}; font-size: 1.2rem;">
                        ${sentiment.sentiment.toUpperCase()}
                    </strong>
                    <span style="margin-left: 10px; color: #b8bcc8;">
                        Confidence: ${sentiment.confidence}
                    </span>
                </div>
            </div>
            <p style="margin-top: 10px;">${sentiment.summary}</p>
        `;
    }

    startAutoRefresh() {
        // Refresh data every 30 seconds
        setInterval(() => {
            this.loadMarketData();
        }, 30000);
    }
}

// Global function for analyze button
window.analyzeSymbol = function(symbol) {
    window.location.href = `index.html?symbol=${symbol}`;
};

// Initialize scanner when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MarketScanner();
});