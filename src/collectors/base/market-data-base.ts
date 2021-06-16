import { ProviderOptions, getProviderSocketOptionsByType } from './models/provider-options'
import { Mode } from '../../constants/types'
import { HistoricalBarOptions, LiveBarOptions, LiveOrderBookOptions, LiveTradeOptions } from './models/options'
import { EventEmitter } from 'events'
import { MarketDataSocketServer, RequestType } from './sockets/market-data-socket'
import io from 'socket.io-client'

export abstract class MarketDataProviderBase extends EventEmitter {
    id: string
    options: ProviderOptions
    mode: Mode
    client: any
    isActive: boolean = false
    activeSymbols: string[] = []
    socketClient: any   // TODO: marketListener since it could be one of many types of connections to provider
    providerServer?: MarketDataSocketServer
    subscriptionHistory: any[] = []
    
    constructor(options: ProviderOptions, mode: Mode, client: any) {
        super()
        if (!options.supportedModes.includes(mode)) throw new Error(`Provider ${options.id} does not support mode '${mode}'`)
        if (!options.scriptLocations.find(s => s.type === 'MarketData')) throw new Error(`Provider ${options.id} does not support providerType 'MarketData'`)
        this.id = options.id
        this.options = options
        this.mode = mode
        this.client = client
    }

    /**
     * Returns parameter details for this Provider
     */
    static parameterDetails(): any {
        return {
            interval: {
                type: 'select',
                templateOptions: {
                    label: 'Bar TimeFrame to Trade',
                    description: 'Timeframe in bars for this strategy',
                    required: true,
                    defaultValue: '1d',
                    options: [
                        { value: '1m', label: '1 Minute' },
                        { value: '5m', label: '5 Minute' },
                        { value: '15m', label: '15 Minute' },
                        { value: '1h', label: '1 Hour' },
                        { value: '1d', label: '1 Day' }
                    ]
                }
            },
            limit: {
                type: 'input',
                templateOptions: {
                    label: 'Backtest Bar Limit',
                    description: 'Number of Bars to Pull for Testing',
                    required: false,
                    min: 1,
                    max: 5000
                }
            },
            afterDate: {
                type: 'input',
                templateOptions: {
                    label: 'BackTest After Date',
                    description: 'Pull all bars after this date to the current',
                    required: false
                }
            },
            startDate: {
                type: 'input',
                templateOptions: {
                    label: 'BackTest Start Date',
                    description: 'Pull all bars starting with this date',
                    required: false
                }
            },
            endDate: {
                type: 'input',
                templateOptions: {
                    label: 'BackTest End Date',
                    description: 'Pull all bars ending with this date',
                    required: false
                }
            }
        }
    }

    /**
     * Run processes to setup the market data provider
     */
    async startup(): Promise<boolean> {
        return this.healthCheck();
    }

    /**
     * Run processes prior to closing down the market data provider
     */
    async shutdown(): Promise<null> {
        return this.socketClient()
    }

    /**
     * Ping market data provider to ensure connection is established
     */
    async healthCheck(): Promise<boolean> {
        this.isActive = false;
        return this.isActive;
    }

    /**
     * generic emitter that will either send to a websocket or local based on setup
     * @param event event that is being sent out
     * @param data data that goes with the event
     */
    emitter(event: string, data: any) {
        this.providerServer ? this.providerServer.socketServer?.emit(event, data) : this.emit(event, data)
    }

    /**
       * Converts broker specific bar/candlestick to platform specific
       * @param brokerBar the broker bar to convert
       */
    translateBar(brokerBar: any): void {}

    /**
     * Pull historical bar data from API returning as a list of lists (Bar[symbol][bars])
     * @param options options for requesting bars from an api
     */
    getHistoricalBarData(options: HistoricalBarOptions): void { }

    /**
     * Open socket and/or add subscriptions for live bar data
     * @param options options for requesting bars from a websocket
     */
    getLiveBarData(options: LiveBarOptions) {
        this.subscriptionHistory.push({topic: 'addBarSubscriptions', options})     
        this.socketClient.send('addBarSubscriptions', options)
    }

    /**
     * Open socket and/or add subscriptions for live bar data
     * @param options options for requesting live order book data
     */
    getLiveOrderBook(options: LiveOrderBookOptions) {
        this.subscriptionHistory.push({topic: 'addBookSubscriptions', options})
        this.socketClient.send('addBookSubscriptions', options)
    }

    serverRunning(): boolean {
        return true
    }

    // WebSocket Server
    startSocketServer() {
        this.providerServer = new MarketDataSocketServer(this.options, this.mode)
        this.providerServer.startServer()

        // register the Provider specific method to be called when a new subsription is requested
        const eventCallbacks: Map<RequestType, Function> = new Map()
        eventCallbacks.set('addBarSubscriptions', this.addServerBarSubscription.bind(this))
        eventCallbacks.set('addBookSubscriptions', this.addServerBookSubscription.bind(this))
        eventCallbacks.set('addTradeSubscriptions', this.addServerTradeSubscription.bind(this))

        this.providerServer.registerEvents(eventCallbacks)
    }

    stopSocketServer() {
        this.providerServer?.close()
    }
    
    // method to add the bar subscription to the local server
    addServerBarSubscription(options: LiveBarOptions) {
        this.addProviderBarSubscriptions(options)    
    }
    
    addServerBookSubscription(options: LiveOrderBookOptions) {
        this.addProviderBookSubscriptions(options)
    }

    addServerTradeSubscription(options: LiveBarOptions) {
        this.addProviderTradeSubscriptions(options)    
    }

    // implement on provider class
    addProviderBarSubscriptions(options: LiveBarOptions): any {}
    addProviderBookSubscriptions(options: LiveOrderBookOptions): any {}
    addProviderTradeSubscriptions(options: LiveTradeOptions): any {}


    // WebSocket Listener
    startSocketListener() {
        const wsOptions = getProviderSocketOptionsByType(this.options, 'MarketData', this.mode)
        const port = wsOptions ? wsOptions.port : 3000
        const url = wsOptions && wsOptions.url ? wsOptions.url : 'http://localhost'
        this.socketClient = io(`${url}:${port}`)
        this.socketClient.onAny((event: any, ...args: any) => {
            this.emit(event, ...args)
        })

        this.socketClient.on('connect', () => {
            this.subscriptionHistory.forEach(h => {
                this.socketClient.send(h.topic, h.options)
            })
        })
    }

    stopSocketListener() {
        this.socketClient.close()
    }
}
