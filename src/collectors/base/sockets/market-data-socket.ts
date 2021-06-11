import { WebSocketServerBase } from './websocket-base'
import { ProviderOptions } from '../models/provider-options'
import { Mode } from '../../../constants/types'
import { Socket } from 'socket.io'
import { LiveBarOptions, LiveOrderBookOptions, LiveTradeOptions } from '../models/options'

export type RequestType = 'addBarSubscriptions' | 'addTradeSubscriptions' | 'addBookSubscriptions' | 'removeBarSubscription' | 'removeBookSubscription' | 'removeTradeSubscription'

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

            socket.on('message', (requestType: RequestType, options: LiveOrderBookOptions) => {
                       switch (requestType) {
                    case 'addBarSubscriptions':
                        this.handleBarSubscription(socket.id, options, eventCallBacks.get(requestType))
                        break
                    case 'addBookSubscriptions':
                        this.handleBookSubscriptionRequest(socket.id, options, eventCallBacks.get(requestType))
                        break
                    case 'addTradeSubscriptions':
                        this.handleTradeSubscription(socket.id, options, eventCallBacks.get(requestType))
                        break
                    default:
                        console.log(`unknown market data request type ${requestType}`)
                }
            })
        })
    }

    handleBarSubscription(connectionId: string, options: LiveBarOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBarSubscriptions event')
        const newSymbols: string[] = []
        options.symbols.map(s => {
            const subOptions = { symbols: s, timeframe: options.timeframe }
            if (!this.subscriptionExists('BAR', subOptions)) newSymbols.push(s)
            this.addSubscription(connectionId, 'BAR', subOptions)
        })

        if (newSymbols.length > 0) {
            const newOptions = { ...options }
            newOptions.symbols = newSymbols
            cb(options)
        }
    }

    handleBookSubscriptionRequest(connectionId: string, options: LiveOrderBookOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBookSubscriptions event')
        const newSymbols: string[] = []
        
        options.symbols.forEach(s => {
            const subOptions = { symbol: s }
            if (!this.subscriptionExists('BOOK', subOptions)) newSymbols.push(s)
            this.addSubscription(connectionId, 'BOOK', subOptions)
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
            const subOptions = { symbol: s }
            if (!this.subscriptionExists('TRADE', subOptions)) newSymbols.push(s)
            this.addSubscription(connectionId, 'TRADE', subOptions)
        })

        if (newSymbols.length > 0) {
            const newOptions = { ...options }
            newOptions.symbols = newSymbols
            cb(options)
        }
    }
}