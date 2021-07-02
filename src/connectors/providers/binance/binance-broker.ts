import { BrokerProviderBase } from '../../base/broker-base'
import { ExecutionType, OrderExecution, OrderStatus, OrderSide, OrderType, BrokerBalance, AccountInfo, Balance, OrderRequest} from '../../positions/order-manager'
import { Mode } from '../../../common/definitions/basic'
import { OrderSubscriptionOptions, ProviderOptions } from '../../../common/definitions/connectors'
import { OutboundAccountInfo, ExecutionReport, BalanceUpdate, Balances, NewOrder, OrderSide as BrokerOrderSide, OrderType as BrokerOrderType, NewOcoOrder } from 'binance-api-node'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'
import { floor } from 'lodash'
const Binance = require('binance-api-node').default

const utils = require('../../../utils/legacy')

export class BinanceBroker extends BrokerProviderBase {
    providerSocket: any
    exchangeInfo?: any
    binanceClient: any
    
    constructor(options: ProviderOptions, mode: Mode) {
        super(options, mode)
        this.binanceClient = new Binance(options.apiOptions)  // TODO: pull the provider dynamically
    }

    async initialize() {
        super.initialize()
        this.exchangeInfo = await this.getExchangeInfo();
    }

    async getExchangeInfo(): Promise<any> {
        try {
            const response = await this.binanceClient.exchangeInfo()
            if (response.error) throw new Error(response.error)
            return response
        } catch(e) {
            console.log('error trying to get exchange info', e)
        } 
    }

    async getLastBrokerTrade(symbol: string): Promise<Number | undefined> {
        try {
            const response = await this.binanceClient.prices({symbol})
            if (response.error) throw new Error(response.error)
            return Number(response[symbol])
        } catch(e) {
            utils.logDetails('error getting last trade from broker for symbol', e, null, symbol)
        }       
    }

    async getCurrentAccountInfo(): Promise<AccountInfo | undefined> {
        try {
            const response = await this.binanceClient.accountInfo();
            if (response.error) throw new Error(response.error);
            return this.translateAccountInfo(response);
        } catch(e) {
            utils.logDetails('error trying to get account info', e);
        }
    }

