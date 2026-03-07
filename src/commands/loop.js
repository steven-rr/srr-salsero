const { SlashCommandBuilder } = require('discord.js');
const { RepeatMode } = require('distube');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addStringOption((opt) =>
      opt
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Song', value: 'song' },
          { name: 'Queue', value: 'queue' }
        )
    ),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const mode = interaction.options.getString('mode');
    const modeMap = {
      off: RepeatMode.DISABLED,
      song: RepeatMode.SONG,
      queue: RepeatMode.QUEUE,
    };

    interaction.client.distube.setRepeatMode(interaction.guildId, modeMap[mode]);
    await interaction.reply({ content: `Loop mode set to **${mode.charAt(0).toUpperCase() + mode.slice(1)}**` });
  },
};
