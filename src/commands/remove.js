const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a song from the queue')
    .addIntegerOption((opt) =>
      opt
        .setName('position')
        .setDescription('Position in the queue to remove (1 = next song)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const position = interaction.options.getInteger('position');
    if (position >= queue.songs.length) {
      return interaction.reply({
        content: `Invalid position. The queue only has ${queue.songs.length - 1} upcoming songs.`,
        ephemeral: true,
      });
    }

    const removed = queue.songs.splice(position, 1)[0];
    await interaction.reply({ content: `Removed **${removed.name}** from the queue.` });
  },
};
