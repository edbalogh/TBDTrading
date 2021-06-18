export type OrderStatus = 'OPEN' | 'REJECTED' | 'CLOSED' | 'CANCELED' | 'ERROR' | 'LOST' | 'FILLED' | 'PARTIALLY_FILLED'
export type OrderSide = 'BUY' | 'SELL'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'OPG'
export type OrderType = 'LIMIT' | 'LIMIT_MAKER' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'
export type ExecutionType = 'NEW' | 'CANCELED' | 'REPLACED' | 'REJECTED' | 'TRADE' | 'EXPIRED'
export type OrderFillStatus = 'NONE' | 'PARTIAL' | 'FULL'

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

export interface OrderBook {
    providerId: string,
    source: string,
    eventTime: Date,
    symbol: string,
    bids: BookLevel[],
    asks: BookLevel[]
}

export interface BookLevel {
    price: number,
    quantity: number
}


export interface Order {
    id: string,
    symbol: string,
    base: string,
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
