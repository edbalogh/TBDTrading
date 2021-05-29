export type ProviderType = 'Broker' | 'MarketData' | 'Other'
export type BotMode = 'LIVE' | 'PAPER' | 'BACKTEST'

export interface ProviderOptions {
    id: string
    name: string,
    modes: BotMode[],
    providerTypes: ProviderType[],
    apiOptions: Map<string, any>
    webSocketOptions?: WebSocketOptions,
    kinesisOptions?: KinesisOptions
}

export interface WebSocketOptions {
    port: number
    url?: string
}

export interface KinesisOptions {

}


