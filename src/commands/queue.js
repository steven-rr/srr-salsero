const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../utils/embed');
const { formatDuration } = require('../utils/formatDuration');

const SONGS_PER_PAGE = 10;

function buildQueueEmbed(queue, page) {
  const current = queue.songs[0];
  const totalPages = Math.max(1, Math.ceil((queue.songs.length - 1) / SONGS_PER_PAGE));
  const clampedPage = Math.min(page, totalPages);

  let description = `**Now Playing:**\n[${current.name}](${current.url}) \`${current.formattedDuration}\` - ${current.user}\n`;

  const start = (clampedPage - 1) * SONGS_PER_PAGE + 1;
  const end = Math.min(start + SONGS_PER_PAGE, queue.songs.length);
  const upcoming = queue.songs.slice(start, end);

  if (upcoming.length > 0) {
    description += '\n**Up Next:**\n';
    description += upcoming
      .map((song, i) => `\`${start + i}.\` [${song.name}](${song.url}) \`${song.formattedDuration}\` - ${song.user}`)
      .join('\n');
  } else if (queue.songs.length === 1) {
    description += '\nNo upcoming songs.';
  }

  const totalDuration = queue.songs.reduce((acc, song) => acc + song.duration, 0);

  return createEmbed({
    title: 'Music Queue',
    description,
    footer: `Page ${clampedPage}/${totalPages} | ${queue.songs.length} songs | Total: ${formatDuration(totalDuration)}`,
  });
}

function buildQueueButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`queue_prev_${page}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`queue_next_${page}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue')
    .addIntegerOption((opt) =>
      opt.setName('page').setDescription('Page number').setMinValue(1)
    ),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const page = interaction.options.getInteger('page') || 1;
    const totalPages = Math.max(1, Math.ceil((queue.songs.length - 1) / SONGS_PER_PAGE));
    const embed = buildQueueEmbed(queue, page);
    const components = totalPages > 1 ? [buildQueueButtons(page, totalPages)] : [];

    await interaction.reply({ embeds: [embed], components });
  },

  // Exported for use in interactionCreate button handler
  SONGS_PER_PAGE,
  buildQueueEmbed,
  buildQueueButtons,
};
