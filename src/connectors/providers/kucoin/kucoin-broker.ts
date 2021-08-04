import { BrokerProviderBase } from '../../base/broker-base'
import { ExecutionType, OrderExecution, OrderStatus, OrderSide, OrderType, BrokerBalance, AccountInfo, Balance, OrderRequest } from '../../positions/order-manager'
import { Currency, Mode } from '../../../common/definitions/basic'
import { OrderSubscriptionOptions, ProviderOptions } from '../../../common/definitions/connectors'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'
import { floor } from 'lodash'

const utils = require('../../../utils/legacy')

export interface NewOrder {
    clientOid: string,
    side: 'buy' | 'sell',
    symbol: string,
    type: 'limit' | 'market',
    remark: string,
    tradeType: 'TRADE' | 'MARGIN_TRADE',
    price: number,
    timeInForce: 'GTC' | 'GTT' | 'IOC' | 'FOK',
    size?: number,          // both size/finds required for limit orders
    funds?: number,         // one or the other for market orders
    stop?: 'loss' | 'entry',
    stopPrice?: number,
    cancelAfter?: number,
    postOnly?: boolean,
    hidden?: boolean,
    iceberg?: boolean,
    visibleSize?: string
}

export interface SpotSymbolInfo {
    symbol: string,
    name: string,
    baseCurrency: string,
    quoteCurrency: string,
    baseMinSize: number,
    quoteMinSize: number,
    baseMaxSize: number,
    quoteMaxSize: number,
    baseIncrement: number,
    quoteIncrement: number,
    priceIncrement: number,
    feeCurrency: string,
    enableTrading: true,
    isMarginEnabale: true,
    priceLimitRate: number
}


export class KucoinBroker extends BrokerProviderBase {
    spotExchangeSymbolInfo: SpotSymbolInfo[] = []

    constructor(options: ProviderOptions, mode: Mode) {
        super(options, mode)

        // initialize spot client
        if (options.apiOptions.spot) {
            this.spotApi = require('kucoin-node-api')
            this.spotApi.init(options.apiOptions.spot)
            this.spotEnabled = true
        }

        // initialize futures client
        // if (options.apiOptions.futures) {
        //     this.futuresApi = require('kucoin-futures-node-api')
        //     this.futuresApi.init(options.apiOptions.futures)
        //     this.futuresEnabled = true
        // }

        // // if apiOptions are at the root (similar to other implementations), create the spot client
        // if (!this.spotApi && !this.futuresApi) {
        //     console.log('using apiOptions to create spot client')
        //     this.spotApi = require('kucoin-node-api')
        //     this.spotApi.init(options.apiOptions)
        //     this.spotEnabled = true
        // }
    }

    async initialize() {
        super.initialize()
        this.spotExchangeSymbolInfo = (await this.getSpotExchangeSymbolInfo()) || []
        return
    }

    async getSpotExchangeSymbolInfo(): Promise<SpotSymbolInfo[] | void> {
        try {
            const response = await this.spotApi.symbols()
            if (response.error) throw new Error(response.error)
            return <SpotSymbolInfo[]>response
        } catch(e) {
            console.log('error trying to get exchange symbol info', e)
        } 
    }

    async getCurrentAccountInfo(type: string = 'trade'): Promise<AccountInfo | undefined> {
        try {
            const response = await this.spotApi.accounts({type})
            if (response.error) throw new Error(response.error)
            return this.translateAccountInfo(response)
        } catch (e) {
            utils.logDetails('error calling kucoin account endpoint', e)
        }
    }

    translateAccountInfo(account: any): AccountInfo {
        return {
            lastUpdateTime: new Date(),
            balances: account.map( (a: any) => {
                return {
                    asset: Number(a.currency),
                    available: Number(a.available),
                    inOrder: Number(a.hold || a.holds),
                    total: Number(a.balance || a.total)
                }
            })
        }
    }

    async getLastBrokerTrade(symbol: string): Promise<Number | undefined> {
        try {
            const response = await this.spotApi.get24hrStats({symbol})
            if (response.error) throw new Error(response.error)
            return Number(response[symbol])
        } catch(e) {
            console.log('error getting last trade from broker for symbol', e, null, symbol)
        }       
    }


    // ////////////////////
    // // WebSocket Server

    addProviderOrderSubscriptions(options: OrderSubscriptionOptions): any {
        this.addProviderUserSubscriptions()
    }
    addProviderAccountSubscriptions(): any {
        this.addProviderUserSubscriptions()
    }
    addProviderBalanceSubscriptions(): any {
        this.addProviderUserSubscriptions()
    }

    addProviderUserSubscriptions(): void {
        console.log('Kucoin Subscription Started for Spot/Margin Messages')
        this.brokerSocket = this.spotApi.initSocket( {topic: "balances"}, (event: any) => {
            switch (event.topic) {
                case '/spotMarket/tradeOrders':
                case '/spotMarket/advancedOrders':
                    super.handleOrderExecutionEvent(this.translateOrderExecution(event.data))
                case '/account/balance':
                    super.handleAccountEvent(this.translateAccountInfo(event.data))
                    break
                default:
                    console.log(`untracked websocket event`, event)
            }
        });
    }


