const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next song'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    try {
      queue._manualSkip = true;
      if (queue.songs.length <= 1) {
        await interaction.client.distube.stop(interaction.guildId);
        return interaction.reply({ content: 'Skipped. No more songs in the queue.' });
      }
      await interaction.client.distube.skip(interaction.guildId);
      await interaction.reply({ content: 'Skipped to the next song.' });
    } catch (error) {
      await interaction.reply({ content: `Could not skip: ${error.message}`, ephemeral: true });
    }
  },
};
