const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    if (!queue.paused) {
      return interaction.reply({ content: 'The music is not paused.', ephemeral: true });
    }

    interaction.client.distube.resume(interaction.guildId);
    await interaction.reply({ content: 'Resumed the music.' });
  },
};
