export interface Bar {
    providerId: string,
    start: Date,
    symbol: string,
    timeframe: string,
    high: Number,
    low: Number,
    open: Number,
    close: Number,
    source?: string,
    inProgress: Boolean,
    volume?: Number,
    end?: Date,
    trades?: Number
}
