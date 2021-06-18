import { WebSocketServerBase } from '../websocket-base'
import { ProviderOptions } from '../../../../common/definitions/options'
import { SocketTester } from 'socket.io-await-test'
import io from 'socket.io-client'

let wsServer:WebSocketServerBase;

beforeEach(() => {
    jest.clearAllMocks();
    wsServer = new WebSocketServerBase(defaultOptions, 'MarketData', 'LIVE')
});

afterEach(() => {
    
});

let defaultOptions: ProviderOptions = {
    id: 'test', scriptLocations: [{ type: 'MarketData', location: ''}], name: 'test', supportedModes: ['BACKTEST'], apiOptions: new Map(),
    webSocketOptions: [{ type: 'MarketData', mode: 'LIVE', url: 'http://localhost', port: 3001 }]
}

describe("WebSocket connection/subscription management tests", () => {
    test('should add new connections and subscriptions', () => {
        expect(wsServer.activeSubscriptions).toHaveLength(0)
        // basic BAR subscription
        wsServer.addSubscription('connection-id-1', 'BAR', {symbol: 'ADAUSDT', timeframe: '1m'})
        expect(wsServer.activeSubscriptions).toHaveLength(1)
        expect(wsServer.subscriptionExists('BAR', {symbol: 'ADAUSDT', timeframe: '1m'})).toBeTruthy

        // basic BOOK subscription
        wsServer.addSubscription('connection-id-1', 'BOOK', {symbol: 'ADAUSDT'})
        expect(wsServer.activeSubscriptions).toHaveLength(2)
        expect(wsServer.subscriptionExists('BOOK', {symbol: 'ADAUSDT', })).toBeTruthy

        // basic TRADE subscription
        wsServer.addSubscription('connection-id-1', 'TRADE', {symbol: 'ADAUSDT'})
        expect(wsServer.activeSubscriptions).toHaveLength(3)
        expect(wsServer.subscriptionExists('TRADE', {symbol: 'ADAUSDT', })).toBeTruthy

        // repeated BAR subscrption
        wsServer.addSubscription('connection-id-1', 'BAR', {symbol: 'ADAUSDT', timeframe: '1m'})
        expect(wsServer.activeSubscriptions).toHaveLength(3)
        expect(wsServer.subscriptionExists('BOOK', {symbol: 'ADAUSDT', })).toBeTruthy
        expect(wsServer.subscriptionExists('BAR', {symbol: 'ADAUSDT', timeframe: '1m'})).toBeTruthy
        expect(wsServer.findSubscriptionDetails('BAR', {symbol: 'ADAUSDT', timeframe: '1m'}).connections).toHaveLength(1)

        // new connection for existing BAR subscrption
        wsServer.addSubscription('connection-id-2', 'BAR', {symbol: 'ADAUSDT', timeframe: '1m'})
        expect(wsServer.activeSubscriptions).toHaveLength(3)
        expect(wsServer.findSubscriptionDetails('BAR', {symbol: 'ADAUSDT', timeframe: '1m'}).connections).toHaveLength(2)

        // timeframe change creates a new connection
        wsServer.addSubscription('connection-id-2', 'BAR', {symbol: 'ADAUSDT', timeframe: '15m'})
        expect(wsServer.activeSubscriptions).toHaveLength(4)
        expect(wsServer.findSubscriptionDetails('BAR', {symbol: 'ADAUSDT', timeframe: '15m'}).connections).toHaveLength(1)
    })

    test('should remove connections and subscriptions', () => {
        expect(wsServer.activeSubscriptions).toHaveLength(0)

        wsServer.addSubscription('connection-id-1', 'BAR', {symbol: 'ADAUSDT', timeframe: '1m'})
        wsServer.addSubscription('connection-id-2', 'BAR', {symbol: 'ADAUSDT', timeframe: '1m'})
        wsServer.addSubscription('connection-id-3', 'BAR', {symbol: 'ADAUSDT', timeframe: '1m'})
        wsServer.addSubscription('connection-id-1', 'BOOK', {symbol: 'ADAUSDT'})
        wsServer.addSubscription('connection-id-2', 'BOOK', {symbol: 'ADAUSDT'})
        wsServer.addSubscription('connection-id-3', 'BOOK', {symbol: 'ADAUSDT'})
        wsServer.addSubscription('connection-id-1', 'TRADE', {symbol: 'ADAUSDT'})
        wsServer.addSubscription('connection-id-2', 'TRADE', {symbol: 'ADAUSDT'})
        wsServer.addSubscription('connection-id-3', 'TRADE', {symbol: 'ADAUSDT'})
        expect(wsServer.activeSubscriptions).toHaveLength(3)
        expect(wsServer.findSubscriptionDetails('BAR', {symbol: 'ADAUSDT', timeframe: '1m'}).connections).toHaveLength(3)
        expect(wsServer.findSubscriptionDetails('BOOK', {symbol: 'ADAUSDT'}).connections).toHaveLength(3)
        expect(wsServer.findSubscriptionDetails('TRADE', {symbol: 'ADAUSDT'}).connections).toHaveLength(3)

        // remove connection from BAR subscription
        wsServer.removeConnectionFromActiveSubscriptions('connection-id-1', 'BAR', {symbol: 'ADAUSDT', timeframe: '1m'} )
        expect(wsServer.activeSubscriptions).toHaveLength(3)
        expect(wsServer.findSubscriptionDetails('BAR', {symbol: 'ADAUSDT', timeframe: '1m'}).connections).toStrictEqual([ 'connection-id-2', 'connection-id-3' ])

        // remove connection from BOOK subscription
        wsServer.removeConnectionFromActiveSubscriptions('connection-id-2', 'BOOK', {symbol: 'ADAUSDT'} )
        expect(wsServer.activeSubscriptions).toHaveLength(3)
        expect(wsServer.findSubscriptionDetails('BOOK', {symbol: 'ADAUSDT'}).connections).toStrictEqual([ 'connection-id-1', 'connection-id-3' ])

        // remove connection from TRADE subscription
        wsServer.removeConnectionFromActiveSubscriptions('connection-id-3', 'TRADE', {symbol: 'ADAUSDT'} )
        expect(wsServer.activeSubscriptions).toHaveLength(3)
        expect(wsServer.findSubscriptionDetails('TRADE', {symbol: 'ADAUSDT'}).connections).toStrictEqual([ 'connection-id-1', 'connection-id-2' ])

        // remove all of one connection from each subscription
        wsServer.removeConnectionFromAllSubscriptions('connection-id-1')
        expect(wsServer.activeSubscriptions).toHaveLength(3)
        expect(wsServer.findSubscriptionDetails('BAR', {symbol: 'ADAUSDT', timeframe: '1m'}).connections).toStrictEqual([ 'connection-id-2', 'connection-id-3' ])
        expect(wsServer.findSubscriptionDetails('BOOK', {symbol: 'ADAUSDT'}).connections).toStrictEqual([ 'connection-id-3' ])
        expect(wsServer.findSubscriptionDetails('TRADE', {symbol: 'ADAUSDT'}).connections).toStrictEqual([ 'connection-id-2' ])

        // remove all of another connection from each subscription, leaving no active TRADE subscriptions
        wsServer.removeConnectionFromAllSubscriptions('connection-id-2')
        expect(wsServer.activeSubscriptions).toHaveLength(2)
        expect(wsServer.findSubscriptionDetails('BAR', {symbol: 'ADAUSDT', timeframe: '1m'}).connections).toStrictEqual([ 'connection-id-3' ])
        expect(wsServer.findSubscriptionDetails('BOOK', {symbol: 'ADAUSDT'}).connections).toStrictEqual([ 'connection-id-3' ])
        expect(wsServer.subscriptionExists('TRADE', {symbol: 'ADAUSDT', })).toBeFalsy

        // remove a connection from BAR individually, leaving no active BAR subscriptions
        wsServer.removeConnectionFromActiveSubscriptions('connection-id-3', 'BAR', {symbol: 'ADAUSDT', timeframe: '1m'})
        expect(wsServer.activeSubscriptions).toHaveLength(1)
        expect(wsServer.subscriptionExists('BAR', {symbol: 'ADAUSDT', timeframe: '1m'})).toBeFalsy
        expect(wsServer.findSubscriptionDetails('BOOK', {symbol: 'ADAUSDT'}).connections).toStrictEqual([ 'connection-id-3' ])
        expect(wsServer.subscriptionExists('TRADE', {symbol: 'ADAUSDT', })).toBeFalsy

        // remove all for the final collection and expect no subscriptions
        wsServer.removeConnectionFromAllSubscriptions('connection-id-3')
        expect(wsServer.activeSubscriptions).toHaveLength(0)
    })
})

describe("WebSocket Server Start/Stop", () => {
    
    let socketUrl = 'http://localhost:3001'
    test('should start and stop a new webSocket server', async () => {
        wsServer.startServer()
        const client = io(socketUrl)
        const client2 = io(socketUrl)

        const socketTester = new SocketTester(client)
        const status = socketTester.on('ServerStatus')

        client.emit('message', 'status')
        await status.waitForAny()

        const statusResponse = status.get(0) as any
        expect(statusResponse['type']).toBe('WebSocket')
        expect(statusResponse['status']).toBe('ACTIVE')
        expect(statusResponse['connections']).toBe(2)
        expect(statusResponse['activeSubscriptions']).toHaveLength(0)

        // close one connection and expect connection to be dropped
        client2.close()
        await new Promise( (res) => setTimeout(res, 500))
        expect(wsServer.connections.size).toBe(1)

        // close 2nd connection and expect connections to be empty
        client.close()
        await new Promise( (res) => setTimeout(res, 500))
        expect(wsServer.connections.size).toBe(0)

        // close server, expect status to be closed
        wsServer.close()
        expect(wsServer.status).toBe('CLOSED')
    })
})