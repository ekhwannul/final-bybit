// Main Application Logic
class BybitAnalyzer {
    constructor() {
        this.patternDetector = new CandlestickPatterns();
        this.indicators = new TechnicalIndicators();
        this.groqAI = new GroqAI();
        this.bybitAPI = new BybitAPI();
        this.chart = null;
        this.tvWidget = null;
        this.currentSymbol = '';
        this.currentTimeframe = '5';
        this.candleData = [];
        this.autoRefreshInterval = null;
        this.tradePosition = null;
        this.watchlist = [];
        this.tradeHistory = [];
        this.initialCapital = 1000;
        this.currentCapital = 1000;
        this.isLoggedIn = false;
        this.currentUser = null;
        
        this.init();
    }

    init() {
        this.loadBybitSymbols();
        this.setupEventListeners();
        this.updateStatus();
    }

    // Load Bybit futures symbols
    async loadBybitSymbols() {
        const coinSelect = document.getElementById('coinSelect');
        
        try {
            coinSelect.innerHTML = '<option value="">Memuat coin...</option>';
            
            const allTickers = await this.bybitAPI.getAllTickers();
            const symbols = allTickers.map(t => t.symbol).sort();
            
            coinSelect.innerHTML = '<option value="">Pilih Cryptocurrency</option>';
            symbols.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = symbol.replace('USDT', '/USDT');
                coinSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading symbols:', error);
            coinSelect.innerHTML = '<option value="">Error loading symbols</option>';
        }
    }

