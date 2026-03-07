const { createEmbed, COLORS } = require('../../utils/embed');

// Batch consecutive errors so we don't spam the channel
const errorBatch = new Map(); // guildId -> { songs: [], timer: null }

function flushErrors(guildId, textChannel) {
  const batch = errorBatch.get(guildId);
  if (!batch || batch.songs.length === 0) return;
  errorBatch.delete(guildId);

  let description;
  if (batch.songs.length === 1) {
    description = `Could not stream **${batch.songs[0]}** — skipped.`;
  } else {
    const list = batch.songs.map(s => `• ${s}`).join('\n');
    description = `Skipped ${batch.songs.length} songs (not available on YouTube):\n${list}`;
  }

  const embed = createEmbed({
    title: 'Playback Error',
    description,
    color: COLORS.error,
  });
  textChannel?.send({ embeds: [embed] });
}

function flushErrorsForGuild(guildId, textChannel) {
  flushErrors(guildId, textChannel);
}

module.exports = {
  name: 'error',
  flushErrorsForGuild,
  execute(error, queue, song) {
    console.error('DisTube error:', error.errorCode, error.message, '| song:', song?.name || 'none');

    // Silence SoundCloud fallback errors — just noise from the plugin chain
    if (error.errorCode === 'SOUNDCLOUD_PLUGIN_RATE_LIMITED') return;
    if (error.errorCode === 'SOUNDCLOUD_PLUGIN_NO_RESULT') return;

    const songName = song?.name || queue?.songs?.[0]?.name;

    // Batch ffmpeg/stream errors to avoid spamming when multiple songs fail in a row
    if ((error.errorCode === 'FFMPEG_EXITED' || error.errorCode === 'NO_RESULT') && songName) {
      let batch = errorBatch.get(queue.id);
      if (!batch) {
        batch = { songs: [], timer: null, textChannel: queue.textChannel };
        errorBatch.set(queue.id, batch);
      }
      batch.songs.push(songName);

      // Reset the timer — flush after 3s of no new errors (means the next song played successfully)
      if (batch.timer) clearTimeout(batch.timer);
      batch.timer = setTimeout(() => flushErrors(queue.id, batch.textChannel), 3000);
      return;
    }

    const embed = createEmbed({
      title: 'Playback Error',
      description: `Something went wrong: ${error.message}`,
      color: COLORS.error,
    });

    queue.textChannel?.send({ embeds: [embed] });
  },
};
