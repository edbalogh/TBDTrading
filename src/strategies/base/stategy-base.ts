import { ProviderOptions, Connection, ProviderType, ProviderService, MarketDataSubscriptionRequest, BrokerSubscriptionRequest } from '../../common/definitions/connectors'
import { BotDetails, OrderSizeOptions, SymbolDetails } from '../../common/definitions/strategy'
import { Bar, OrderBook } from '../../common/definitions/market-data'
import { Order, Position, OrderRequest } from '../../common/definitions/broker'
import { Currency, Mode } from '../../common/definitions/basic'
import config from '../../../config'
import { findOne, insertOne, upsert } from '../../mongo/mongo-utils'
const utils = require('../../utils/legacy')

import { generate as shortid } from 'shortid'
import { OrderSizeCalculator } from './order-size-calculator'

export abstract class StrategyBase {
    botDetails: BotDetails
    symbol: SymbolDetails
    connections: any = []
    botId: string
    name: string
    mode: Mode
    position?: Position
    activeOrders: Order[] = []
    pendingOrderRequests: OrderRequest[] = []
    brokerProvider: any
    supportsFractionalShares: boolean = false
    orderSizeCalculator: OrderSizeCalculator
    orderSizeOptions: OrderSizeOptions

    constructor(botDetails: BotDetails, symbolDetails: SymbolDetails) {
        this.botDetails = botDetails
        this.botId = botDetails.id
        this.mode = botDetails.mode
        this.symbol = symbolDetails
        this.name = this.botDetails.name
        this.brokerProvider = this.buildBrokerClass()
        this.orderSizeOptions = botDetails.strategyOptions.orderSizeOptions
        this.orderSizeCalculator = new OrderSizeCalculator(this.botId, this.orderSizeOptions)
    }

    buildBrokerClass() {
        const broker = this.botDetails.providers.find(p => p.providerType === 'Broker')
        if (!broker) throw new Error (`failed to load Broker for bot ${this.name}, missing Broker in providers section`)
        const provider = config.providers.find(p => p.id === broker.providerId)
        if (!provider) throw new Error (`failed to load Broker for bot ${this.name}, missing providerId in config`)
        const script = provider.scriptLocations.find(l => l.type === 'Broker')
        if (!script) throw new Error(`failed to load Broker for ${this.name}, missing Broker in scriptLocations`)
        const BrokerProvider = require(`${script.location}`)
        this.brokerProvider = new BrokerProvider(provider, this.mode)
    }

    startup(): void {
        this.botDetails.providers.map(p => {
            const lookup = config.providers.find(x => x.id === p.providerId)
            let providerOptions: ProviderOptions

            if (lookup) {
                providerOptions = <ProviderOptions>lookup
            } else {
                throw new Error(`Provider '${p.providerId}' not found in configuration`)
            }

            const providerScript = providerOptions.scriptLocations?.find(x => x.type === 'MarketData')

            if (providerScript) { // && fs.existsSync(providerScript.location)) {  // TODO: fix this

                switch (providerScript.type) {
                    case 'MarketData':
                        this.addMarketDataListener(providerOptions, providerScript.location, p.subscriptions)
                        break
                    case 'Broker':
                        this.addBrokerListener(providerOptions, providerScript.location, p.subscriptions)
                        break
                    default:
                        this.addOtherListener(providerOptions, providerScript.location, p.subscriptions)
                }
            } else {
                throw new Error(`found provider ${p.providerId}, but scriptLocation for MarketData either does not exist or contains an invalid path`)
            }

        })
    }

    async shutdown(): Promise<any> {
        return Promise.all(this.connections.map( (c:any) => {
            return c.class.stopSocketListener()
        }))
    }

    addMarketDataListener(providerOptions: ProviderOptions, location: string, subscriptions: MarketDataSubscriptionRequest[] | undefined): void {
        const MarketDataClass = require(location)
        const md = new MarketDataClass(providerOptions, this.mode)
        md.on(`${this.symbol?.symbol}.bar`, (bar: Bar) => this._onBarUpdate(bar))
        md.on(`${this.symbol?.symbol}.book`, (book: OrderBook) => this._onOrderBookUpdate(book))

        this.botDetails.symbols.forEach(s => {
            if (s.reference) {
                md.on(`${s.symbol}.bar`, (bar: Bar) => this._onBarUpdate(bar))
                md.on(`${s.symbol}.book`, (book: OrderBook) => this._onOrderBookUpdate(book))
            }
        })

        // start listener
        md.startSocketListener(subscriptions)
        this.connections.push({ class: md, options: providerOptions })
    }

