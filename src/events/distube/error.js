const { createEmbed, COLORS } = require('../../utils/embed');

module.exports = {
  name: 'error',
  execute(error, queue, song) {
    console.error('DisTube error:', error);

    const embed = createEmbed({
      title: 'Playback Error',
      description: `Something went wrong: ${error.message}`,
      color: COLORS.error,
    });

    queue.textChannel?.send({ embeds: [embed] });
  },
};
