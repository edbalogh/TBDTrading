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

    providers: {
        binance: {
            apiKey: "API_KEY_GOES_HERE",
            apiSecret: "API_SECRET_GOES_HERE",
            httpBase: "https://api.binance.us",
            wsBase: "wss://stream.binance.us:9443/ws"
        },
        alpaca: {},
        kucoin: {}
    },
};