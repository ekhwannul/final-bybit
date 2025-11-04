// Candlestick Pattern Detection Library
// Simplified version based on candlestick-main library

class CandlestickPatterns {
    constructor() {
        this.patterns = [];
    }

    // Utility functions
    precomputeCandleProps(candles) {
        return candles.map(candle => {
            const bodyLen = Math.abs(candle.close - candle.open);
            const wickLen = candle.high - Math.max(candle.open, candle.close);
            const tailLen = Math.min(candle.open, candle.close) - candle.low;
            const isBullish = candle.close > candle.open;
            const isBearish = candle.close < candle.open;
            const isDoji = bodyLen <= (candle.high - candle.low) * 0.1;
            
            return {
                ...candle,
                bodyLen,
                wickLen,
                tailLen,
                isBullish,
                isBearish,
                isDoji
            };
        });
    }

    // Hammer Pattern
    isHammer(candle) {
        const range = candle.high - candle.low;
        return (
            range > 0 &&
            candle.tailLen >= 2 * candle.bodyLen &&
            candle.wickLen <= candle.bodyLen &&
            Math.max(candle.open, candle.close) > candle.low + (range * 2) / 3
        );
    }

    // Doji Pattern
    isDoji(candle) {
        return candle.isDoji;
    }

    // Engulfing Patterns
    isBullishEngulfing(prev, curr) {
        return (
            prev.isBearish &&
            curr.isBullish &&
            curr.open < prev.close &&
            curr.close > prev.open
        );
    }

    isBearishEngulfing(prev, curr) {
        return (
            prev.isBullish &&
            curr.isBearish &&
            curr.open > prev.close &&
            curr.close < prev.open
        );
    }

    // Morning Star Pattern
    isMorningStar(candle1, candle2, candle3) {
        return (
            candle1.isBearish &&
            candle2.bodyLen < candle1.bodyLen * 0.3 &&
            candle3.isBullish &&
            candle3.close > (candle1.open + candle1.close) / 2
        );
    }

    // Evening Star Pattern
    isEveningStar(candle1, candle2, candle3) {
        return (
            candle1.isBullish &&
            candle2.bodyLen < candle1.bodyLen * 0.3 &&
            candle3.isBearish &&
            candle3.close < (candle1.open + candle1.close) / 2
        );
    }

    // Shooting Star Pattern
    isShootingStar(candle) {
        const range = candle.high - candle.low;
        return (
            range > 0 &&
            candle.wickLen >= 2 * candle.bodyLen &&
            candle.tailLen <= candle.bodyLen &&
            Math.min(candle.open, candle.close) < candle.low + (range * 1) / 3
        );
    }

    // Analyze patterns in candlestick data
    analyzePatterns(candleData) {
        if (!candleData || candleData.length < 3) return [];

        const candles = this.precomputeCandleProps(candleData);
        const patterns = [];
        const lastIndex = candles.length - 1;

        // Check single candle patterns on last candle
        const lastCandle = candles[lastIndex];
        
        if (this.isHammer(lastCandle)) {
            patterns.push({
                name: 'Hammer',
                signal: lastCandle.isBullish ? 'Bullish' : 'Bearish',
                strength: 'Medium',
                description: 'Potential reversal pattern'
            });
        }

        if (this.isDoji(lastCandle)) {
            patterns.push({
                name: 'Doji',
                signal: 'Neutral',
                strength: 'Medium',
                description: 'Indecision in market'
            });
        }

        if (this.isShootingStar(lastCandle)) {
            patterns.push({
                name: 'Shooting Star',
                signal: 'Bearish',
                strength: 'Medium',
                description: 'Potential bearish reversal'
            });
        }

        // Check two candle patterns
        if (candles.length >= 2) {
            const prevCandle = candles[lastIndex - 1];
            
            if (this.isBullishEngulfing(prevCandle, lastCandle)) {
                patterns.push({
                    name: 'Bullish Engulfing',
                    signal: 'Bullish',
                    strength: 'Strong',
                    description: 'Strong bullish reversal signal'
                });
            }

            if (this.isBearishEngulfing(prevCandle, lastCandle)) {
                patterns.push({
                    name: 'Bearish Engulfing',
                    signal: 'Bearish',
                    strength: 'Strong',
                    description: 'Strong bearish reversal signal'
                });
            }
        }

        // Check three candle patterns
        if (candles.length >= 3) {
            const candle1 = candles[lastIndex - 2];
            const candle2 = candles[lastIndex - 1];
            const candle3 = candles[lastIndex];

            if (this.isMorningStar(candle1, candle2, candle3)) {
                patterns.push({
                    name: 'Morning Star',
                    signal: 'Bullish',
                    strength: 'Strong',
                    description: 'Strong bullish reversal pattern'
                });
            }

            if (this.isEveningStar(candle1, candle2, candle3)) {
                patterns.push({
                    name: 'Evening Star',
                    signal: 'Bearish',
                    strength: 'Strong',
                    description: 'Strong bearish reversal pattern'
                });
            }
        }

        return patterns;
    }
}

// Export for use in main application
window.CandlestickPatterns = CandlestickPatterns;