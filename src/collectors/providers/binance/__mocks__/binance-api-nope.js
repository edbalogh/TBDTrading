const candleResponse = [{
    openTime: 1610370000000,
    open: '0.00884090',
    high: '0.00894050',
    low: '0.00822910',
    close: '0.00834660',
    volume: '1815853.00000000',
    closeTime: 1610373599999,
    quoteVolume: '15451.92061440',
    trades: 79,
    baseAssetVolume: '1264362.00000000',
    quoteAssetVolume: '10832.66332090'
}]



// const binance = jest.genMockFromModule('binance-api-node')
const binance = jest.fn().mockReturnValue((options) => {
    return {
        candles: (options) => {
            console.log('made it to mock.candles()')
            return Promise.resolve(candleResponse)
        }
    }
})

module.exports = binance
