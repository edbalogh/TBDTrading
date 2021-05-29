export default {
    environment: 'development',

    apiServer: {
        port: 8080
    },

    webServer: {
        port: 3000,
    },

    mongo: {
        uri: "MONGO_CONNECTION_STRING_GOES_HERE"
    },

    providers: [
        {
            name: "Binance",
            id: "binance",
            providerTypes: ["MarketData", "Broker"],
            modes: ["LIVE", "BACKTEST"],
            apiOptions: {
                apiKey: "API_KEY_GOES_HERE",
                apiSecret: "API_SECRET_GOES_HERE",
                httpBase: "https://api.binance.us",
                wsBase: "wss://stream.binance.us:9443/ws"
            },
            webSocketOptions: {
                port: 3000
            },
            kinesisOptions: {}
        },
        {
            name: "Alpaca Live",
            id: "alpaca_live",
            providerTypes: ["MarketData", "Broker"],
            modes: ["LIVE"],
            apiOptions: {
                keyId: "API_KEY_GOES_HERE",
                secretKey: "API_SECRET_GOES_HERE",
                paper: false,
                usePolygon: false
            },
            webSocket: {
                port: 3002
            }
        },
        {
            name: "Alpaca Paper",
            id: "alpaca_paper",
            providerTypes: ["MarketData", "Broker"],
            modes: ["PAPER", "BACKTEST"],
            apiOptions: {
                keyId: "API_KEY_GOES_HERE",
                secretKey: "API_SECRET_GOES_HERE",
                paper: true,
                usePolygon: false
            },
            webSocketOptions: {
                port: 3003
            }
        },
    ]
};