    setupEventListeners() {
        const coinSelect = document.getElementById('coinSelect');
        
        coinSelect.addEventListener('change', (e) => {
            this.currentSymbol = e.target.value;
            if (this.currentSymbol) {
                document.getElementById('chartTitle').textContent = `${this.currentSymbol} Chart Analysis`;
                this.analyzeChart();
            }
        });

        document.getElementById('longBtn').addEventListener('click', () => this.openPosition('LONG'));
        document.getElementById('shortBtn').addEventListener('click', () => this.openPosition('SHORT'));
        document.getElementById('closePosition').addEventListener('click', () => this.closePosition());
        document.getElementById('refreshAnalysisBtn').addEventListener('click', () => this.refreshAnalysis());
        document.getElementById('leverage').addEventListener('input', (e) => {
            document.getElementById('leverageValue').textContent = `${e.target.value}x`;
        });
        document.getElementById('resetSimulator').addEventListener('click', () => this.resetSimulator());
        document.getElementById('addWatchlistBtn').addEventListener('click', () => this.addToWatchlist());
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('loginSubmitBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('signupBtn').addEventListener('click', () => this.handleSignup());
        document.getElementById('loginCancelBtn').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('initialCapital').addEventListener('change', (e) => {
            this.initialCapital = parseFloat(e.target.value);
            this.currentCapital = this.initialCapital;
            this.updateCapitalDisplay();
        });

        // Check for symbol parameter from URL
        this.checkUrlParams();
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const symbol = urlParams.get('symbol');
        if (symbol) {
            const coinSelect = document.getElementById('coinSelect');
            coinSelect.value = symbol;
            this.currentSymbol = symbol;
            document.getElementById('chartTitle').textContent = `${symbol} Chart Analysis`;
            // Auto analyze when coming from scanner
            setTimeout(() => this.analyzeChart(), 1000);
        }
    }

    async analyzeChart() {
        if (!this.currentSymbol) {
            return;
        }

        this.showLoading(true);

        try {
            await this.fetchCandleData();
            this.createChart();
            await this.performAnalysis();
            this.startAutoRefresh();
            this.startWebSocketUpdates();
        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = setInterval(async () => {
            if (this.currentSymbol) {
                await this.updatePriceInfo();
            }
            if (this.watchlist.length > 0) {
                this.renderWatchlist();
            }
        }, 3000);
    }

    startWebSocketUpdates() {
        const interval = this.bybitAPI.getBybitInterval(this.currentTimeframe);
        this.bybitAPI.connectWebSocket(
            this.currentSymbol, 
            interval, 
            (newCandle) => {
                if (this.candleData.length > 0) {
                    const lastCandle = this.candleData[this.candleData.length - 1];
                    if (lastCandle.time === newCandle.time) {
                        this.candleData[this.candleData.length - 1] = newCandle;
                    } else {
                        this.candleData.push(newCandle);
                        if (this.candleData.length > 500) this.candleData.shift();
                    }
                    console.log('✓ Real-time update:', newCandle.close);
                }
            },
            (status) => this.updateWebSocketStatus(status)
        );
    }

    updateWebSocketStatus(status) {
        const wsStatus = document.getElementById('wsStatus');
        const dot = wsStatus.querySelector('.status-dot');
        const text = wsStatus.querySelector('span:last-child');
        
        if (status === 'connected') {
            dot.style.background = '#00ff7f';
            text.textContent = 'WebSocket: Connected';
        } else if (status === 'error') {
            dot.style.background = '#ff453a';
            text.textContent = 'WebSocket: Error';
        } else {
            dot.style.background = '#666';
            text.textContent = 'WebSocket: Disconnected';
        }
    }

    async updatePriceInfo() {
        try {
            const ticker = await this.bybitAPI.getTicker(this.currentSymbol);
            if (ticker) {
                const change = ticker.price24hPcnt;
                document.getElementById('priceInfo').innerHTML = `
                    <div style="color: ${change >= 0 ? '#00ff7f' : '#ff453a'}">
                        <strong>$${ticker.lastPrice.toFixed(4)}</strong>
                        <span>${change >= 0 ? '+' : ''}${change.toFixed(2)}% (24h)</span>
                    </div>
                `;
                document.getElementById('currentPrice').textContent = `$${ticker.lastPrice.toFixed(4)}`;
                if (this.tradePosition) {
                    this.updatePnL(ticker.lastPrice);
                }
            }
        } catch (error) {
            console.error('Update error:', error);
        }
    }

    async fetchCandleData() {
        try {
            const interval = this.bybitAPI.getBybitInterval(this.currentTimeframe);
            const klines = await this.bybitAPI.getKlines(this.currentSymbol, interval, 500);
            
            if (!klines || klines.length === 0) {
                throw new Error('Failed to fetch data from Bybit');
            }
            
            this.candleData = klines;
            const latest = klines[klines.length - 1];
            const oldest = klines[0];
            console.log(`✓ ${this.currentSymbol} - ${klines.length} candles loaded`);
            console.log('Oldest:', new Date(oldest.time * 1000).toLocaleString(), oldest);
            console.log('Latest:', new Date(latest.time * 1000).toLocaleString(), latest);
            console.log('Interval:', this.currentTimeframe, 'min');

            const ticker = await this.bybitAPI.getTicker(this.currentSymbol);
            if (ticker) {
                const change = ticker.price24hPcnt;
                const lastCandle = klines[klines.length - 1];
                document.getElementById('priceInfo').innerHTML = `
                    <div style="color: ${change >= 0 ? '#00ff7f' : '#ff453a'}">
                        <strong>$${ticker.lastPrice.toFixed(4)}</strong>
                        <span>${change >= 0 ? '+' : ''}${change.toFixed(2)}% (24h)</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #b8bcc8; margin-top: 5px;">
                        Candles: ${klines.length} | Last: ${new Date(lastCandle.time * 1000).toLocaleTimeString()}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error fetching Bybit data:', error);
            alert('Error: Tidak dapat mengambil data dari Bybit. Sila cuba lagi.');
            throw error;
        }
    }

    createChart() {
        const chartContainer = document.getElementById('chartContainer');
        chartContainer.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div id="tradingview_chart" style="height:500px;"></div></div>';

        const symbol = this.currentSymbol.replace('USDT', '');

        try {
            this.tvWidget = new TradingView.widget({
                "autosize": true,
                "symbol": `BYBIT:${symbol}USDT.P`,
                "interval": "5",
                "timezone": "Etc/UTC",
                "theme": "dark",
                "style": "1",
                "locale": "en",
                "toolbar_bg": "#1a1d28",
                "enable_publishing": false,
                "hide_side_toolbar": false,
                "allow_symbol_change": false,
                "container_id": "tradingview_chart",
                "studies": ["MASimple@tv-basicstudies"],
                "disabled_features": [],
                "enabled_features": ["header_interval_dialog_button", "timeframes_toolbar"],
                "onChartReady": () => {
                    try {
                        this.tvWidget.activeChart().onIntervalChanged().subscribe(null, (interval) => {
                            this.onTimeframeChange(interval);
                        });
                        console.log('✓ TradingView chart ready with timeframe selector');
                    } catch (e) {
                        console.log('Chart ready, interval listener skipped:', e.message);
                    }
                }
            });
        } catch (error) {
            console.error('TradingView widget error:', error);
        }
    }

    onTimeframeChange(interval) {
        const intervalMap = {
            '1': '1', '3': '3', '5': '5', '15': '15', '30': '30', 
            '60': '60', '120': '120', '240': '240', 'D': '1440', '1D': '1440'
        };
        this.currentTimeframe = intervalMap[interval] || '5';
        console.log('Timeframe changed:', interval, '-> Bybit:', this.currentTimeframe);
        
        if (this.currentSymbol) {
            this.fetchCandleData().then(() => {
                this.performAnalysis();
            });
        }
    }

    calculateEMAData(period) {
        const closes = this.candleData.map(c => c.close);
        const emaValues = [];
        
        if (closes.length < period) return [];
        
        // Calculate SMA for first EMA value
        let sma = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
        emaValues.push(sma);
        
        const multiplier = 2 / (period + 1);
        
        for (let i = period; i < closes.length; i++) {
            const ema = (closes[i] * multiplier) + (emaValues[emaValues.length - 1] * (1 - multiplier));
            emaValues.push(ema);
        }
        
        return this.candleData.slice(period - 1).map((candle, index) => ({
            time: candle.time,
            value: emaValues[index]
        }));
    }

    async performAnalysis() {
        const patterns = this.patternDetector.analyzePatterns(this.candleData);
        const indicators = this.indicators.analyzeIndicators(this.candleData);
        const currentPrice = this.candleData[this.candleData.length - 1].close;
        const signal = this.indicators.generateSignal(indicators, patterns, currentPrice);
        
        this.updatePatternsDisplay(patterns);
        this.updateIndicatorsDisplay(indicators);
        this.updatePredictionDisplay(signal);
        await this.getAIInsights(patterns, signal);
    }

    async refreshAnalysis() {
        if (!this.currentSymbol || this.candleData.length === 0) {
            alert('Tiada data untuk refresh');
            return;
        }

        const btn = document.getElementById('refreshAnalysisBtn');
        const icon = btn.querySelector('i');
        icon.classList.add('fa-spin');

        try {
            await this.fetchCandleData();
            await this.performAnalysis();
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            icon.classList.remove('fa-spin');
        }
    }

    updatePatternsDisplay(patterns) {
        const patternsList = document.getElementById('patternsList');
        
        if (patterns.length === 0) {
            patternsList.innerHTML = '<div class="no-patterns">Tiada pattern dikesan</div>';
            return;
        }

        patternsList.innerHTML = patterns.map(pattern => `
            <div class="pattern-item">
                <div>
                    <div class="pattern-name">${pattern.name}</div>
                    <div style="font-size: 0.8rem; color: #b8bcc8;">${pattern.description}</div>
                </div>
                <div class="pattern-signal pattern-${pattern.signal.toLowerCase()}">
                    ${pattern.signal}
                </div>
            </div>
        `).join('');
    }

    updateIndicatorsDisplay(indicators) {
        document.getElementById('rsiValue').textContent = indicators.rsi || '-';
        document.getElementById('macdValue').textContent = indicators.macd || '-';
        document.getElementById('ema20Value').textContent = indicators.ema20 ? `$${indicators.ema20}` : '-';
        
        if (indicators.volume) {
            document.getElementById('volumeValue').textContent = 
                `${indicators.volume.trend} (${(indicators.volume.ratio * 100).toFixed(0)}%)`;
        } else {
            document.getElementById('volumeValue').textContent = '-';
        }
    }

    updatePredictionDisplay(signal) {
        const predictionResult = document.getElementById('predictionResult');
        
        predictionResult.className = `prediction-result prediction-${signal.signal.toLowerCase()}`;
        predictionResult.innerHTML = `
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">
                ${signal.signal}
            </div>
            <div style="font-size: 0.9rem; margin-bottom: 10px;">
                Confidence: ${signal.confidence}
            </div>
            <div style="font-size: 0.8rem; margin-bottom: 15px;">
                ${signal.recommendation}
            </div>
            <div style="font-size: 0.7rem; color: #b8bcc8;">
                Bullish: ${signal.bullishSignals} | Bearish: ${signal.bearishSignals}
            </div>
        `;
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    async getAIInsights(patterns, signal) {
        const aiInsights = document.getElementById('aiInsights');
        const aiRecommendation = document.getElementById('aiRecommendation');
        
        // Show loading
        aiInsights.innerHTML = '<div class="ai-loading"><i class="fas fa-spinner fa-spin"></i>AI sedang menganalisis...</div>';
        aiRecommendation.innerHTML = '<div class="ai-loading"><i class="fas fa-spinner fa-spin"></i>Menyediakan cadangan...</div>';
        
        try {
            // Get pattern explanation
            const patternExplanation = await this.groqAI.explainPatterns(patterns);
            
            // Get trading recommendation
            const recommendation = await this.groqAI.getTradingRecommendation(
                this.currentSymbol,
                signal,
                patterns
            );
            
            // Get smart alerts
            const technicalData = this.indicators.analyzeIndicators(this.candleData);
            const alert = await this.groqAI.detectAlerts(
                this.currentSymbol,
                technicalData,
                patterns
            );
            
            // Update UI
            aiInsights.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <strong style="color: #00d4aa;">Pattern Explanation:</strong>
                    <p style="margin-top: 8px;">${patternExplanation || 'No patterns detected.'}</p>
                </div>
                ${alert && alert.hasAlert ? `
                    <div style="padding: 10px; background: rgba(255, 214, 10, 0.1); border-left: 3px solid #ffd60a; border-radius: 5px;">
                        <strong style="color: #ffd60a;">⚠️ Alert: ${alert.type}</strong>
                        <p style="margin-top: 5px; font-size: 0.85rem;">${alert.message}</p>
                        <span style="font-size: 0.75rem; color: #b8bcc8;">Urgency: ${alert.urgency}</span>
                    </div>
                ` : ''}
            `;
            
            aiRecommendation.innerHTML = `
                <div style="white-space: pre-line;">${recommendation || 'No recommendation available.'}</div>
            `;
            
        } catch (error) {
            console.error('AI Insights Error:', error);
            aiInsights.innerHTML = '<div class="ai-placeholder">Error loading AI insights</div>';
            aiRecommendation.innerHTML = '<div class="ai-placeholder">Error loading recommendation</div>';
        }
    }

    updateStatus() {
        const statusElement = document.getElementById('status');
        statusElement.innerHTML = `
            <span class="status-dot"></span>
            <span>Live Market Data - ${new Date().toLocaleTimeString()}</span>
        `;
        setTimeout(() => this.updateStatus(), 60000);
    }

    async openPosition(type) {
        if (!this.currentSymbol) {
            alert('Pilih coin terlebih dahulu');
            return;
        }

        const ticker = await this.bybitAPI.getTicker(this.currentSymbol);
        if (!ticker) return;

        const amount = parseFloat(document.getElementById('tradeAmount').value);
        const leverage = parseFloat(document.getElementById('leverage').value);

        this.tradePosition = {
            type: type,
            entryPrice: ticker.lastPrice,
            amount: amount,
            leverage: leverage,
            openTime: new Date()
        };

        document.getElementById('entryPrice').textContent = `$${ticker.lastPrice.toFixed(4)}`;
        document.getElementById('positionType').textContent = `${type} ${leverage}x`;
        document.getElementById('positionType').style.color = type === 'LONG' ? '#00ff7f' : '#ff453a';
        document.getElementById('closePosition').style.display = 'block';
        document.getElementById('longBtn').disabled = true;
        document.getElementById('shortBtn').disabled = true;
    }

    updatePnL(currentPrice) {
        if (!this.tradePosition) return;

        const { type, entryPrice, amount, leverage } = this.tradePosition;
        const priceChange = type === 'LONG' ? 
            (currentPrice - entryPrice) / entryPrice : 
            (entryPrice - currentPrice) / entryPrice;
        
        const pnl = amount * leverage * priceChange;
        const roi = priceChange * leverage * 100;
        const potentialCapital = this.currentCapital + pnl;

        const pnlElement = document.getElementById('pnlValue');
        pnlElement.textContent = `$${pnl.toFixed(2)}`;
        pnlElement.style.color = pnl >= 0 ? '#00ff7f' : '#ff453a';

        const roiElement = document.getElementById('roiValue');
        roiElement.textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`;
        roiElement.style.color = roi >= 0 ? '#00ff7f' : '#ff453a';

        const capitalElement = document.getElementById('currentCapital');
        capitalElement.textContent = `$${potentialCapital.toFixed(2)}`;
        capitalElement.style.color = potentialCapital >= this.initialCapital ? '#00ff7f' : '#ff453a';

        if (potentialCapital <= 0) {
            alert('⚠️ MARGIN CALL! Capital habis. Position auto-close.');
            this.closePosition();
            this.currentCapital = 0;
            this.updateCapitalDisplay();
        }
    }

    closePosition() {
        if (this.tradePosition) {
            const ticker = this.candleData[this.candleData.length - 1];
            if (ticker) {
                const { type, entryPrice, amount, leverage, openTime } = this.tradePosition;
                const exitPrice = ticker.close;
                const priceChange = type === 'LONG' ? 
                    (exitPrice - entryPrice) / entryPrice : 
                    (entryPrice - exitPrice) / entryPrice;
                const pnl = amount * leverage * priceChange;
                this.currentCapital += pnl;

                this.tradeHistory.push({
                    symbol: this.currentSymbol,
                    type: type,
                    entryPrice: entryPrice,
                    exitPrice: exitPrice,
                    amount: amount,
                    leverage: leverage,
                    pnl: pnl,
                    roi: priceChange * leverage * 100,
                    openTime: openTime,
                    closeTime: new Date()
                });

                this.renderTradeHistory();
                if (this.isLoggedIn) this.saveData();
            }
        }
        
        this.tradePosition = null;
        document.getElementById('entryPrice').textContent = '-';
        document.getElementById('positionType').textContent = '-';
        document.getElementById('pnlValue').textContent = '$0.00';
        document.getElementById('pnlValue').style.color = '#fff';
        document.getElementById('roiValue').textContent = '0.00%';
        document.getElementById('roiValue').style.color = '#fff';
        document.getElementById('closePosition').style.display = 'none';
        document.getElementById('longBtn').disabled = false;
        document.getElementById('shortBtn').disabled = false;
        this.updateCapitalDisplay();
    }

    resetSimulator() {
        this.currentCapital = this.initialCapital;
        this.tradePosition = null;
        document.getElementById('entryPrice').textContent = '-';
        document.getElementById('positionType').textContent = '-';
        document.getElementById('pnlValue').textContent = '$0.00';
        document.getElementById('roiValue').textContent = '0.00%';
        document.getElementById('closePosition').style.display = 'none';
        document.getElementById('longBtn').disabled = false;
        document.getElementById('shortBtn').disabled = false;
        this.updateCapitalDisplay();
    }

    updateCapitalDisplay() {
        const capitalElement = document.getElementById('currentCapital');
        capitalElement.textContent = `$${this.currentCapital.toFixed(2)}`;
        const diff = this.currentCapital - this.initialCapital;
        capitalElement.style.color = diff >= 0 ? '#00ff7f' : '#ff453a';
    }

    async addToWatchlist() {
        if (!this.currentSymbol) {
            alert('Pilih coin terlebih dahulu');
            return;
        }

        const ticker = await this.bybitAPI.getTicker(this.currentSymbol);
        if (!ticker) return;

        const exists = this.watchlist.find(w => w.symbol === this.currentSymbol);
        if (exists) {
            alert('Coin sudah dalam watchlist');
            return;
        }

        this.watchlist.push({
            symbol: this.currentSymbol,
            entryPrice: ticker.lastPrice,
            addedAt: new Date()
        });

        this.renderWatchlist();
        if (this.isLoggedIn) this.saveData();
    }

    async renderWatchlist() {
        const container = document.getElementById('watchlistItems');
        
        if (this.watchlist.length === 0) {
            container.innerHTML = '<div class="no-watchlist">Tiada watchlist</div>';
            return;
        }

        const items = await Promise.all(this.watchlist.map(async (item) => {
            const ticker = await this.bybitAPI.getTicker(item.symbol);
            const change = ticker ? ((ticker.lastPrice - item.entryPrice) / item.entryPrice) * 100 : 0;
            const currentPrice = ticker ? ticker.lastPrice : 0;
            
            return `
                <div class="watchlist-item">
                    <div>
                        <div class="watchlist-symbol">${item.symbol}</div>
                        <div class="watchlist-prices">
                            <span>Entry: $${item.entryPrice.toFixed(4)}</span>
                            <span>Now: $${currentPrice.toFixed(4)}</span>
                        </div>
                    </div>
                    <div>
                        <div class="watchlist-change" style="color: ${change >= 0 ? '#00ff7f' : '#ff453a'}">
                            ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
                        </div>
                        <button class="remove-watchlist-btn" onclick="window.removeFromWatchlist('${item.symbol}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }));

        container.innerHTML = items.join('');
    }

    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(w => w.symbol !== symbol);
        this.renderWatchlist();
        if (this.isLoggedIn) this.saveData();
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
    }

    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
    }

    handleSignup() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Sila masukkan username dan password');
            return;
        }

