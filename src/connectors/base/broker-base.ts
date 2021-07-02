import { ProviderOptions, getProviderSocketOptionsByType, BrokerSubscriptionRequest, OrderSubscriptionOptions } from '../../common/definitions/connectors'
import { Mode, Currency } from '../../common/definitions/basic'
import { EventEmitter } from 'events'
import io from 'socket.io-client'
import { OrderRequest, AccountInfo, OrderExecution, Order, OrderManager } from '../positions/order-manager'
import { PositionManager } from '../positions/position-manager'

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
    providerClient: any
    isActive: boolean = false
    socketClient: any   // TODO: marketListener since it could be one of many types of connections to provider
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

        this.socketClient.on('connect', () => {
            if (subscriptions.length > 0) {
                subscriptions.forEach((s: BrokerSubscriptionRequest) => {
                    switch (s.type) {
                        case 'ORDER':
                            this.addProviderOrderSubscriptions(s.options)
                            break
                    }
                })
            }
            this.subscriptionHistory.forEach(h => {
                this.socketClient.send(h.topic, h.options)
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
        console.log('pending orders after', this.orderManager.pendingOrders)
        const brokerOrder = this.buildBrokerOrderFromRequest(orderRequest)
        return this.placeBrokerOrder(brokerOrder)
    }

    abstract getLastBrokerTrade(symbol: string): Promise<Number | undefined>

    handleOrderExecutionEvent(orderExecution: OrderExecution): void {
        const order = this.orderManager.processOrderExecution(orderExecution)
        if (order) this.positionManager.updateWithOrder(order)
        console.log('EXECUTION PROCESSED', order)
        this.emit(`${orderExecution.symbol}.orderUpdate`, order)
    }

    handleAccountEvent(accountInfo: AccountInfo) {}
    
}
