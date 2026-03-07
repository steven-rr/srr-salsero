const config = require('./config');
const client = require('./client');
const { loadCommands } = require('./commands');
const { loadEvents } = require('./events');

loadCommands(client);
loadEvents(client);

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error.message);
});

client.login(config.token);
