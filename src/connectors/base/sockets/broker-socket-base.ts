import { WebSocketServerBase } from './websocket-base'
import { BrokerSubscriptionRequest, OrderSubscriptionOptions, ProviderOptions } from '../../../common/definitions/connectors'
import { Mode } from '../../../common/definitions/basic'
import { Socket } from 'socket.io'
import { last } from 'lodash'
import { BrokerProviderBase } from '../broker-base'
import { OrderRequest } from '../../positions/order-manager'

export type BrokerRequestType = 'addOrderSubscriptions' | 'addAccountSubscription' | 'addBalanceSubscription' | 'placeOrder'

export abstract class BrokerSocketServerBase extends WebSocketServerBase {
    brokerProvider: BrokerProviderBase
    constructor(options: ProviderOptions, mode: Mode, brokerProvider: BrokerProviderBase) {
        super(options, 'Broker', mode)
        this.brokerProvider = brokerProvider
    }

    startSocketServer() {
        this.startServer()
        this.registerEvents()
        this.handleAccountSubscriptionRequest('server')
    }

    stopSocketServer() {
        this.close()
    }

    // method to add the bar subscription to the local server
    addServerOrderSubscriptions(options: OrderSubscriptionOptions) {
        this.addProviderOrderSubscriptions(options)
    }

    addServerBalanceSubscription() {
        this.addProviderBalanceSubscriptions()
    }

    addServerAccountSubscription() {
        this.addProviderAccountSubscriptions()
    }

    // implement on provider class, registers for data from provider
    abstract addProviderOrderSubscriptions(options: OrderSubscriptionOptions): any
    abstract addProviderAccountSubscriptions(): any
    abstract addProviderBalanceSubscriptions(): any

    registerEvents() {
        console.log('registering events')
        this.socketServer?.on('connect', (socket: Socket) => {
            console.log(`socketServerConnect,socket=${socket.id}`)
            // return the instanceId to the listener
            socket.emit('initialize', { instanceId: this.instanceId })
            socket.on('disconnect', (reason: string) => {
                this.removeConnectionFromAllSubscriptions(socket.id)
            })

            socket.on('placeOrder', (orderRequest: OrderRequest) => {
                console.log('SERVER: PlaceOrder', orderRequest)
                const results = this.brokerProvider.placeOrder(orderRequest)
                socket.emit('placeOrder_results', results)
            })

            socket.on('message', (requestType: BrokerRequestType, options: any) => {
                console.log('received message', requestType)
                let finalOptions;
                switch (requestType) {
                    case 'addOrderSubscriptions':
                        finalOptions = this.handleOrderSubscriptionRequests(socket.id, options as OrderSubscriptionOptions)
                        socket.emit('addSubscription_success', finalOptions)
                        break
                    default:
                        console.log(`requestType ${requestType} ignored`, options as any)
                }
            })
        })
    }

    handleOrderSubscriptionRequests(connectionId: string, options: OrderSubscriptionOptions) {
        console.log(`registering new order subscriptions for connection ${connectionId}`)
        const newSymbols: string[] = []
        options.symbols.map((s:any) => {
            const subOptions = { symbols: s }
            if (!this.subscriptionExists('ORDER', subOptions)) newSymbols.push(s)
            this.addSubscription(connectionId, 'ORDER', subOptions)
        })

        const newOptions = { ...options }
        if (newSymbols.length > 0) {
            newOptions.symbols = newSymbols
            this.brokerProvider.addProviderOrderSubscriptions(newOptions)
        }
        return newOptions
    }

    handleAccountSubscriptionRequest(connectionId: string) {
        console.log(`registering new account subscription for connection ${connectionId}`)
        
        if (!this.subscriptionExists('ACCOUNT', {})) {
            this.addSubscription(connectionId, 'ACCOUNT', {})
            this.brokerProvider.addProviderBalanceSubscriptions()
            return { status: 'started' }
        }
        return { status: 'exists' }        
    }

    handleBalanceSubscriptionRequest(connectionId: string, cb?: Function) {
        if (!cb) throw new Error('no callback found for addBalanceSubscriptions event')
        console.log(`registering new balance subscription for connection ${connectionId}`)

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
                return this.activeSubscriptions.filter( (x:any) => x.type === 'ORDER' && x.options.symbol === t[0])
            case 'accountInfo':
                return this.activeSubscriptions.filter( (x:any) => x.type === 'ACCOUNT')
            case 'brokerBalance':
                return this.activeSubscriptions.filter( (x:any) => x.type === 'BALANCE')
            default:
                return []
        }
    }
}