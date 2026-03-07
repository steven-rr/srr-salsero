const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { formatDuration } = require('../../utils/formatDuration');
const { progressBar } = require('../../utils/progressBar');
const { flushErrorsForGuild } = require('./error');

// Store the interval per guild so we can clear it when the song changes
const progressIntervals = new Map();

// Store the current Now Playing message per guild so we can delete stale ones
const nowPlayingMessages = new Map();

// Store song history per guild (last 3 songs)
const songHistory = new Map();

function addToHistory(guildId, song) {
  const history = songHistory.get(guildId) || [];
  // Don't add duplicates if the same song is at the top
  if (history.length > 0 && history[0].url === song.url) return;
  history.unshift({ name: song.name, url: song.url, user: song.user });
  if (history.length > 3) history.pop();
  songHistory.set(guildId, history);
}

function getHistory(guildId) {
  return songHistory.get(guildId) || [];
}

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

  const fields = [
    { name: 'Requested by', value: `${song.user}`, inline: true },
    { name: 'Volume', value: `${queue.volume}%`, inline: true },
  ];

  if (queue.songs.length > 1) {
    const next = queue.songs[1];
    const nextName = next.name.length > 50 ? next.name.slice(0, 47) + '...' : next.name;
    fields.push({ name: 'Up Next', value: `${nextName} \`${next.formattedDuration}\``, inline: false });
  }

  return createEmbed({
    title: 'Now Playing',
    description: `[${song.name}](${song.url})\n\n\`${formatDuration(current)}\` ${bar} \`${formatDuration(total)}\``,
    thumbnail: song.thumbnail,
    fields,
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
      .setCustomId('music_queue')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Success)
      .setEmoji('📋')
  );

  const seekRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_previous')
      .setLabel('Previous')
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

    // Save the previous song to history (if there was one playing before)
    if (queue._previousSong) {
      addToHistory(queue.id, queue._previousSong);
    }
    queue._previousSong = song;
    queue._songStartedAt = Date.now();

    const voiceStatus = queue.voice?.connection?.state?.status || 'unknown';
    const playerStatus = queue.voice?.audioPlayer?.state?.status || 'unknown';
    console.log(`[playSong] "${song.name}" | duration=${song.duration} | thumbnail=${song.thumbnail ? 'yes' : 'no'} | source=${song.source} | voice=${voiceStatus} | player=${playerStatus}`);

    // Delete the previous Now Playing message to avoid stale embeds after error skips
    const prevMessage = nowPlayingMessages.get(queue.id);
    if (prevMessage) {
      prevMessage.delete().catch(() => {});
      nowPlayingMessages.delete(queue.id);
    }

    // Check if this song is still the current one (race condition: another playSong may have fired)
    if (queue._previousSong !== song) return;

    // Flush any pending error messages so they appear above the Now Playing embed
    flushErrorsForGuild(queue.id, queue.textChannel);

    const embed = buildNowPlayingEmbed(queue, song);
    const components = buildControlRows();
    const message = await queue.textChannel?.send({ embeds: [embed], components });

    if (!message) return;

    // After the async send, check again if we're still the current song
    if (queue._previousSong !== song) {
      message.delete().catch(() => {});
      return;
    }

    nowPlayingMessages.set(queue.id, message);

    // Update the progress bar every 5 seconds
    const interval = setInterval(async () => {
      try {
        const currentQueue = queue.distube.getQueue(queue.id);
        if (!currentQueue || !currentQueue.songs.length || currentQueue._previousSong !== song) {
          clearProgressInterval(queue.id);
          return;
        }
        if (currentQueue.paused) return;
        const updatedEmbed = buildNowPlayingEmbed(currentQueue, song);
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
  getHistory,
};
