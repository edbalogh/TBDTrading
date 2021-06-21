import { Currency } from "./basic"
import { SubscriptionType } from "./websocket"

export type OrderStatus = 'OPEN' | 'REJECTED' | 'CLOSED' | 'CANCELED' | 'ERROR' | 'LOST' | 'FILLED' | 'PARTIALLY_FILLED'
export type OrderSide = 'BUY' | 'SELL'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'OPG'
export type OrderType = 'LIMIT' | 'LIMIT_MAKER' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'BRACKET'
export type ExecutionType = 'NEW' | 'CANCELED' | 'REPLACED' | 'REJECTED' | 'TRADE' | 'EXPIRED'
export type OrderFillStatus = 'NONE' | 'PARTIAL' | 'FULL'

export type BrokerStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
export interface BrokerOptions {
    id: string,
    name: string,
    class: string,
    parameterDetails: Map<string, any>    
}

export interface OrderExecution {
    symbol: string,
    orderId: string,
    brokerOrderId: string,
    executionType: ExecutionType,
    executionTime: Date,
    orderType: OrderType,
    orderTime: Date,
    orderStatus: OrderStatus,
    orderSide: OrderSide,
    tif: TimeInForce,
    executionQuantity: number,
    totalQuantity: number,
    executionPrice: number,
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
    id?: string,
    botId?: string,
    symbol: string,
    currency?: Currency,
    side: OrderSide,
    type: OrderType,
    tif?: TimeInForce,
    limitPrice?: number,
    stopPrice?: number,
    stopLimitPrice?: number,
    requestedAmount?: number,
    requestedShares?: number,
    isExit: boolean
}

export interface Order {
    id: string,
    botId: number,
    symbol: string,
    currency: string,
    side: OrderSide,
    type: OrderType,
    tif: TimeInForce,
    status: OrderStatus,
    fillStatus: OrderFillStatus,
    price?: Number,
    amount?: Number,
    sharesRequested?: Number,
    sharesFilled?: Number,
    lastFillPrice?: Number,
    avgFillPrice?: Number
}

export interface Position {
    botId: string,
    symbol: string,
    currentShares: number,  // negative is short, positive is long
    sharesOnOrder: number
}
