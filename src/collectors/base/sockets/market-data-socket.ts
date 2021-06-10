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

                // remove subscriptions with no remaining connections
                this.activeSubscriptions = this.activeSubscriptions.filter(s => s.connections.length > 0)
                
                // TODO: call unsubcribe method if all connections have been removed (using callbacks provided)

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

    handleBookSubscriptionRequest(connectionId: string, options: LiveOrderBookOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBookSubscriptions event')
        const newSymbols: string[] = []
        options.symbols.forEach(s => {
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