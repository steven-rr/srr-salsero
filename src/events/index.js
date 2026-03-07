const fs = require('fs');
const path = require('path');

function loadEvents(client) {
  const eventsPath = __dirname;
  const eventFiles = fs.readdirSync(eventsPath).filter(
    (file) => file.endsWith('.js') && file !== 'index.js'
  );

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.name && event.execute) {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
    }
  }

  // Load DisTube events
  const distubePath = path.join(eventsPath, 'distube');
  if (fs.existsSync(distubePath)) {
    const distubeFiles = fs.readdirSync(distubePath).filter(
      (file) => file.endsWith('.js')
    );

    for (const file of distubeFiles) {
      const event = require(path.join(distubePath, file));
      if (event.name && event.execute) {
        client.distube.on(event.name, (...args) => event.execute(...args));
      }
    }
  }

  console.log('Events loaded');
}

module.exports = { loadEvents };
