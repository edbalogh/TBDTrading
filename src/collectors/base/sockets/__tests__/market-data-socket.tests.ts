import { MarketDataSocketServer } from '../market-data-socket'
import { ProviderOptions, LiveBarOptions, LiveOrderBookOptions, LiveTradeOptions } from '../../../../common/definitions/options'
import { MarketDataRequestType } from '../../../../common/definitions/websocket'
import { SocketTester } from 'socket.io-await-test'
import io from 'socket.io-client'

let wsServer: MarketDataSocketServer;

const defaultOptions: ProviderOptions = {
    id: 'test', scriptLocations: [{ type: 'MarketData', location: '' }], name: 'test', supportedModes: ['BACKTEST'], apiOptions: new Map(),
    webSocketOptions: [{ type: 'MarketData', mode: 'LIVE', url: 'http://localhost', port: 3000 }]
}
const socketUrl = `http://localhost:3000`

const callbacks: Map<MarketDataRequestType, Function> = new Map()
const barCallback = jest.fn()
const bookCallback = jest.fn()
const tradeCallback = jest.fn()

callbacks.set('addBarSubscriptions', barCallback)
callbacks.set('addBookSubscriptions', bookCallback)
callbacks.set('addTradeSubscriptions', tradeCallback)

beforeEach(() => {
    jest.clearAllMocks();
    wsServer = new MarketDataSocketServer(defaultOptions, 'LIVE')
    wsServer.startServer()
    wsServer.registerEvents(callbacks)
});

afterEach(() => {
    wsServer.close()
})

describe('MarketDataSocketServer Eventhandler tests', () => {
    test('should handle event data', async () => {
        const client = io(socketUrl)
        const socketTester = new SocketTester(client)

        // handle invalid request
        const invalid = socketTester.on('addSubscription_failed')
        client.emit('message', 'invalidRequest', { symbols: ['ADAUSDT'] })
        await invalid.waitForEvents(1)

        // handle successful requests
        const subStats = socketTester.on('addSubscription_success')

        // single symbol subscriptions
        client.emit('message', 'addBarSubscriptions', { symbols: ['ADAUSDT'], timeframe: '1h' })
        client.emit('message', 'addBookSubscriptions', { symbols: ['ADAUSDT'] })
        client.emit('message', 'addTradeSubscriptions', { symbols: ['ADAUSDT'] })

        // multiple symbols with duplicate
        client.emit('message', 'addBarSubscriptions', { symbols: ['ADAUSDT', 'DOGEUSDT', 'BTCUSDT'], timeframe: '1h' })
        client.emit('message', 'addBookSubscriptions', { symbols: ['ADAUSDT', 'DOGEUSDT', 'BTCUSDT'] })
        client.emit('message', 'addTradeSubscriptions', { symbols: ['ADAUSDT', 'DOGEUSDT', 'BTCUSDT'] })

        // send bar with different timeframe
        client.emit('message', 'addBarSubscriptions', { symbols: ['ADAUSDT', 'DOGEUSDT', 'BTCUSDT'], timeframe: '15m' })

        await subStats.waitForEvents(7)
        expect((subStats.get(0) as LiveBarOptions).symbols).toStrictEqual(['ADAUSDT'])
        expect((subStats.get(0) as LiveBarOptions).timeframe).toBe('1h')
        expect((subStats.get(1) as LiveOrderBookOptions).symbols).toStrictEqual(['ADAUSDT'])
        expect((subStats.get(2) as LiveTradeOptions).symbols).toStrictEqual(['ADAUSDT'])

        expect((subStats.get(3) as LiveBarOptions).symbols).toStrictEqual(['DOGEUSDT', 'BTCUSDT'])
        expect((subStats.get(4) as LiveOrderBookOptions).symbols).toStrictEqual(['DOGEUSDT', 'BTCUSDT'])
        expect((subStats.get(5) as LiveTradeOptions).symbols).toStrictEqual(['DOGEUSDT', 'BTCUSDT'])

        expect((subStats.get(6) as LiveBarOptions).symbols).toStrictEqual(['ADAUSDT', 'DOGEUSDT', 'BTCUSDT'])
        expect((subStats.get(6) as LiveBarOptions).timeframe).toBe('15m')

        expect(wsServer.activeSubscriptions).toHaveLength(12)
        client.close()
    })
})