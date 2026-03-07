const config = require('./config');
const client = require('./client');
const { loadCommands } = require('./commands');
const { loadEvents } = require('./events');

loadCommands(client);
loadEvents(client);

client.on('error', (error) => {
  console.error('Client error:', error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error.message);
});

client.login(config.token);
