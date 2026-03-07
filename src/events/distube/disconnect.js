module.exports = {
  name: 'disconnect',
  execute(queue) {
    queue.textChannel?.send('Disconnected from voice channel.');
  },
};
