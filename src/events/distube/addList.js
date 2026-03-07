const { createEmbed, COLORS } = require('../../utils/embed');

function isMixPlaylist(playlist) {
  const url = playlist.url || '';
  const id = (playlist.id || '').toString();
  return id.startsWith('RD') || /[?&]list=RD/.test(url) || /start_radio=1/.test(url);
}

module.exports = {
  name: 'addList',
  execute(queue, playlist) {
    const embed = createEmbed({
      title: 'Added Playlist',
      description: `**${playlist.name}**`,
      thumbnail: playlist.thumbnail,
      fields: [
        { name: 'Songs', value: `${playlist.songs.length}`, inline: true },
        { name: 'Requested by', value: `${playlist.user}`, inline: true },
      ],
    });

    const messages = [{ embeds: [embed] }];

    if (isMixPlaylist(playlist)) {
      const mixWarning = createEmbed({
        title: 'Heads Up — YouTube Mix',
        description:
          'YouTube Mixes are personalized to your account, so the songs queued here may differ from what you see on YouTube.\n\n' +
          'For exact results, convert your mix to a shareable playlist with [this Chrome extension](https://chromewebstore.google.com/detail/youtube-mix-to-shareable/obkpamjhiffmpgafaioanapphpllppmo), then share the playlist link instead.',
        color: COLORS.warning,
      });
      messages.push({ embeds: [mixWarning] });
    }

    for (const msg of messages) {
      queue.textChannel?.send(msg);
    }
  },
};