        const stored = localStorage.getItem('user_' + username);
        if (stored) {
            alert('Username sudah wujud. Sila login atau guna username lain.');
            return;
        }

        localStorage.setItem('user_' + username, JSON.stringify({ 
            password,
            createdAt: new Date().toISOString()
        }));
        
        this.isLoggedIn = true;
        this.currentUser = username;
        document.getElementById('loginBtn').innerHTML = '<i class="fas fa-user-check"></i> ' + username;
        this.hideLoginModal();
        alert('Account created successfully!');
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Sila masukkan username dan password');
            return;
        }

        const stored = localStorage.getItem('user_' + username);
        if (stored) {
            const user = JSON.parse(stored);
            if (user.password === password) {
                this.isLoggedIn = true;
                this.loadData(username);
                document.getElementById('loginBtn').innerHTML = '<i class="fas fa-user-check"></i> ' + username;
                this.hideLoginModal();
            } else {
                alert('Password salah');
            }
        } else {
            alert('Username tidak wujud. Sila sign up terlebih dahulu.');
        }
    }

    saveData() {
        if (!this.isLoggedIn || !this.currentUser) return;
        localStorage.setItem('data_' + this.currentUser, JSON.stringify({
            watchlist: this.watchlist,
            tradeHistory: this.tradeHistory,
            capital: this.currentCapital,
            initialCapital: this.initialCapital,
            lastSaved: new Date().toISOString()
        }));
    }

    loadData(username) {
        this.currentUser = username;
        const data = localStorage.getItem('data_' + username);
        if (data) {
            const parsed = JSON.parse(data);
            this.watchlist = parsed.watchlist || [];
            this.tradeHistory = parsed.tradeHistory || [];
            this.currentCapital = parsed.capital || 1000;
            this.initialCapital = parsed.initialCapital || 1000;
            document.getElementById('initialCapital').value = this.initialCapital;
            this.updateCapitalDisplay();
            this.renderWatchlist();
            this.renderTradeHistory();
        }
    }

    renderTradeHistory() {
        const container = document.getElementById('tradeHistoryItems');
        
        if (this.tradeHistory.length === 0) {
            container.innerHTML = '<div class="no-history">Tiada trade history</div>';
            return;
        }

        const items = this.tradeHistory.slice().reverse().slice(0, 10).map(trade => {
            const pnlColor = trade.pnl >= 0 ? '#00ff7f' : '#ff453a';
            return `
                <div class="history-item">
                    <div>
                        <div class="history-symbol">${trade.symbol} - ${trade.type} ${trade.leverage}x</div>
                        <div class="history-details">
                            Entry: $${trade.entryPrice.toFixed(4)} | Exit: $${trade.exitPrice.toFixed(4)}
                        </div>
                        <div class="history-time">${new Date(trade.closeTime).toLocaleString()}</div>
                    </div>
                    <div>
                        <div class="history-pnl" style="color: ${pnlColor}">
                            ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}
                        </div>
                        <div class="history-roi" style="color: ${pnlColor}">
                            ${trade.roi >= 0 ? '+' : ''}${trade.roi.toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = items;
    }
}

window.removeFromWatchlist = function(symbol) {
    const analyzer = window.bybitAnalyzer;
    if (analyzer) analyzer.removeFromWatchlist(symbol);
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bybitAnalyzer = new BybitAnalyzer();
});