const { createEmbed, COLORS } = require('../../utils/embed');
const { clearProgressInterval } = require('./playSong');
const { startIdleTimer } = require('../../utils/idleTimer');

module.exports = {
  name: 'finish',
  execute(queue) {
    clearProgressInterval(queue.id);
    const embed = createEmbed({
      title: 'Queue Finished',
      description: 'No more songs to play. Leaving in 5 minutes if idle.',
      color: COLORS.info,
    });

    queue.textChannel?.send({ embeds: [embed] });

    startIdleTimer(queue.id, () => {
      const currentQueue = queue.distube.getQueue(queue.id);
      if (!currentQueue || !currentQueue.songs.length) {
        queue.distube.voices.leave(queue.id);
        queue.textChannel?.send({ embeds: [createEmbed({
          title: 'Idle Timeout',
          description: 'Left the voice channel after 5 minutes of inactivity.',
          color: COLORS.info,
        })] });
      }
    });
  },
};
