const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    if (queue.paused) {
      return interaction.reply({ content: 'The music is already paused.', ephemeral: true });
    }

    interaction.client.distube.pause(interaction.guildId);
    await interaction.reply({ content: 'Paused the music.' });
  },
};
