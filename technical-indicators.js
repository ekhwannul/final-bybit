// Technical Indicators Library
// Simplified implementation for crypto analysis

class TechnicalIndicators {
    constructor() {}

    // Simple Moving Average
    sma(data, period) {
        if (data.length < period) return null;
        const sum = data.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    }

    // Exponential Moving Average
    ema(data, period) {
        if (data.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = this.sma(data.slice(0, period), period);
        
        for (let i = period; i < data.length; i++) {
            ema = (data[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    // Relative Strength Index
    rsi(prices, period = 14) {
        if (prices.length < period + 1) return null;

        let gains = 0;
        let losses = 0;

        // Calculate initial average gain and loss
        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        // Calculate RSI for remaining periods
        for (let i = period + 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? -change : 0;

            avgGain = ((avgGain * (period - 1)) + gain) / period;
            avgLoss = ((avgLoss * (period - 1)) + loss) / period;
        }

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    // MACD (Moving Average Convergence Divergence)
    macd(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) return null;

        const fastEMA = this.ema(prices, fastPeriod);
        const slowEMA = this.ema(prices, slowPeriod);
        
        if (!fastEMA || !slowEMA) return null;
        
        const macdLine = fastEMA - slowEMA;
        
        // For simplicity, return just the MACD line
        return macdLine;
    }

    // Bollinger Bands
    bollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) return null;

        const sma = this.sma(prices, period);
        const recentPrices = prices.slice(-period);
        
        // Calculate standard deviation
        const variance = recentPrices.reduce((sum, price) => {
            return sum + Math.pow(price - sma, 2);
        }, 0) / period;
        
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    // Volume analysis
    analyzeVolume(volumes, prices) {
        if (volumes.length < 2) return null;
        
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = this.sma(volumes.slice(-20), Math.min(20, volumes.length));
        
        const volumeRatio = currentVolume / avgVolume;
        const priceChange = prices[prices.length - 1] - prices[prices.length - 2];
        
        return {
            current: currentVolume,
            average: avgVolume,
            ratio: volumeRatio,
            trend: volumeRatio > 1.5 ? 'High' : volumeRatio < 0.5 ? 'Low' : 'Normal',
            priceVolumeAlignment: (priceChange > 0 && volumeRatio > 1) ? 'Bullish' : 
                                 (priceChange < 0 && volumeRatio > 1) ? 'Bearish' : 'Neutral'
        };
    }

    // Comprehensive analysis
    analyzeIndicators(candleData) {
        if (!candleData || candleData.length < 20) {
            return {
                rsi: null,
                macd: null,
                ema20: null,
                volume: null,
                bollinger: null
            };
        }

        const closes = candleData.map(c => c.close);
        const volumes = candleData.map(c => c.volume || 0);

        const rsi = this.rsi(closes, 14);
        const macd = this.macd(closes);
        const ema20 = this.ema(closes, 20);
        const volume = this.analyzeVolume(volumes, closes);
        const bollinger = this.bollingerBands(closes, 20);

        return {
            rsi: rsi ? rsi.toFixed(2) : null,
            macd: macd ? macd.toFixed(4) : null,
            ema20: ema20 ? ema20.toFixed(2) : null,
            volume: volume,
            bollinger: bollinger
        };
    }

    // Generate trading signal based on indicators
    generateSignal(indicators, patterns, currentPrice) {
        let bullishSignals = 0;
        let bearishSignals = 0;
        let signals = [];

        // RSI analysis
        if (indicators.rsi) {
            const rsi = parseFloat(indicators.rsi);
            if (rsi < 30) {
                bullishSignals++;
                signals.push('RSI oversold (bullish)');
            } else if (rsi > 70) {
                bearishSignals++;
                signals.push('RSI overbought (bearish)');
            }
        }

        // MACD analysis
        if (indicators.macd) {
            const macd = parseFloat(indicators.macd);
            if (macd > 0) {
                bullishSignals++;
                signals.push('MACD positive (bullish)');
            } else {
                bearishSignals++;
                signals.push('MACD negative (bearish)');
            }
        }

        // EMA analysis
        if (indicators.ema20 && currentPrice) {
            const ema = parseFloat(indicators.ema20);
            if (currentPrice > ema) {
                bullishSignals++;
                signals.push('Price above EMA20 (bullish)');
            } else {
                bearishSignals++;
                signals.push('Price below EMA20 (bearish)');
            }
        }

        // Pattern analysis
        patterns.forEach(pattern => {
            if (pattern.signal === 'Bullish') {
                bullishSignals += pattern.strength === 'Strong' ? 2 : 1;
                signals.push(`${pattern.name} pattern (bullish)`);
            } else if (pattern.signal === 'Bearish') {
                bearishSignals += pattern.strength === 'Strong' ? 2 : 1;
                signals.push(`${pattern.name} pattern (bearish)`);
            }
        });

        // Volume confirmation
        if (indicators.volume && indicators.volume.priceVolumeAlignment !== 'Neutral') {
            if (indicators.volume.priceVolumeAlignment === 'Bullish') {
                bullishSignals++;
                signals.push('Volume confirms bullish move');
            } else {
                bearishSignals++;
                signals.push('Volume confirms bearish move');
            }
        }

        // Determine overall signal
        let overallSignal = 'NEUTRAL';
        let confidence = 'Low';
        
        const totalSignals = bullishSignals + bearishSignals;
        if (totalSignals > 0) {
            const bullishRatio = bullishSignals / totalSignals;
            
            if (bullishRatio >= 0.7) {
                overallSignal = 'BULLISH';
                confidence = bullishRatio >= 0.8 ? 'High' : 'Medium';
            } else if (bullishRatio <= 0.3) {
                overallSignal = 'BEARISH';
                confidence = bullishRatio <= 0.2 ? 'High' : 'Medium';
            } else {
                confidence = 'Medium';
            }
        }

        return {
            signal: overallSignal,
            confidence: confidence,
            bullishSignals,
            bearishSignals,
            reasons: signals,
            recommendation: this.getRecommendation(overallSignal, confidence)
        };
    }

    getRecommendation(signal, confidence) {
        if (signal === 'BULLISH' && confidence === 'High') {
            return 'Strong Buy - Multiple bullish indicators align';
        } else if (signal === 'BULLISH' && confidence === 'Medium') {
            return 'Buy - Bullish bias with moderate confidence';
        } else if (signal === 'BEARISH' && confidence === 'High') {
            return 'Strong Sell - Multiple bearish indicators align';
        } else if (signal === 'BEARISH' && confidence === 'Medium') {
            return 'Sell - Bearish bias with moderate confidence';
        } else {
            return 'Hold - Mixed signals, wait for clearer direction';
        }
    }
}

// Export for use in main application
window.TechnicalIndicators = TechnicalIndicators;