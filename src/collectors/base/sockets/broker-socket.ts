import { WebSocketServerBase } from './websocket-base'
import { ProviderOptions } from '../../../common/definitions/options'
import { BrokerRequestType, OrderSubscriptionOptions } from '../../../common/definitions/websocket'
import { Mode } from '../../../common/definitions/basic'
import { Socket } from 'socket.io'
import { last } from 'lodash'

export class BrokerSocketServer extends WebSocketServerBase {
    constructor(options: ProviderOptions, mode: Mode) {
        super(options, 'Broker', mode)
    }

    registerEvents(eventCallBacks: Map<BrokerRequestType, Function>) {
        console.log('registering events')

        this.socketServer?.on('connect', (socket: Socket) => {
            console.log(`socketServerConnect,socket=${socket}`)
            // return the instanceId to the listener
            socket.emit('initialize', { instanceId: this.instanceId })
            socket.on('disconnect', (reason: string) => {
                this.removeConnectionFromAllSubscriptions(socket.id)
            })

            socket.on('message', (requestType: BrokerRequestType, options?: OrderSubscriptionOptions) => {
                console.log('received message', requestType)
                let finalOptions;
                switch (requestType) {
                    case 'addOrderSubscriptions':
                        finalOptions = this.handleOrderSubscriptionRequests(socket.id, options, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalOptions)
                        break
                    case 'addAccountSubscription':
                        finalOptions = this.handleAccountSubscriptionRequest(socket.id, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalOptions)
                        break
                    case 'addBalanceSubscription':
                        finalOptions = this.handleBalanceSubscriptionRequest(socket.id, eventCallBacks.get(requestType))
                        socket.emit('addSubscription_success', finalOptions)
                        break
                    default:
                        console.log(`unknown market data request type ${requestType}`)
                        socket.emit('addSubscription_failed', options)
                }
            })
        })
    }

    handleOrderSubscriptionRequests(connectionId: string, options?: OrderSubscriptionOptions, cb?: Function) {
        if (!cb) throw new Error('no callback found for addOrderSubscriptions event')
        console.log(`registering new order subscriptions for connection ${connectionId}`)
        const newSymbols: string[] = []
        options?.symbols.map(s => {
            const subOptions = { symbols: s }
            if (!this.subscriptionExists('EXECUTION', subOptions)) newSymbols.push(s)
            this.addSubscription(connectionId, 'EXECUTION', subOptions)
        })

        const newOptions = { ...options }
        if (newSymbols.length > 0) {
            newOptions.symbols = newSymbols
            cb(newOptions)
        }
        return newOptions
    }

    handleAccountSubscriptionRequest(connectionId: string, cb?: Function) {
        if (!cb) throw new Error('no callback found for addAccountSubscriptions event')
        console.log(`registering new order book subscriptions for connection ${connectionId}`)
        
        if (!this.subscriptionExists('ACCOUNT', {})) {
            this.addSubscription(connectionId, 'ACCOUNT', {})
            cb()
            return { status: 'started' }
        }
        return { status: 'exists' }        
    }

    handleBalanceSubscriptionRequest(connectionId: string, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBalanceSubscriptions event')
        console.log(`registering new trade subscriptions for connection ${connectionId}`)

        if (!this.subscriptionExists('BALANCE', {})) {
            this.addSubscription(connectionId, 'BALANCE', {})
            cb()
            return { status: 'started' }
        }
        return { status: 'exists' }
    }

    findConnectionsForTopic(topic: string, data: any): string[] {
        const t = topic.split('.')
        switch(last(t)) {
            case 'orderExecution':
                return this.activeSubscriptions.filter( (x:any) => x.type === 'EXECUTION' && x.options.symbol === t[0])
            case 'accountInfo':
                return this.activeSubscriptions.filter( (x:any) => x.type === 'ACCOUNT')
            case 'brokerBalance':
                return this.activeSubscriptions.filter( (x:any) => x.type === 'BALANCE')
            default:
                return []
        }
    }
}