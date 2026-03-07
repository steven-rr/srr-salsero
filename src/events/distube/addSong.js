const { createEmbed } = require('../../utils/embed');

module.exports = {
  name: 'addSong',
  execute(queue, song) {
    const embed = createEmbed({
      title: 'Added to Queue',
      description: `[${song.name}](${song.url})`,
      thumbnail: song.thumbnail,
      fields: [
        { name: 'Duration', value: song.formattedDuration, inline: true },
        { name: 'Position', value: `${queue.songs.length - 1}`, inline: true },
        { name: 'Requested by', value: `${song.user}`, inline: true },
      ],
    });

    queue.textChannel?.send({ embeds: [embed] });
  },
};
