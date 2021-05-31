import { buildHistoricalBar } from '../__data__/historicalBars'
import { buildLiveBar } from '../__data__/liveBars'
import { buildLiveOrderBook } from '../__data__/liveOrderBook'
import { EventEmitter } from "events"
import { Bar } from "../../../base/models/bar"
import { ProviderOptions } from '../../../base/models/provider-options'
const BinanceMarketData = require('../binance-market-data')

const Events = new EventEmitter()

let bmd: any = {};
let defaultOptions: ProviderOptions = {
    id: 'test', scriptLocations: [{ type: 'MarketData', location: ''}], name: 'test', supportedModes: ['BACKTEST'], apiOptions: new Map()
}

beforeEach(() => {
    jest.clearAllMocks();
    bmd = new BinanceMarketData(defaultOptions, 'BACKTEST')
});

afterEach(() => {
    Events.removeAllListeners();
});

describe('BiannceMarketData Parameter Details tests', () => {
    const details = BinanceMarketData.parameterDetails()
    expect(details.interval).toBeDefined
    expect(details.interval.templateOptions.options.length).toBe(15)
    expect(details.limit.templateOptions.max).toBe(1000)
})

describe("BinanceMarketData Historical Bar tests", () => {   

    test('should translate historical bars', () => {
        const testBar = buildHistoricalBar()
        const histBar = bmd.translateHistoricalBar(testBar, '1m', 'DOGEUSDT')
        expect(histBar.start).toStrictEqual(new Date(1610370000000))
        expect(histBar.end).toStrictEqual(new Date(1610373599999))
        expect(histBar.symbol).toBe('DOGEUSDT')
        expect(histBar.open).toBe(0.0088409)
        expect(histBar.high).toBe(0.0089405)
        expect(histBar.low).toBe(0.0082291)
        expect(histBar.close).toBe(0.0083466)
        expect(histBar.volume).toBe(1815853)
        expect(histBar.trades).toBe(79)
        expect(histBar.inProgress).toBe(false)
        expect(histBar.timeframe).toBe('1m')
        expect(histBar.providerId).toBe('test')
        expect(histBar.source).toBe('historical')
        const testBar2 = buildHistoricalBar({ closeTime: new Date().getTime() + 1000 })
        const histBar2 = bmd.translateHistoricalBar(testBar2, '1D', 'DOGEUSDT')
        expect(histBar2.inProgress).toBe(true)
    })

    test('should get historical bar data with one call per symbol', async () => {
        let time = new Date('2021-01-31').getTime() - 1
        const bars: Bar[] = []
        bmd.on('ADAUSDT.bar', (x: any) => bars.push(x))
        bmd.on('ONEUSDT.bar', (x: any) => bars.push(x))
        const currTime = new Date().getTime()
        bmd.client.candles = jest.fn()
            .mockResolvedValueOnce([ buildHistoricalBar() ])
            .mockResolvedValueOnce([
                buildHistoricalBar({ openTime: time += 1, closeTime: time += 59999 }),
                buildHistoricalBar({ openTime: time += 1, closeTime: time += 59999 })
            ])

        await bmd.getHistoricalBarData({ timeframe: '1m', symbols: ['ADAUSDT', 'ONEUSDT'] })
        expect(bars).toHaveLength(3)
        expect(bars.filter(x => x.symbol === 'ADAUSDT')).toHaveLength(1)
        expect(bars.filter(x => x.symbol === 'ONEUSDT')).toHaveLength(2)
        expect(bmd.client.candles).toHaveBeenCalledTimes(2)
    })

    test('should make multiple calls when request is larger than 1000', async () => {
        let time = new Date('2021-01-31').getTime() - 1
        const bars: Bar[] = []
        bmd.on('ADAUSDT.bar', (x: any) => bars.push(x))
        let batch1 = []
        let batch2 = []
        let batch3 = []
        for(let i=0;i<1000;i++) batch1.push(buildHistoricalBar({ openTime: time += 1, closeTime: time += 59999 }))
        for(let i=0;i<1000;i++) batch2.push(buildHistoricalBar({ openTime: time += 1, closeTime: time += 59999 }))
        for(let i=0;i<1;i++) batch3.push(buildHistoricalBar({ openTime: time += 1, closeTime: time += 59999 }))
        bmd.client.candles = jest.fn()
            .mockResolvedValueOnce(batch1)
            .mockResolvedValueOnce(batch2)
            .mockResolvedValueOnce(batch3)
        await bmd.getHistoricalBarData({ timeframe: '1m', symbols: ['ADAUSDT'], limit: 2001 })
        expect(bmd.client.candles).toHaveBeenCalledTimes(3)
        expect(bars).toHaveLength(2001)
        expect(bars.filter(x => x.symbol === 'ADAUSDT')).toHaveLength(2001)
    })

    test('should translate historical bar options', () => {        
        // basic example with a start and end date (no limit)
        expect(bmd.translateHistoricalBarOptions({timeframe: '5m', startDate: new Date('2020-01-01'), endDate: new Date('2020-12-31') }))
            .toStrictEqual({ interval: '5m', startTime: new Date('2020-01-01').getTime(), endTime: new Date('2020-12-31').getTime()})
        
        // only timeframe provided
        expect(bmd.translateHistoricalBarOptions({ timeframe: '1d'})).toStrictEqual({interval: '1d'})

        // only timeframe and interval provided
        expect(bmd.translateHistoricalBarOptions({ timeframe: '15m', limit: 100})).toStrictEqual({interval: '15m', limit: 100})

        // afterDate is used, so endDate must be provided
        const test1 = bmd.translateHistoricalBarOptions({timeframe: '5m', startDate: new Date('2020-01-01'), limit: 25})
        expect(test1.endTime).toBeGreaterThan(test1.startTime || 0)
        delete test1.endTime
        expect(test1).toStrictEqual({ interval: '5m', limit: 25, startTime: new Date('2020-01-01').getTime()})
    })
})

