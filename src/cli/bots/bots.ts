import { Argv } from 'yargs'

export function startExampleBot(yargs: Argv) {
    const options = yargs
        .options('bot', {
            describe: 'bot',
            alias: 'b',
            type: 'string'
        })
        .argv

    const Bot = require('../../../src/strategies/examples/${bot}')
    const bot = new Bot()
}