type OrderSide = 'BUY' | 'SELL'
type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'BRACKET'
type OrderTif = 'DAY' | 'OPEN' | 'CLOSE' | 'GTC' | 'ALL'
type OrderStatus = 'OPEN' | 'CLOSED' | 'ERROR' | 'CANCELED' | 'FILLED'
type OrderFillStatus = 'NONE' | 'PARTIAL' | 'FULL'

export interface Order {
    id: string,
    symbol: string,
    base: string,
    side: OrderSide,
    type: OrderType,
    tif: OrderTif,
    status: OrderStatus,
    fillStatus: OrderFillStatus,
    price?: Number,
    amount?: Number,
    sharesRequested?: Number,
    sharesFilled?: Number,
    lastFillPrice?: Number,
    avgFillPrice?: Number
}
