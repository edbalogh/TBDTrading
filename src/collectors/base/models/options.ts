export interface HistoricalBarOptions {
    timeframe: string,
    symbols?: string[],
    limit?: number,
    afterDate?: Date,
    startDate?: Date,
    endDate?:  Date
}

export interface LiveBarOptions {
    symbols: string[],
    timeframe?: string,
    showActive?: boolean
}


export interface LiveOrderBookOptions {
    symbols: string[]
}

export interface LiveTradeOptions {
    symbols: string[]
}