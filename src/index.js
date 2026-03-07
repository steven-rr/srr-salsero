const config = require('./config');
const client = require('./client');
const { loadCommands } = require('./commands');
const { loadEvents } = require('./events');

loadCommands(client);
loadEvents(client);

client.login(config.token);
