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
        this.socketServer?.on('connect', (socket: Socket) => {
            // return the instanceId to the listener
            socket.to(socket.id).emit('initialize', { instanceId: this.instanceId })
            socket.on('disconnect', (reason: string) => {
                this.removeConnectionFromAllSubscriptions(socket.id)
                // TODO: if connections for that subscription is empty, unsubscribe
            })

            socket?.on('addBarSubscriptions', (options: LiveBarOptions) => {
                this.handleBarSubscription(socket.id, options, eventCallBacks.get('addBarSubscriptions'))
            })

            socket?.on("addBookSubscription", (options: LiveOrderBookOptions) => {
                this.handleBookSubscription(socket.id, options, eventCallBacks.get('addBookSubscriptions'))
            })

            socket?.on("addTradeSubscription", (options: LiveTradeOptions) => {
                this.handleTradeSubscription(socket.id, options, eventCallBacks.get('addTradeSubscriptions'))
            })
        })
    }

    handleBarSubscription(connectionId: string, options: LiveBarOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBarSubscriptions event')
        const newSymbols: string[] = []
        options.symbols.map(s => {
            if (this.subscriptionExists('BAR', { symbols: s, timeframe: options.timeframe })) {
                this.addConnectionToActiveSubscription(connectionId, 'BAR', { symbol: s, timeframe: options.timeframe })
            } else {
                newSymbols.push(s)
            }
        })

        if (newSymbols.length > 0) {
            const newOptions = { ...options }
            newOptions.symbols = newSymbols
            cb(options)
        }
    }

    handleBookSubscription(connectionId: string, options: LiveOrderBookOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBookSubscriptions event')
        const newSymbols: string[] = []
        options.symbols.map(s => {
            if (this.subscriptionExists('BOOK', { symbols: s })) {
                this.addConnectionToActiveSubscription(connectionId, 'BOOK', { symbol: s })
            } else {
                newSymbols.push(s)
            }
        })

        if (newSymbols.length > 0) {
            const newOptions = { ...options }
            newOptions.symbols = newSymbols
            cb(options)
        }
    }

    handleTradeSubscription(connectionId: string, options: LiveTradeOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addTradeSubscriptions event')
        const newSymbols: string[] = []
        options.symbols.map(s => {
            if (this.subscriptionExists('TRADE', { symbols: s })) {
                this.addConnectionToActiveSubscription(connectionId, 'TRADE', { symbol: s })
            } else {
                newSymbols.push(s)
            }
        })

        if (newSymbols.length > 0) {
            const newOptions = { ...options }
            newOptions.symbols = newSymbols
            cb(options)
        }
    }
}