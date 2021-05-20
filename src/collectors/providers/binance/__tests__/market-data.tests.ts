import { BinanceMarketData } from '../market-data'

describe("BinanceMarketData tests", () => {
    it("should standardize bar", () => {
        const bmd = new BinanceMarketData( { id: 'test', providerType: 'MarketData', name: 'test' }, 'BACKTEST' )

        const testBar = {
            symbol: 'ADAUSDT',
            startTime: 1621303680000,
            closeTime: 1621303739999,
            firstTradeId: 1914051,
            lastTradeId: 1914053,
            open: '2.03947000',
            high: '2.03948000',
            low: '2.03906000',
            close: '2.03906000',
            volume: '360.10000000',
            trades: 3,
            interval: '1m',
            isFinal: false,
            quoteVolume: '734.40185100',
            buyVolume: '6.10000000',
            quoteBuyVolume: '12.44082800'
        }

        const stdBar = bmd.translateBar(testBar)
        expect(stdBar.providerId).toBe('test')
        expect(stdBar.start).toBeDefined()
        expect(stdBar.timeframe).toBe(testBar.interval)
    })  
});
