import { WebSocketServerBase } from './websocket-base'
import { ProviderOptions } from '../../../common/definitions/connectors'
import { Bar } from '../../../common/definitions/market-data'
import { LiveBarOptions, LiveOrderBookOptions, LiveTradeOptions } from '../../../common/definitions/connectors'
import { MarketDataRequestType } from '../../../common/definitions/websocket'
import { Mode } from '../../../common/definitions/basic'
import { Socket } from 'socket.io'
import { last } from 'lodash'

export class MarketDataSocketServer extends WebSocketServerBase {
    constructor(options: ProviderOptions, mode: Mode) {
        super(options, 'MarketData', mode)
    }

    registerEvents(eventCallBacks: Map<MarketDataRequestType, Function>) {

        console.log('registering events')

        this.socketServer?.on('connect', (socket: Socket) => {
            console.log(`socketServerConnect,socket=${socket.id}`)
            // return the instanceId to the listener
            socket.emit('initialize', { instanceId: this.instanceId })
            socket.on('disconnect', (reason: string) => {
                this.removeConnectionFromAllSubscriptions(socket.id)
            })

            socket.on('message', (requestType: MarketDataRequestType, options: LiveBarOptions | LiveOrderBookOptions | LiveTradeOptions) => {
                console.log('received message', requestType, JSON.stringify(options))
                switch (requestType) {
                    case 'addBarSubscriptions':
                        const finalBarOptions = this.handleBarSubscriptionRequests(socket.id, options, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalBarOptions)
                        break
                    case 'addBookSubscriptions':
                        const finalBookOptions = this.handleBookSubscriptionRequests(socket.id, options, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalBookOptions)
                        break
                    case 'addTradeSubscriptions':
                        const finalTradeOptions = this.handleTradeSubscriptionRequests(socket.id, options, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalTradeOptions)
                        break
                    default:
                        console.log(`unknown market data request type ${requestType}`)
                        socket.emit('addSubscription_failed', options)
                }
            })
        })
    }

    handleBarSubscriptionRequests(connectionId: string, options: LiveBarOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBarSubscriptions event')
        console.log(`registering new bar subscription for connection ${connectionId}`, JSON.stringify(options))
        const newSymbols: string[] = []
        options.symbols.map((s:string) => {
            const subOptions = { symbols: s, timeframe: options.timeframe }
            if (!this.subscriptionExists('BAR', subOptions)) newSymbols.push(s)
            this.addSubscription(connectionId, 'BAR', subOptions)
        })

        const newOptions = { ...options }
        if (newSymbols.length > 0) {
            newOptions.symbols = newSymbols
            cb(newOptions)
        }

        return newOptions
    }

    handleBookSubscriptionRequests(connectionId: string, options: LiveOrderBookOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBookSubscriptions event')
        console.log(`registering new order book subscriptions for connection ${connectionId}`)
        const newSymbols: string[] = []
        
        options.symbols.forEach( (s:string) => {
            const subOptions = { symbol: s }
            if (!this.subscriptionExists('BOOK', subOptions)) newSymbols.push(s)
            this.addSubscription(connectionId, 'BOOK', subOptions)
        })

        const newOptions = { ...options }
        if (newSymbols.length > 0) {
            newOptions.symbols = newSymbols
            cb(newOptions)
        }

        return newOptions
    }

    handleTradeSubscriptionRequests(connectionId: string, options: LiveTradeOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addTradeSubscriptions event')
        console.log(`registering new trade subscriptions for connection ${connectionId}`)
        const newSymbols: string[] = []
        options.symbols.map( (s: string) => {
            const subOptions = { symbol: s }
            if (!this.subscriptionExists('TRADE', subOptions)) newSymbols.push(s)
            this.addSubscription(connectionId, 'TRADE', subOptions)
        })

        const newOptions = { ...options }
        if (newSymbols.length > 0) {
            newOptions.symbols = newSymbols
            cb(newOptions)
        }

        return newOptions
    }

    findConnectionsForTopic(topic: string, data: any): string[] {
        const t = topic.split('.')
        switch(last(t)) {
            case 'bar':
                return this.activeSubscriptions.filter( (x:any) => x.type === 'BAR' && x.options.symbol === t[0] && x.options.timeframe === <Bar>data.timeframe)
            case 'book':
                return this.activeSubscriptions.filter( (x:any) => x.type === 'BOOK' && x.options.symbol === t[0])
            case 'trade':
                return this.activeSubscriptions.filter( (x:any) => x.type === 'BOOK' && x.options.symbol === t[0])
            default:
                return []
        }
    }
}