const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the queue'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    if (queue.songs.length <= 2) {
      return interaction.reply({ content: 'Not enough songs in the queue to shuffle.', ephemeral: true });
    }

    await interaction.client.distube.shuffle(interaction.guildId);
    await interaction.reply({ content: 'Shuffled the queue.' });
  },
};
