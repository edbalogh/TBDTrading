export default {
    environment: 'development',

    apiServer: {
        port: 8080
    },

    webServer: {
        port: 3000,
    },

    mongo: {
        uri: 'MONGO_CONNECTION_STRING_GOES_HERE',
        defaultDatabase: 'tbd'
    },

    providers: [
        {
            name: "Binance",
            id: "binance",
            scriptLocations: [
                {
                    type: 'MarketData',
                    location: '../../connectors/providers/binance/binance-market-data'
                },
                {
                    type: 'Broker',
                    location: '../../connectors/providers/binance/binance-broker'
                }
            ],
            supportedModes: ['LIVE', 'BACKTEST'],
            apiOptions: {
                apiKey: "API_KEY_GOES_HERE",
                apiSecret: "API_SECRET_GOES_HERE",
                httpBase: "https://api.binance.us",
                wsBase: "wss://stream.binance.us:9443/ws"
            },
            webSocketOptions: [
                {
                    type: 'MarketData',
                    mode: 'LIVE',
                    port: 3010,
                    url: 'http://localhost'
                },
                {
                    type: 'Broker',
                    mode: 'LIVE',
                    port: 3011,
                    url: 'http://localhost'
                }
            ],
            kinesisOptions: {}
        },
        {
            name: "Alpaca Live",
            id: "alpaca_live",
            scriptLocations: [
                {
                    type: 'MarketData',
                    location: '../../connectors/providers/alpaca/alpaca-market-data'
                },
                {
                    type: 'Broker',
                    location: '../../connectors/providers/alpaca/alpaca-broker'
                }
            ],
            supportedModes: ["LIVE"],
            apiOptions: {
                keyId: "API_KEY_GOES_HERE",
                secretKey: "API_SECRET_GOES_HERE",
                paper: false,
                usePolygon: false
            },
            webSocketOptions: [
                {
                    type: 'MarketData',
                    mode: 'LIVE',
                    port: 3020,
                    url: 'http://localhost'
                },
                {
                    type: 'Broker',
                    mode: 'LIVE',
                    port: 3021,
                    url: 'http://localhost'
                }
            ]
        },
        {
            name: "Alpaca Paper",
            id: "alpaca_paper",
            scriptLocations: [
                {
                    type: 'MarketData',
                    location: '../../connectors/providers/alpaca/alpaca-market-data'
                },
                {
                    type: 'Broker',
                    location: '../../connectors/providers/alpaca/alpaca-broker'
                }
            ],
            supportedModes: ["PAPER", "BACKTEST"],
            apiOptions: {
                keyId: "API_KEY_GOES_HERE",
                secretKey: "API_SECRET_GOES_HERE",
                paper: true,
                usePolygon: false
            },
            webSocketOptions: [
                {
                    type: 'MarketData',
                    mode: 'LIVE',
                    port: 3022,
                    url: 'http://localhost'
                },
                {
                    type: 'Broker',
                    mode: 'LIVE',
                    port: 3023,
                    url: 'http://localhost'
                }
            ]
        },
    ]
};