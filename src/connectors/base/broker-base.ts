import { ProviderOptions, getProviderSocketOptionsByType, BrokerSubscriptionRequest, OrderSubscriptionOptions } from '../../common/definitions/connectors'
import { Mode, Currency } from '../../common/definitions/basic'
import { EventEmitter } from 'events'
import io from 'socket.io-client'
import { OrderRequest, AccountInfo, OrderExecution, Order, OrderManager } from '../positions/order-manager'
import { PositionManager } from '../positions/position-manager'
import { Server, Socket } from 'socket.io'

export type BrokerStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
export interface BrokerOptions {
    id: string,
    name: string,
    class: string,
    parameterDetails: Map<string, any>
}


export abstract class BrokerProviderBase extends EventEmitter {
    id: string
    options: ProviderOptions
    mode: Mode
    isActive: boolean = false
    providerServer?: Server     // represents the websocket server if instantiate for that purpose    
    socketClient: any       // represents the websocket listener to the provider service (each class will instantiate one or the other)
    subscriptionHistory: any[] = []
    activeSymbols: string[] = []
    positionManager: PositionManager = new PositionManager()
    orderManager: OrderManager = new OrderManager()

    constructor(options: ProviderOptions, mode: Mode) {
        super()
        if (!options.supportedModes.includes(mode)) throw new Error(`Provider ${options.id} does not support mode '${mode}'`)
        if (!options.scriptLocations.find(s => s.type === 'Broker')) throw new Error(`Provider ${options.id} does not support providerType 'Broker'`)
        this.id = options.id
        this.options = options
        this.mode = mode
    }

    static parameterDetails() {
        return {
            provider: {
                label: { text: "Provider" }, editorOptions: { disabled: true }
            },
            pdtEnabled: {
                type: 'checkbox',
                templateOptions: {
                    label: 'Enforce PDT',
                    description: 'Pattern Day Trading rules should be enforced on this account',
                    defaultValue: false
                }
            },
            supportsFractionalShares: {
                type: 'checkbox',
                templateOptions: {
                    label: 'Fractional Shares',
                    description: 'This broker supports fractional shares',
                    defaultValue: true
                }
            },
            baseCurrency: {
                type: 'select',
                templateOptions: {
                    label: 'Base Currency',
                    description: 'Base currency for this broker (used to display overall p&l)',
                    defaultValue: 'USD',
                    options: [
                        { value: 'USD', label: 'US Dollar' },
                        { value: 'USDT', label: 'USDT' },
                        { value: 'BUSD', label: 'BUSD' },
                        { value: 'USDC', label: 'USDC' },
                        { value: 'BTC', label: 'Bitcoin' }
                    ]
                }
            },
            maxCapitalPerStrategy: {
                type: 'input',
                templateOptions: {
                    type: 'number',
                    label: 'Max Capital per Strategy',
                    description: 'The maximimum dollar amount available for each strategy',
                    defaultValue: 1000,
                    min: 0
                }
            },
            maxCapitalPerSymbol: {
                type: 'input',
                templateOptions: {
                    type: 'number',
                    label: 'Max Capital per Symbol',
                    description: 'The maximimum dollar amount available for each symbol',
                    defaultValue: 1000,
                    min: 0
                }
            },
            maxPositionsPerSymbol: {
                type: 'input',
                templateOptions: {
                    label: 'Max Positions per Symbol',
                    description: 'The maximimum amount of shares allowed to trade at one time',
                    defaultValue: 1,
                    min: 0
                }
            }
        }
    }

    async initialize() { }

    /**
     * generic emitter that will either send to a websocket or local based on setup
     * @param event event that is being sent out
     * @param data data that goes with the event
     */
    emitter(event: string, data: any) {
        this.providerServer ? this.providerServer.emit(event, data) : this.emit(event, data)
    }

    setProviderServer(server: Server) {
        this.providerServer = server
    }

    async getAvailableCapital(currency: Currency): Promise<number> {
        const capital = (await this.getCurrentAccountInfo(currency))?.balances.find(x => x.asset.toUpperCase() === currency.toUpperCase());
        return capital ? capital.available : 0;
    }

    abstract getCurrentAccountInfo(currency: Currency): Promise<AccountInfo | undefined>


    //////////////////////
    // WebSocket Listener

    // implement on provider class, registers for data from provider
    abstract addProviderOrderSubscriptions(options: OrderSubscriptionOptions): any
    abstract addProviderAccountSubscriptions(): any
    abstract addProviderBalanceSubscriptions(): any

    startSocketListener(subscriptions: BrokerSubscriptionRequest[]) {
        const wsOptions = getProviderSocketOptionsByType(this.options, 'Broker', this.mode)
        console.log('Broker options', wsOptions)
        const port = wsOptions ? wsOptions.port : 3000
        const url = wsOptions && wsOptions.url ? wsOptions.url : 'http://localhost'
        this.socketClient = io(`${url}:${port}`)
        this.socketClient.onAny((event: any, ...args: any) => {
            this.emit(event, ...args)
        })

        // keep subscriptions in memory in case connection is reset
        this.subscriptionHistory = this.subscriptionHistory.concat(subscriptions)

        this.socketClient.on('connect', (socket: Socket) => {
            // subscribe to events on the ProviderServer
            this.subscriptionHistory.forEach(h => {
                if (h.type === 'ORDER') {
                    console.log('requesting ORDER subscription', h)
                    this.socketClient.send('addOrderSubscriptions', h.options)
                }
            })
        })
    }

    stopSocketListener() {
        this.socketClient.close()
    }


    /////////////////////
    // Order Handling

    abstract buildBrokerOrderFromRequest(orderRequest: OrderRequest): any
    abstract placeBrokerOrder(brokerOrder: any): void

    async placeOrder(orderRequest: OrderRequest) {
        this.orderManager.pendingOrders.push(orderRequest)
        const brokerOrder = this.buildBrokerOrderFromRequest(orderRequest)
        return this.placeBrokerOrder(brokerOrder)
    }

    abstract getLastBrokerTrade(symbol: string): Promise<Number | undefined>

    handleOrderExecutionEvent(orderExecution: OrderExecution): void {
        const order = this.orderManager.processOrderExecution(orderExecution)

        console.log(`OrderExecutionEvent`, order)

        if (!order) return
        const position = this.positionManager.updateWithOrder(order)
        if (!order.isActive) {
            console.log('SENDING ORDER FINISHED')
            this.emitter(`${order.symbol}.orderFinished`, {order, position})
        }

        console.log('SENDING ORDER UPDATED')
        this.emitter(`${order.symbol}.orderUpdate`, {order, position})
    }

    handleAccountEvent(accountInfo: AccountInfo) { }

}
