import { Mode, Currency } from './basic'
import { SubscriptionType } from './websocket'

export type ProviderType = 'Broker' | 'MarketData' | 'Other'
export type ConnectionStatus = 'PENDING' | 'DISCONNECTED' | 'CONNECTED' | 'RECONNECTING' | 'ERROR' | 'ACTIVE'

export interface StatusEntry {
    time: Date,
    status: ConnectionStatus,
    details?: string
}

/**
 * Provider represents an instance of a Provider service and is created when Provider services
 * are started
 */
export interface ProviderService {
    providerId: string,
    instanceId?: string,
    providerType?: ProviderType,
    status?: ConnectionStatus,
    mode?: Mode,
    startTime?: Date,
    statusLog?: StatusEntry[],
    endTime?: Date,
    subscriptions?: MarketDataSubscriptionRequest[] | BrokerSubscriptionRequest[]
}

/**
 * Connection represents the instance of a connection (or subscription) to a provider service
 */
export interface Connection {
    instanceId: string,
    providerId: string,
    providerInstanceId: string,
    providerType: ProviderType,
    status: ConnectionStatus,
    startTime: Date
    lastMessageTime?: Date
    statusLog?: StatusEntry[]
    endTime?: Date
}

/**
 * ProviderOptions includes user specific connection details pulled from the config.ts for each 
 * provider supported.  This includes api connection information as well as configuration settings
 * for starting/subscribing to streamed services
 */
export interface ProviderScript {
    type: ProviderType,
    location: string
}
export interface ProviderOptions {
    id: string
    name: string,
    supportedModes: Mode[],
    scriptLocations: ProviderScript[],
    apiOptions: any,
    webSocketOptions?: WebSocketOptions[],
    kinesisOptions?: KinesisOptions[]
}

export interface WebSocketOptions {
    type: ProviderType,
    mode: Mode,
    port: number,
    url?: string
}

export interface KinesisOptions {
    type: ProviderType
}

export function getProviderSocketOptionsByType(options: ProviderOptions, type: ProviderType, mode: Mode): any {
    return options.webSocketOptions?.find(x => x.type === type && x.mode === mode)
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

export interface MarketDataSubscriptionRequest {
    type: SubscriptionType,
    options: LiveBarOptions | LiveTradeOptions | LiveOrderBookOptions
}

export interface OrderSubscriptionOptions { symbols: string[] }

export interface BrokerSubscriptionRequest {
    type: SubscriptionType,
    options: OrderSubscriptionOptions
}

