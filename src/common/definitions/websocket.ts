export type MarketDataRequestType = 'addBarSubscriptions' | 'addTradeSubscriptions' | 'addBookSubscriptions'

export type BrokerRequestType = 'addOrderSubscriptions' | 'addAccountSubscription' | 'addBalanceSubscription'

export interface OrderSubscriptionOptions { symbols: string[] }

export type SubscriptionType = 'BAR' | 'BOOK' | 'TRADE' | 'EXECUTION' | 'ACCOUNT' | 'BALANCE'