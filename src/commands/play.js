const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube, Spotify, or SoundCloud')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('A URL or search keywords')
        .setRequired(true)
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: 'You need to be in a voice channel first!',
        ephemeral: true,
      });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      await interaction.client.distube.play(voiceChannel, query, {
        member: interaction.member,
        textChannel: interaction.channel,
      });
      if (!interaction.deleted) {
        await interaction.deleteReply().catch(() => {});
      }
    } catch (error) {
      console.error('Play error:', error);
      await interaction.editReply({ content: `Could not play: ${error.message}` });
    }
  },
};
