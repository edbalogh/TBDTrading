import { Depth } from 'binance-api-node'

export const LIVE_ORDERBOOK: Depth = {
    eventType: 'depthUpdate',
    eventTime: 1622301796490,
    symbol: 'DOGEUSDT',
    firstUpdateId: 141706993,
    finalUpdateId: 141707029,
    bidDepth: [
        { price: '0.28390740', quantity: '301.00000000' },
        { price: '0.28385940', quantity: '7040.00000000' },
        { price: '0.28381150', quantity: '17599.00000000' },
        { price: '0.28380000', quantity: '3620.00000000' },
        { price: '0.28379140', quantity: '0.00000000' },
        { price: '0.28373470', quantity: '0.00000000' },
        { price: '0.28369760', quantity: '28157.00000000' }
    ],
    askDepth: [
        { price: '0.28394260', quantity: '0.00000000' },
        { price: '0.28399120', quantity: '0.00000000' },
        { price: '0.28400260', quantity: '358.00000000' },
        { price: '0.28403410', quantity: '0.00000000' },
        { price: '0.28407520', quantity: '0.00000000' },
        { price: '0.28410000', quantity: '3620.00000000' },
        { price: '0.28615390', quantity: '1066.00000000' }
    ]
}


export function buildLiveOrderBook(overrides?: Partial<Depth>): Depth {
    return { ...<any>LIVE_ORDERBOOK, ...<any>overrides } as Depth
}