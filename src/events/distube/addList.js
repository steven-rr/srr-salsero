const { createEmbed } = require('../../utils/embed');

module.exports = {
  name: 'addList',
  execute(queue, playlist) {
    const embed = createEmbed({
      title: 'Added Playlist',
      description: `**${playlist.name}**`,
      thumbnail: playlist.thumbnail,
      fields: [
        { name: 'Songs', value: `${playlist.songs.length}`, inline: true },
        { name: 'Requested by', value: `${playlist.user}`, inline: true },
      ],
    });

    queue.textChannel?.send({ embeds: [embed] });
  },
};