    // Translators
    translateOrderExecution(execution: any): OrderExecution {
        return {
            symbol: execution.symbol,
            orderId: execution.clientOid,
            isComplete: Number(execution.remainSize) === 0,
            brokerOrderId: execution.orderId,
            executionType: this.translateExecutionType(execution.type),
            executionTime: barEpochTimeToUTC(execution.orderTime),
            orderStatus: this.translateOrderStatus(execution.orderStatus, execution.orderType),
            orderSide: <OrderSide>execution.side.toUpperCase(),
            orderType: <OrderType>execution.orderType.toUpperCase(),
            orderTime: barEpochTimeToUTC(execution.orderTime),
            tif: 'GTC',
            sharesRequested: Number(execution.size),
            lastTradeShares: Number(execution.matchSize),
            totalShares: Number(execution.filledSize),
            priceRequested: Number(execution.price),
            lastTradePrice: Number(execution.matchPrice),
            // amountRequested: Number(execution.quoteOrderQuantity),
            // lastTradeAmount: Number(execution.lastQuoteTransacted),
            // totalAmount: Number(execution.totalQuoteTradeQuantity),
            commission: Number(execution.fee),
            commissionAsset: execution.feeCurrency || '',
            tradeId: <string>(execution.tradeId || '')
        }
    }

    translateExecutionType(type: string): ExecutionType {
        switch(type) {
            case 'open':
                return <ExecutionType>'NEW'
            case 'canceled':
                return <ExecutionType>'CANCELED'
            case 'update':
                return <ExecutionType>'UPDATE'
            default:
                return <ExecutionType>'TRADE'
        }
    }

    translateOrderStatus(status: string, type: string): OrderStatus {
        if(status === 'done') {
            if(type === 'canceled') return <OrderStatus>'CANCELED'
            if(type === 'filled') return <OrderStatus>'FILLED'
            return <OrderStatus>'CLOSED'
        }

        if(status === 'match') return <OrderStatus>'PARTIALLY_FILLED'
        
        return <OrderStatus>'OPEN'
    }


    // //////////////////
    // // Order Handling

    buildBrokerOrderFromRequest(orderRequest: OrderRequest): NewOrder {
        let brokerOrder: any = {
            clientOid: orderRequest.id,
            side: orderRequest.side.toLowerCase(),
            symbol: orderRequest.symbol,
            type: this.orderTypeToBrokerType(orderRequest.type),
            timeInForce: orderRequest.tif,
            size: orderRequest.requestedShares?.toString()
        }

        if (orderRequest.type === 'STOP_LOSS_LIMIT') brokerOrder.stopPrice = orderRequest.stopPrice?.toString()
        if(orderRequest.type === 'BRACKET') {
            throw new Error('BRACKET order not supported for this broker!')
        }

        if (orderRequest.type === 'MARKET') {
            delete brokerOrder.timeInForce;
            delete brokerOrder.price;
            if (orderRequest.requestedAmount || 0 > 0) {
                delete brokerOrder.quantity;
                brokerOrder.funds = orderRequest.requestedAmount;
            }            
        } else {
            if(orderRequest.limitPrice) {
                brokerOrder.price = this.applyPrecisionToTradePrice(orderRequest.symbol, orderRequest.limitPrice);
            }
        }

        // add any broker specific options sent directly from the model and return
        return {...brokerOrder, ...orderRequest.brokerSpecificOptions}
    }

    orderTypeToBrokerType(type: OrderType): string {
        switch(type) {
            case 'STOP_LOSS':
                return 'market'
            case 'STOP_LOSS_LIMIT':
                return 'limit'
            default:
                return type.toLowerCase()
        }
    }

    async placeBrokerOrder(brokerOrder: any) {
        try {
            console.log('submitting order', brokerOrder)
            const response = await this.spotApi.placeOrder(brokerOrder);
            if (response.error) {
                throw new Error(response.error);
            }
            return response;
        } catch(e) {
            throw new Error(e);
        }
    }

    applyPrecisionToTradeShares(symbol: string, shares: number) {
        return this.applyDefaultPrecision(symbol, shares);
    }

    applyPrecisionToTradeAmount(symbol: string, amount: number) {
        return this.applyDefaultPrecision(symbol, amount);
    }

    applyPrecisionToTradePrice(symbol: string, price: number) {
        const eInfo = this.spotExchangeSymbolInfo.find((x: any) => x.symbol === symbol);
        if (!eInfo) {
            console.log('symbol not found in exchange info, defaulting to precision 2', {}, null, symbol);
            return this.applyDefaultPrecision(symbol, price, 2);
        }

        if(eInfo.baseMinSize === 0) return price;  // no price filter means no need for precision according to docs

        const precision = eInfo.baseMinSize.toString().split('.')[1].split('1')[0].length + 1

        return floor(price, precision);
    }

    applyDefaultPrecision(symbol: string, value: number, precision?: number) {
        if (!precision) {
            precision = 8; // default for now
            const eInfo = this.spotExchangeSymbolInfo.find((x:any) => x.symbol === symbol);
            if (!eInfo) {
                console.log('symbol not found in exchange info, defaulting to precision 8', {}, null, symbol);
            } else {
                precision = Number(eInfo.quoteMinSize.toString().split('.')[1].split('1')[0].length + 1);
            }
        }

        return floor(value, precision);
    }
}

module.exports = KucoinBroker