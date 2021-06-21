import { ProviderOptions, getProviderSocketOptionsByType, OrderSubscriptionOptions, BrokerSubscriptionRequest } from '../../common/definitions/connectors'
import { BrokerSocketServer } from './sockets/broker-socket'
import { BrokerRequestType } from '../../common/definitions/websocket'
import { Mode, Currency } from '../../common/definitions/basic'
import { EventEmitter } from 'events'
import io from 'socket.io-client'
import { OrderRequest, AccountInfo } from '../../common/definitions/broker'

export abstract class BrokerProviderBase extends EventEmitter {
    id: string
    options: ProviderOptions
    mode: Mode
    client: any
    isActive: boolean = false
    activeSymbols: string[] = []
    socketClient: any   // TODO: marketListener since it could be one of many types of connections to provider
    providerServer?: BrokerSocketServer
    subscriptionHistory: any[] = []

    constructor(options: ProviderOptions, mode: Mode, client: any) {
        super()
        if (!options.supportedModes.includes(mode)) throw new Error(`Provider ${options.id} does not support mode '${mode}'`)
        if (!options.scriptLocations.find(s => s.type === 'Broker')) throw new Error(`Provider ${options.id} does not support providerType 'Broker'`)
        this.id = options.id
        this.options = options
        this.mode = mode
        this.client = client
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

    async initialize() {}

    /**
     * generic emitter that will either send to a websocket or local based on setup
     * @param event event that is being sent out
     * @param data data that goes with the event
     */
    emitter(event: string, data: any) {
        this.providerServer ? this.providerServer.socketServer?.emit(event, data) : this.emit(event, data)
    }

    async getAvailableCapital(currency: Currency): Promise<number> {
        const capital = (await this.getCurrentAccountInfo(currency))?.balances.find(x => x.asset.toUpperCase() === currency.toUpperCase());
        return capital ? capital.available : 0;
    }

    abstract getCurrentAccountInfo(currency: Currency): Promise<AccountInfo | undefined>

    /////////////////////    
    // WebSocket Server

    startSocketServer() {
        this.providerServer = new BrokerSocketServer(this.options, this.mode)
        this.providerServer.startServer()

        // register the Provider specific method to be called when a new subsription is requested
        const eventCallbacks: Map<BrokerRequestType, Function> = new Map()
        eventCallbacks.set('addOrderSubscriptions', this.addServerOrderSubscriptions.bind(this))
        eventCallbacks.set('addAccountSubscription', this.addServerAccountSubscription.bind(this))
        eventCallbacks.set('addBalanceSubscription', this.addServerBalanceSubscription.bind(this))

        // add Account and Balance listeners
        this.providerServer.registerEvents(eventCallbacks)
        this.providerServer.handleAccountSubscriptionRequest('server', this.addServerAccountSubscription.bind(this))
    }

    stopSocketServer() {
        this.providerServer?.close()
    }

    getLiveAccountData() {
        this.subscriptionHistory.push({ topic: 'addAccountSubscription' })
        this.socketClient.send('addAccountSubscription')
    }

    getLiveOrderExecutionData() {
        this.subscriptionHistory.push({ topic: 'addOrderSubscriptions' })
        this.socketClient.send('addOrderSubscriptions')
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

    // implement on provider class, registers for a new bar
    abstract addProviderOrderSubscriptions(options: OrderSubscriptionOptions): any
    abstract addProviderAccountSubscriptions(): any
    abstract addProviderBalanceSubscriptions(): any



    //////////////////////
    // WebSocket Listener
    
    startSocketListener(subscriptions: BrokerSubscriptionRequest[]) {
        const wsOptions = getProviderSocketOptionsByType(this.options, 'Broker', this.mode)
        const port = wsOptions ? wsOptions.port : 3000
        const url = wsOptions && wsOptions.url ? wsOptions.url : 'http://localhost'
        this.socketClient = io(`${url}:${port}`)
        this.socketClient.onAny((event: any, ...args: any) => {
            this.emit(event, ...args)
        })

        this.socketClient.on('connect', () => {
            subscriptions.forEach((s: BrokerSubscriptionRequest) => {
                switch(s.type) {
                    case 'ORDER':
                        this.addProviderOrderSubscriptions(s.options)
                        break
                }
            })
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
        const brokerOrder = this.buildBrokerOrderFromRequest(orderRequest)
        return this.placeBrokerOrder(brokerOrder)
    }
}
