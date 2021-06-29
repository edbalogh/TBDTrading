// Binance to Common Market Order OrderEvents
const marketNewOrder = {
  symbol: 'ADAUSDT',
  orderId: '',
  brokerOrderId: 126089929,
  executionType: 'NEW',
  executionTime: '2021-06-28T00:33:07.935Z',
  orderStatus: 'OPEN',
  orderSide: 'BUY',
  orderType: 'MARKET',
  orderTime: '2021-06-28T00:33:07.935Z',
  tif: 'GTC',
  rejectReason: 'NONE',
  executionQuantity: 74.7,
  totalQuantity: 0,
  executionPrice: 0,
  commission: 0,
  commissionAsset: '',
  tradeId: -1
}

const marketFullExecution = {
  symbol: 'ADAUSDT',
  orderId: '',
  brokerOrderId: 126089929,
  executionType: 'TRADE',
  executionTime: '2021-06-28T00:33:07.935Z',
  orderStatus: 'FILLED',
  orderSide: 'BUY',
  orderType: 'MARKET',
  orderTime: '2021-06-28T00:33:07.935Z',
  tif: 'GTC',
  rejectReason: 'NONE',
  executionQuantity: 74.7,
  totalQuantity: 99.937395,
  executionPrice: 0,
  commission: 0.0747,
  commissionAsset: 'ADA',
  tradeId: 2753563
}

const postMarketBalance = {
  balances:
    [{ asset: 'USDT', free: '179.74905309', locked: '0.00000000' },
    { asset: 'ADA', free: '3426.89580000', locked: '0.00000000' },
    { asset: 'BNB', free: '0.00002946', locked: '0.00000000' }],
  eventTime: 1624840387936,
  eventType: 'outboundAccountPosition',
  lastAccountUpdate: 1624840387935
}