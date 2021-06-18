import { Execution, SymbolDetails } from '../base/models/strategy-options'
import { ProviderOptions, Connection, ProviderType } from '../../collectors/base/models/provider-options'
import { Bar } from '../../collectors/base/models/bar'
import { OrderBook } from '../../collectors/base/models/order-book'
import { Order } from '../../collectors/base/models/order'
import { OrderExecution } from '../../collectors/base/broker-base'
import { Mode } from '../../common/definitions/basic'
import config from '../../../config'

export abstract class StrategyBase {
    execution: Execution
    symbol: SymbolDetails
    connections: any = []
    name: string
    mode: Mode

    constructor(execution: Execution, symbolDetails: SymbolDetails) {
        this.execution = execution
        this.mode = execution.mode
        this.symbol = symbolDetails
        this.name = this.execution.name
    }

    startup(): void {
        this.execution.providers.map(p => {
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
                        this.addMarketDataListener(providerOptions, providerScript.location)
                        break
                    case 'Broker':
                        this.addBrokerListener(providerOptions, providerScript.location)
                        break
                    default:
                        this.addOtherListener(providerOptions, providerScript.location)
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

    addMarketDataListener(providerOptions: ProviderOptions, location: string): void {
        const MarketDataClass = require(location)
        const md = new MarketDataClass(providerOptions, this.mode)
        md.on(`${this.symbol?.symbol}.bar`, (bar: Bar) => this._onBarUpdate(bar))
        md.on(`${this.symbol?.symbol}.book`, (book: OrderBook) => this._onOrderBookUpdate(book))

        this.execution.symbols.filter(s => {
            if (s.reference) {
                md.on(`${s.symbol}.bar`, (bar: Bar) => this._onBarUpdate(bar))
                md.on(`${s.symbol}.book`, (book: OrderBook) => this._onOrderBookUpdate(book))
            }
        })

        // start listener
        md.startSocketListener()

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

    addBrokerListener(providerOptions: ProviderOptions, location: string): void {
        const BrokerClass = require(location)
        const broker = new BrokerClass(providerOptions, this.mode)
        broker.on(`${this.symbol?.symbol}.orderExecution`, (order: OrderExecution) => this._onOrderExecution(order))
        broker.on(`${this.symbol?.symbol}.orderComplete`, (order: Order) => this._onOrderComplete(order))

        // start listener
        broker.startSocketListener()
        this.connections.push({ class: broker, options: providerOptions })
    }

    addOtherListener(providerOptions: ProviderOptions, location: string): void { }

    /**
     * Prep bar before sending to child strategy
     * @param bar bar data from market data event
     */
    async _onBarUpdate(bar: Bar): Promise<void> {
        bar = this.addBarIndicators(bar)
        this.onNextBar(bar)
    }

    addBarIndicators(bar: Bar): Bar {
        // update indicators
        return bar
    }

    async _onOrderExecution(order: OrderExecution): Promise<void> {
        return this.onOrderExecution(order)
    }

    async _onOrderUpdate(order: Order): Promise<void> {
        return this.onOrderUpdate(order)
    }

    async _onOrderComplete(order: Order): Promise<void> {
        return this.onOrderUpdate(order)
    }

    async _onOrderBookUpdate(book: OrderBook): Promise<void> {
        return this.onOrderBookUpdate(book)
    }

    async onNextBar(bar: Bar): Promise<void> { }
    async onOrderBookUpdate(book: OrderBook): Promise<void> { }
    async onOrderExecution(order: OrderExecution): Promise<void> {}
    async onOrderUpdate(order: Order): Promise<void> {}
}
