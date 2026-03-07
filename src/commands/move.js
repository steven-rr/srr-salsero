const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move a song to a different position in the queue')
    .addIntegerOption((opt) =>
      opt
        .setName('from')
        .setDescription('Current position of the song (1 = next song)')
        .setRequired(true)
        .setMinValue(1)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('to')
        .setDescription('New position (1 = play next)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const from = interaction.options.getInteger('from');
    const to = interaction.options.getInteger('to');
    const maxPos = queue.songs.length - 1;

    if (from > maxPos) {
      return interaction.reply({ content: `Invalid position. The queue only has ${maxPos} upcoming songs.`, ephemeral: true });
    }
    if (to > maxPos) {
      return interaction.reply({ content: `Invalid position. The queue only has ${maxPos} upcoming songs.`, ephemeral: true });
    }
    if (from === to) {
      return interaction.reply({ content: 'The song is already at that position.', ephemeral: true });
    }

    const [song] = queue.songs.splice(from, 1);
    queue.songs.splice(to, 0, song);
    await interaction.reply({ content: `Moved **${song.name}** from position ${from} to ${to}.` });
  },
};