    ////////////////////
    // WebSocket Server

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
        console.log('addProviderOrderSubscriptions')
        this.providerSocket = this.binanceClient.ws.user((event: any) => {
            switch (event.eventType) {
                case 'executionReport':
                    // console.log('binance execution event', event)
                    super.handleOrderExecutionEvent(this.translateOrderExecution(event))                    
                    break
                case 'account':
                    super.handleAccountEvent(this.translateAccountInfo(event))
                    break
                default:
                    console.log(`untracked websocket event`, event)
            }
        });
    }

    // Translators
    translateOrderExecution(execution: ExecutionReport): OrderExecution {
        return {
            symbol: execution.symbol,
            orderId: execution.originalClientOrderId || execution.newClientOrderId,
            isComplete: !execution.isOrderWorking,
            brokerOrderId: <string>(execution.orderId || execution.orderListId || ''),
            executionType: <ExecutionType>execution.executionType,
            executionTime: barEpochTimeToUTC(execution.orderTime),
            orderStatus: this.translateOrderStatus(execution.orderStatus),
            orderSide: <OrderSide>execution.side,
            orderType: <OrderType>execution.orderType,
            orderTime: barEpochTimeToUTC(execution.creationTime),
            tif: execution.timeInForce,
            rejectReason: execution.orderRejectReason,
            sharesRequested: Number(execution.quantity),
            lastTradeShares: Number(execution.lastQuoteTransacted),
            totalShares: Number(execution.totalQuoteTradeQuantity),
            priceRequested: Number(execution.price),
            lastTradePrice: Number(execution.priceLastTrade),
            amountRequested: Number(execution.quoteOrderQuantity),
            lastTradeAmount: Number(execution.lastQuoteTransacted),
            totalAmount: Number(execution.totalQuoteTradeQuantity),
            commission: Number(execution.commission),
            commissionAsset: execution.commissionAsset || '',
            tradeId: <string>(execution.tradeId || '')
        }
    }

    translateOrderStatus(status: string): OrderStatus {
        switch (status) {
            case 'EXPIRED':
                return 'CLOSED'
            case 'NEW' || 'PENDING_CANCEL':
                return 'OPEN'
            default:
                return status as OrderStatus
        }
    }

    translateAccountInfo(account: OutboundAccountInfo): AccountInfo {
        return {
            lastUpdateTime: barEpochTimeToUTC(account.lastAccountUpdate),
            balances: this._translateAccountBalances(account.balances)
        }
    }

    _translateAccountBalances(balances: Balances) {
        const b: Balance[] = []
        for (let key in balances) {
            const available = Number(balances[key].available)
            const inOrder = Number(balances[key].locked)
            const total = available + inOrder
            if (available > 0 || inOrder > 0) b.push({ asset: key, total, available, inOrder })
        }
        return b
    }

    translateBrokerBalance(balance: BalanceUpdate): BrokerBalance {
        const balanceDetails: Partial<BrokerBalance> = {}
        return <BrokerBalance>balanceDetails
    }




    //////////////////
    // Order Handling

    buildBrokerOrderFromRequest(orderRequest: OrderRequest): NewOrder {
        let brokerOrder: any = {
            newClientOrderId: orderRequest.id,
            side: <BrokerOrderSide>orderRequest.side,
            symbol: orderRequest.symbol,
            type: this.orderTypeToBrokerType(orderRequest.type),
            timeInForce: orderRequest.tif === 'OPG' ? 'GTC' : orderRequest.tif,
            quantity: orderRequest.requestedShares?.toString(),
            newOrderRespType: 'FULL'
        }

        if (orderRequest.type === 'STOP_LOSS_LIMIT') brokerOrder.stopPrice = orderRequest.stopPrice?.toString()
        if(orderRequest.type === 'BRACKET') {
            
            delete brokerOrder.newClientOrderId;
            delete brokerOrder.timeInForce;
            delete brokerOrder.type;

            brokerOrder = <NewOcoOrder>{...brokerOrder}
            brokerOrder.price = orderRequest.limitPrice?.toString()
            brokerOrder.stopPrice = orderRequest.stopPrice?.toString()
            brokerOrder.stopLimitPrice = orderRequest.stopLimitPrice?.toString()
            brokerOrder.listClientOrderId = orderRequest.id;
            return brokerOrder

        } else if (orderRequest.type === 'MARKET') {
            delete brokerOrder.timeInForce;
            delete brokerOrder.price;
            if (orderRequest.requestedAmount || 0 > 0) {
                delete brokerOrder.quantity;
                brokerOrder.quoteOrderQty = orderRequest.requestedAmount;
            }            
        } else {
            if(orderRequest.limitPrice) {
                brokerOrder.price = orderRequest.isExit ? brokerOrder.price = orderRequest.limitPrice : this.applyPrecisionToTradePrice(orderRequest.symbol, orderRequest.limitPrice);
            }
        }
        
        return brokerOrder
    }

    orderTypeToBrokerType(type: OrderType): BrokerOrderType {
        switch(type) {
            case 'STOP_LOSS':
                return 'STOP_MARKET'
            case 'STOP_LOSS_LIMIT':
                return 'STOP'
            default:
                return <BrokerOrderType>type
        }
    }

    async placeBrokerOrder(brokerOrder: any) {
        try {
            console.log('submitting order', brokerOrder)
            const response = brokerOrder.listClientOrderId ? await this.binanceClient.orderOco(brokerOrder) : await this.binanceClient.order(brokerOrder);
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
        const eInfo = this.exchangeInfo?.symbols.find((x: any) => x.symbol === symbol);
        if (!eInfo) {
            console.log('symbol not found in exchange info, defaulting to precision 2', {}, null, symbol);
            return this.applyDefaultPrecision(symbol, price, 2);
        }
        
        const priceFilter = eInfo.filters.find((x:any) => x.filterType === 'PRICE_FILTER');
        if(!priceFilter || !priceFilter.tickSize || priceFilter.tickSize === 0) return price;  // no price filter means no need for precision according to docs
        
        const precision = priceFilter.tickSize.split('.')[1].split('1')[0].length + 1

        return floor(price, precision);
    }

    applyDefaultPrecision(symbol: string, value: number, precision?: number) {
        if (!precision) {
            precision = 8; // default for now
            const eInfo = this.exchangeInfo.symbols.find((x:any) => x.symbol === symbol);
            if (!eInfo) {
                console.log('symbol not found in exchange info, defaulting to precision 8', {}, null, symbol);
            } else {
                precision = Number(eInfo.quoteAssetPrecision);
            }
        }
        
        return floor(value, precision);
    }
}

module.exports = BinanceBroker