describe('BinanceMarketData Live Bar tests', () => {
    test("should translate live bars", () => {        
        const liveBar = buildLiveBar()
        const stdBar = bmd.translateLiveBar(liveBar)
        expect(stdBar.timeframe).toBe(liveBar.interval)
        expect(stdBar.start).toStrictEqual(new Date(1621629660000))
        expect(stdBar.end).toStrictEqual(new Date(1621629719999))
        expect(stdBar.symbol).toBe('DOGEUSDT')
        expect(stdBar.open).toBe(0.3419313)
        expect(stdBar.high).toBe(0.3421133)
        expect(stdBar.low).toBe(0.3414441)
        expect(stdBar.close).toBe(0.3416987)
        expect(stdBar.volume).toBe(4438)
        expect(stdBar.trades).toBe(8)
        expect(stdBar.inProgress).toBe(true)
        expect(stdBar.timeframe).toBe('1m')
        expect(stdBar.providerId).toBe('test')
        expect(stdBar.source).toBe('live')
    })
})

describe('BinanceMarketData Live OrderBook tests', () => {
    test('should translate live order book (depth)', () => {
        
        const liveOrderBook = buildLiveOrderBook()
        const stdOrderBook = bmd.translateLiveOrderBook(liveOrderBook)
        expect(stdOrderBook.source).toBe('live')
        expect(stdOrderBook.providerId).toBe('test')
        expect(stdOrderBook.eventTime).toStrictEqual(new Date(1622301796490))
        expect(stdOrderBook.symbol).toBe('DOGEUSDT')
        expect(stdOrderBook.bids).toHaveLength(5)
        expect(stdOrderBook.bids[0].price).toBe(0.28390740)
        expect(stdOrderBook.bids[0].quantity).toBe(301)
        expect(stdOrderBook.bids.find((b: any) => b.quantity == 0)).toBeFalsy
        expect(stdOrderBook.asks).toHaveLength(3)
        expect(stdOrderBook.asks[0].price).toBe(0.2840026)
        expect(stdOrderBook.asks[0].quantity).toBe(358)
        expect(stdOrderBook.asks.find((a: any) => a.quantity == 0)).toBeFalsy
    })
})
