const { clearProgressInterval } = require('./playSong');

module.exports = {
  name: 'disconnect',
  execute(queue) {
    clearProgressInterval(queue.id);
    queue.textChannel?.send('Disconnected from voice channel.');
  },
};
