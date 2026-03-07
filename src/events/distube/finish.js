const { createEmbed, COLORS } = require('../../utils/embed');
const { clearProgressInterval } = require('./playSong');

module.exports = {
  name: 'finish',
  execute(queue) {
    clearProgressInterval(queue.id);
    const embed = createEmbed({
      title: 'Queue Finished',
      description: 'No more songs to play. Use `/play` to add more!',
      color: COLORS.info,
    });

    queue.textChannel?.send({ embeds: [embed] });
  },
};
