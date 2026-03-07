const { createEmbed, COLORS } = require('../../utils/embed');

module.exports = {
  name: 'finish',
  execute(queue) {
    const embed = createEmbed({
      title: 'Queue Finished',
      description: 'No more songs to play. Use `/play` to add more!',
      color: COLORS.info,
    });

    queue.textChannel?.send({ embeds: [embed] });
  },
};
