const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { formatDuration } = require('../../utils/formatDuration');
const { progressBar } = require('../../utils/progressBar');

// Store the interval per guild so we can clear it when the song changes
const progressIntervals = new Map();

function clearProgressInterval(guildId) {
  const existing = progressIntervals.get(guildId);
  if (existing) {
    clearInterval(existing);
    progressIntervals.delete(guildId);
  }
}

function buildNowPlayingEmbed(queue, song) {
  const current = queue.currentTime;
  const total = song.duration;
  const bar = progressBar(current, total, 20);

  return createEmbed({
    title: 'Now Playing',
    description: `[${song.name}](${song.url})\n\n\`${formatDuration(current)}\` ${bar} \`${formatDuration(total)}\``,
    thumbnail: song.thumbnail,
    fields: [
      { name: 'Requested by', value: `${song.user}`, inline: true },
      { name: 'Volume', value: `${queue.volume}%`, inline: true },
    ],
  });
}

function buildControlRows() {
  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_pause_resume')
      .setLabel('Pause')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏸'),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('Skip')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⏭'),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⏹'),
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setLabel('Loop')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔁'),
    new ButtonBuilder()
      .setCustomId('music_shuffle')
      .setLabel('Shuffle')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔀')
  );

  const seekRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('seek_restart')
      .setLabel('Restart')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏮'),
    new ButtonBuilder()
      .setCustomId('seek_back_30')
      .setLabel('-30s')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏪'),
    new ButtonBuilder()
      .setCustomId('seek_back_10')
      .setLabel('-10s')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️'),
    new ButtonBuilder()
      .setCustomId('seek_forward_10')
      .setLabel('+10s')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('▶️'),
    new ButtonBuilder()
      .setCustomId('seek_forward_30')
      .setLabel('+30s')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏩'),
  );

  return [controlRow, seekRow];
}

module.exports = {
  name: 'playSong',
  async execute(queue, song) {
    // Clear any previous progress interval for this guild
    clearProgressInterval(queue.id);

    const embed = buildNowPlayingEmbed(queue, song);
    const components = buildControlRows();
    const message = await queue.textChannel?.send({ embeds: [embed], components });

    if (!message) return;

    // Update the progress bar every 5 seconds
    const interval = setInterval(async () => {
      try {
        const currentQueue = queue.distube.getQueue(queue.id);
        if (!currentQueue || currentQueue.songs[0]?.id !== song.id) {
          clearProgressInterval(queue.id);
          return;
        }
        if (currentQueue.paused) return;
        const updatedEmbed = buildNowPlayingEmbed(currentQueue, currentQueue.songs[0]);
        await message.edit({ embeds: [updatedEmbed], components });
      } catch {
        clearProgressInterval(queue.id);
      }
    }, 5000);

    progressIntervals.set(queue.id, interval);
  },
  buildNowPlayingEmbed,
  buildControlRows,
  clearProgressInterval,
};
