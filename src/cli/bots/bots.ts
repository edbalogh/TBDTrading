import { Argv } from 'yargs'

export function startBot(yargs: Argv, folder: string) {
    const options = yargs
        .options('bot', {
            describe: 'bot',
            alias: 'b',
            type: 'string'
        })
        .argv

    const botDetails = require(`./bot-details/${options.bot}`)
    const Bot = require(`../../../src/strategies/${folder}/${botDetails.strategyOptions.class}`)
    let bots = []
    botDetails.symbols.reduce( async (promise: Promise<void>, symbol: string) => {
        await promise
        console.log(`starting symbol ${symbol}`)
        const bot = new Bot(botDetails, symbol)
        bot.startup()
        bots.push(bot)
        // make sure we don't spam the api
        await new Promise(resolve => setTimeout(resolve, 5000))
    }, Promise.resolve())
    
    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing bot");
        process.exit();
    });
}