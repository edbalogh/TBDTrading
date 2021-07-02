import { Currency } from "../../common/definitions/basic"
import { sum, divide } from 'lodash'

export type OrderStatus = 'OPEN' | 'REJECTED' | 'CLOSED' | 'CANCELED' | 'ERROR' | 'LOST' | 'FILLED' | 'PARTIALLY_FILLED'
export type OrderSide = 'BUY' | 'SELL'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'OPG'
export type OrderType = 'LIMIT' | 'LIMIT_MAKER' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'BRACKET'
export type ExecutionType = 'NEW' | 'CANCELED' | 'REPLACED' | 'REJECTED' | 'TRADE' | 'EXPIRED'
export type OrderFillStatus = 'NONE' | 'PARTIAL' | 'FULL'
export interface OrderExecution {
    symbol: string,
    orderId: string,
    brokerOrderId: string,
    executionType: ExecutionType,
    executionTime: Date,
    isComplete: boolean,
    orderType: OrderType,
    orderTime: Date,
    orderStatus: OrderStatus,
    orderSide: OrderSide,
    tif: TimeInForce,
    sharesRequested: number,
    lastTradeShares?: number,
    totalShares: number,
    priceRequested?: number,
    lastTradePrice?: number,
    avgPrice?: number,
    amountRequested?: number,
    lastTradeAmount?: number,
    totalAmount?: number,
    rejectReason?: string,
    commission?: number,
    commissionAsset?: string,
    tradeId?: string
}

export interface AccountInfo {
    lastUpdateTime: Date,
    balances: Balance[]
}

export interface Balance {
    asset: string,
    total: number,
    available: number,
    inOrder: number
}

export interface BrokerBalance {
    available: number,
    locked: number
}

export interface OrderRequest {
    id: string,
    botId: string,
    symbol: string,
    currency: Currency,
    side: OrderSide,
    type: OrderType,
    tif: TimeInForce,
    limitPrice?: number,
    stopPrice?: number,
    stopLimitPrice?: number,
    requestedAmount?: number,
    requestedShares?: number,
    isExit: boolean
}

export interface Order {
    id: string,
    botId: string,
    isActive: boolean,
    symbol: string,
    currency: string,
    side: OrderSide,
    type: OrderType,
    tif: TimeInForce,
    status: OrderStatus,
    fillStatus: OrderFillStatus,
    price?: Number,
    amount?: Number,
    shares?: Number,
    lastFillPrice?: Number,
    avgFillPrice?: Number,
    lastFillAmount?: Number,
    totalFillAmount?: Number,
    lastFillShares?: Number,
    totalFillShares?: Number,
    rejectReason?: string,
    trades: Trade[]
}

export interface Trade {
    tradeId: string,
    price: number,
    shares: number,
    amount: number,
    commission: number
}



export class OrderManager {
    activeOrders: Order[] = []
    pendingOrders: OrderRequest[]= []

    constructor() {}

processOrderExecution(orderExecution: OrderExecution) {
        let order:Order
        switch(orderExecution.executionType) {
            case 'NEW':
                const pending = this.pendingOrders.find(p => p.id === orderExecution.orderId)
                if (!pending) {
                    console.log('no pending orders found', this.pendingOrders)
                    return
                }            
                order = this.createOrderFromNewExecution(orderExecution, pending)
                this.activeOrders.push(order)
                this.pendingOrders = this.pendingOrders.filter(p => p.id !== orderExecution.orderId)
                return order
            // case 'CANCELED':
            // case 'EXPIRED':
            default:
                const active = this.activeOrders.find(a => a.id === orderExecution.orderId)
                if (!active) {
                    console.log('order not found in active orders', orderExecution.orderId, this.activeOrders)
                    return
                }
                order = this.updateOrderFromExecution(orderExecution, active)
        }
        return order
    }

    createOrderFromNewExecution(orderExecution: OrderExecution, pendingOrder: OrderRequest): Order {
        return {
            id: orderExecution.orderId,
            botId: pendingOrder.botId || '',
            isActive: !orderExecution.isComplete,
            symbol: orderExecution.symbol,
            currency: pendingOrder.currency || 'USD',
            side: orderExecution.orderSide,
            type: orderExecution.orderType,
            tif: orderExecution.tif,
            status: orderExecution.orderStatus,
            fillStatus: 'NONE',
            price: orderExecution.priceRequested,
            amount: orderExecution.amountRequested,
            shares: pendingOrder.requestedShares,
            lastFillPrice: orderExecution.lastTradePrice,
            avgFillPrice: 0,
            lastFillAmount: orderExecution.lastTradeAmount,
            totalFillAmount: orderExecution.totalAmount,
            trades: []
        }
    }

    updateOrderFromExecution(orderExecution: OrderExecution, activeOrder: Order): Order {
        const fillStatus = ['FILLED', 'PARTIALLY_FILLED'].includes(orderExecution.orderStatus) ? orderExecution.orderStatus : activeOrder.fillStatus
        
        if(orderExecution.tradeId) {
            activeOrder.trades.push({
                tradeId: orderExecution.tradeId, price: Number(orderExecution.lastTradePrice), shares: Number(orderExecution.lastTradeShares),
                amount: Number(orderExecution.lastTradeAmount), commission: Number(orderExecution.commission)
            })
        }

        return {
            id: activeOrder.id,
            botId: activeOrder.botId,
            isActive: !orderExecution.isComplete,
            symbol: activeOrder.symbol,
            currency: activeOrder.currency,
            side: activeOrder.side,
            type: activeOrder.type,
            tif: activeOrder.tif,
            status: orderExecution.orderStatus,
            fillStatus: fillStatus as OrderFillStatus,
            lastFillPrice: orderExecution.lastTradePrice,
            avgFillPrice: divide(sum(activeOrder.trades.map(t => t.amount)), sum(activeOrder.trades.map(t => t.shares))),
            lastFillAmount: orderExecution.lastTradeAmount,
            totalFillAmount: orderExecution.totalAmount,
            rejectReason: orderExecution.rejectReason,
            trades: activeOrder.trades
        }
    }
}