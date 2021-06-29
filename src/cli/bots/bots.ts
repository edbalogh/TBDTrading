import { Argv } from 'yargs'

export function startExampleBot(yargs: Argv) {
    const options = yargs
        .options('bot', {
            describe: 'bot',
            alias: 'b',
            type: 'string'
        })
        .argv  

    const botDetails = require(`./bot-details/${options.bot}`)
    const Bot = require(`../../../src/strategies/examples/${botDetails.strategyOptions.class}`)
    const bot = new Bot(botDetails, botDetails.symbols[0])

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing bot");
        process.exit();
    });  

    bot.startup()
}