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