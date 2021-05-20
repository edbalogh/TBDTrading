/* 
1.  make sure your config.ts is setup
        providers: {
            binance: {
                apiKey: "API_KEY_GOES_HERE",
                apiSecret: "API_SECRET_GOES_HERE",
                httpBase: "https://api.binance.us",
                wsBase: "wss://stream.binance.us:9443/ws"
            },
        }
2.  run ts-node poc/test_binance_bar_history.ts
3.  watch market data flow with translated 'bars'
4.  ctrl-c to stop stream
*/

import { BinanceMarketData } from '../src/collectors/providers/binance/market-data'

const binance = new BinanceMarketData({id: 'binance_live', providerType: 'MarketData', name: 'binance'}, 'LIVE')
binance.getHistoricalBarData({symbols: ['ADAUSDT', 'DOGEUSDT'], timeframe: '1h', limit: 25, afterDate: new Date('2021-01-01') }).then(x => console.log(x))
