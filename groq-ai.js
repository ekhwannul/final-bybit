// Groq AI Integration
class GroqAI {
    constructor() {
        this.apiKey = 'YOUR_GROQ_API_KEY_HERE';
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
    }

    async query(messages) {
        try {
            const response = await fetch('/api/groq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (!response.ok) throw new Error('Groq API error');
            
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Groq AI Error:', error);
            return null;
        }
    }

    // Natural Language Search
    async searchCoins(query, marketData) {
        const messages = [
            {
                role: 'system',
                content: 'You are a crypto market assistant. Analyze the market data and return ONLY a JSON array of matching symbols. Example: ["BTCUSDT","ETHUSDT"]'
            },
            {
                role: 'user',
                content: `Market Data: ${JSON.stringify(marketData)}\n\nUser Query: "${query}"\n\nReturn matching symbols as JSON array only.`
            }
        ];

        const response = await this.query(messages);
        if (!response) return [];

        try {
            const match = response.match(/\[.*\]/);
            return match ? JSON.parse(match[0]) : [];
        } catch {
            return [];
        }
    }

    // Market Sentiment Analysis
    async analyzeSentiment(marketData) {
        const messages = [
            {
                role: 'system',
                content: 'You are a crypto market sentiment analyst. Analyze market data and provide sentiment in JSON format: {"sentiment":"bullish/bearish/neutral","confidence":"high/medium/low","summary":"brief explanation"}'
            },
            {
                role: 'user',
                content: `Analyze this market data and provide sentiment:\n${JSON.stringify(marketData.slice(0, 10))}`
            }
        ];

        const response = await this.query(messages);
        if (!response) return null;

        try {
            const match = response.match(/\{.*\}/s);
            return match ? JSON.parse(match[0]) : null;
        } catch {
            return null;
        }
    }

    // Smart Alerts Detection
    async detectAlerts(symbol, technicalData, patterns) {
        const messages = [
            {
                role: 'system',
                content: 'You are a trading alert system. Analyze technical data and patterns to detect important trading opportunities. Return JSON: {"hasAlert":true/false,"type":"breakout/reversal/momentum","message":"alert description","urgency":"high/medium/low"}'
            },
            {
                role: 'user',
                content: `Symbol: ${symbol}\nTechnical Data: ${JSON.stringify(technicalData)}\nPatterns: ${JSON.stringify(patterns)}\n\nDetect any important trading alerts.`
            }
        ];

        const response = await this.query(messages);
        if (!response) return null;

        try {
            const match = response.match(/\{.*\}/s);
            return match ? JSON.parse(match[0]) : null;
        } catch {
            return null;
        }
    }

    // Market Insights
    async getMarketInsights(marketData) {
        const topGainers = marketData.slice(0, 5).map(d => ({
            symbol: d.symbol,
            change24h: d.changes['24h']
        }));

        const messages = [
            {
                role: 'system',
                content: 'You are a crypto market analyst. Provide brief market insights based on top movers. Keep response under 100 words.'
            },
            {
                role: 'user',
                content: `Top gainers in 24h: ${JSON.stringify(topGainers)}\n\nProvide market insights.`
            }
        ];

        return await this.query(messages);
    }

    // Trading Recommendation (NOT for technical analysis)
    async getTradingRecommendation(symbol, signal, patterns) {
        const messages = [
            {
                role: 'system',
                content: 'You are a trading advisor. Based on the technical signal and patterns provided, give a brief trading recommendation (entry, stop loss, take profit suggestions). Keep it concise.'
            },
            {
                role: 'user',
                content: `Symbol: ${symbol}\nSignal: ${signal.signal} (${signal.confidence} confidence)\nPatterns: ${patterns.map(p => p.name).join(', ')}\n\nProvide trading recommendation.`
            }
        ];

        return await this.query(messages);
    }

    // Explain Patterns in Simple Terms
    async explainPatterns(patterns) {
        if (patterns.length === 0) return 'No patterns detected.';

        const messages = [
            {
                role: 'system',
                content: 'You are a trading educator. Explain candlestick patterns in simple Malay language. Keep it brief and actionable.'
            },
            {
                role: 'user',
                content: `Explain these patterns: ${patterns.map(p => p.name).join(', ')}`
            }
        ];

        return await this.query(messages);
    }
}

window.GroqAI = GroqAI;