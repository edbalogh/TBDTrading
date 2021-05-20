/*
WebSocket Bar (from https://github.com/binance-exchange/binance-api-node#candles)
{
  eventType: 'kline',
  eventTime: 1508613366276,
  symbol: 'ETHBTC',
  open: '0.04898000',
  high: '0.04902700',
  low: '0.04898000',
  close: '0.04901900',
  volume: '37.89600000',
  trades: 30,
  interval: '5m',
  isFinal: false,
  quoteVolume: '1.85728874',
  buyVolume: '21.79900000',
  quoteBuyVolume: '1.06838790'
}

Historical Bar
[
  {
    openTime: 1508328900000,
    open: '0.05655000',
    high: '0.05656500',
    low: '0.05613200',
    close: '0.05632400',
    volume: '68.88800000',
    closeTime: 1508329199999,
    quoteAssetVolume: '2.29500857',
    trades: 85,
    baseAssetVolume: '40.61900000',
  },
]
*/

export type BinanceBar = {
    symbol: string,
    openTime: number,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
    trades: number,
    interval: string,
    closeTime?: number,
    quoteAssetVolume?: number,
    baseAssetVolume?: number,
    quoteVolume?: number,
    buyVolume?: number,
    quoteBuyVolume?: number,
    isFinal?: boolean
}