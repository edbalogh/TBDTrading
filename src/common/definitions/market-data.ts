import { LiveBarOptions, LiveOrderBookOptions, LiveTradeOptions } from "./connectors";
import { SubscriptionType } from "./websocket";

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
  
  export interface HistoricalBarOptions {
    timeframe: string,
    symbols?: string[],
    limit?: number,
    afterDate?: Date,
    startDate?: Date,
    endDate?:  Date
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

// TODO: finish this out
export interface Trade {
  symbol: string,
  price: number,
  volume: number,
  isTaker: boolean
}