    _setupConnection(listener: any, providerId: string, providerType: ProviderType): Connection {
        // setup connection details
        const connection: Connection = {
            instanceId: '',
            providerId: providerId,
            providerInstanceId: '',
            providerType: providerType,
            status: 'PENDING',
            startTime: new Date()
        }

        // subscribe to events
        listener.on('connect', (providerInstanceId: string, socketId: string) => {
            connection.status = 'CONNECTED'
            connection.providerInstanceId = providerInstanceId
            connection.instanceId = socketId,
            connection.startTime = new Date(),
            connection.statusLog?.push({ time: new Date(), status: 'CONNECTED' })
        })
        listener.on('disconnect', () => {
            connection.status = 'DISCONNECTED'
            connection.statusLog?.push({ time: new Date(), status: 'DISCONNECTED' })
        })
        listener.on('error', () => {
            connection.status = 'ERROR'
            connection.statusLog?.push({ time: new Date(), status: 'ERROR' })
        })

        return connection
    }

    addBrokerListener(providerOptions: ProviderOptions, location: string, subscriptions: BrokerSubscriptionRequest[] | undefined): void {
        const BrokerClass = require(location)
        const broker = new BrokerClass(providerOptions, this.mode)
        broker.on(`${this.symbol?.symbol}.orderUpdate`, (order: Order) => this._onOrderUpdate(order))
        broker.on(`${this.symbol?.symbol}.orderComplete`, (order: Order) => this._onOrderComplete(order))

        // start listener
        broker.startSocketListener(subscriptions)
        this.connections.push({ class: broker, options: providerOptions })
        return
    }

    addOtherListener(providerOptions: ProviderOptions, location: string, subscriptions: any): void { }

    async placeOrder(orderRequest: OrderRequest) {
        orderRequest.botId = this.botId
        orderRequest.id = `${this.botId}-${shortid()}`
        orderRequest.currency = orderRequest.currency || this.botDetails.baseCurrency
        orderRequest.tif = orderRequest.tif || 'GTC'

        const lastPrice = await this.getLastBrokerTrade(orderRequest.symbol)
        const availableCapital = await this.getAvailableCapital(orderRequest.currency || this.botDetails.baseCurrency);
        this.orderSizeCalculator.calculateOrderSize(orderRequest, lastPrice, availableCapital)
        this.pendingOrderRequests.push(orderRequest)

        this.brokerProvider.placeOrder(orderRequest)
    }

    /**
     * Prep bar before sending to child strategy
     * @param bar bar data from market data event
     */
    async _onBarUpdate(bar: Bar): Promise<void> {
        bar = this.addBarIndicators(bar)
        this.onNextBar(bar)
    }

    addBarIndicators(bar: Bar): Bar {
        // update indicators, needs to happen here since indicators are different per strategy
        return bar
    }

    async _onOrderUpdate(order: Order): Promise<void> {
        this.activeOrders = this.activeOrders.filter(o =>  o.id !== order.id)
        if (['LOST', 'REJECTED'].includes(order.status)) {
            this.pendingOrderRequests = this.pendingOrderRequests.filter(r => r.id !== order.id)
        } else if(['OPEN', 'PARTIALLY_FILLED', 'FILLED'].includes(order.status)) {
            this.activeOrders.push(order)
        }
   
        return this.onOrderUpdate(order)
    }

    async _onOrderBookUpdate(book: OrderBook): Promise<void> {
        return this.onOrderBookUpdate(book)
    }

    async _onOrderComplete(order: Order): Promise<void> {
        return this.onOrderUpdate(order)
    }

    async onOrderComplete(order: Order): Promise<void> {}
    async onNextBar(bar: Bar): Promise<void> {}
    async onOrderBookUpdate(book: OrderBook): Promise<void> {}
    async onOrderUpdate(order: Order): Promise<void> {}

    async getLastBrokerTrade(symbol: string): Promise<number> {
        throw new Error(`getLastBrokerTrade() function not implemented!`);
    }

    async getAvailableCapital(currency: Currency): Promise<number> {
        throw new Error(`required method getAvailableCapital() not implemented for broker`);
    }
}
