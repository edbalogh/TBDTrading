import { WebSocketServerBase } from './websocket-base'
import { ProviderOptions } from '../models/provider-options'
import { Mode } from '../../../constants/types'
import { Socket } from 'socket.io'
import { LiveBarOptions, LiveOrderBookOptions, LiveTradeOptions } from '../models/options'

export type RequestType = 'addBarSubscriptions' | 'addTradeSubscriptions' | 'addBookSubscriptions'

export class MarketDataSocketServer extends WebSocketServerBase {
    constructor(options: ProviderOptions, mode: Mode) {
        super(options, 'MarketData', mode)
    }

    registerEvents(eventCallBacks: Map<RequestType, Function>) {

        console.log('registering events')

        this.socketServer?.on('connect', (socket: Socket) => {
            console.log(`socketServerConnect,socket=${socket}`)
            // return the instanceId to the listener
            socket.emit('initialize', { instanceId: this.instanceId })
            socket.on('disconnect', (reason: string) => {
                this.removeConnectionFromAllSubscriptions(socket.id)
            })

            socket.on('message', (requestType: RequestType, options: LiveBarOptions | LiveOrderBookOptions | LiveTradeOptions) => {
                console.log('received message', requestType)
                let finalOptions;
                switch (requestType) {
                    case 'addBarSubscriptions':
                        finalOptions = this.handleBarSubscriptionRequests(socket.id, options, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalOptions)
                        break
                    case 'addBookSubscriptions':
                        finalOptions = this.handleBookSubscriptionRequests(socket.id, options, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalOptions)
                        break
                    case 'addTradeSubscriptions':
                        finalOptions = this.handleTradeSubscriptionRequests(socket.id, options, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalOptions)
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
        console.log(`registering new bar subscription for connection ${connectionId}`)
        const newSymbols: string[] = []
        options.symbols.map(s => {
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
        
        options.symbols.forEach(s => {
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
        options.symbols.map(s => {
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
}