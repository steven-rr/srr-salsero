const { RepeatMode } = require('distube');
const { formatDuration } = require('../utils/formatDuration');
const { buildQueueViewEmbed, buildQueueViewComponents, buildAddSongModal } = require('../utils/queueView');

function updateQueueView(interaction, queue, page, selectedPos) {
  const embed = buildQueueViewEmbed(queue, page, selectedPos);
  const components = buildQueueViewComponents(queue, page, selectedPos);
  return interaction.update({ embeds: [embed], components });
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const reply = { content: 'Something went wrong running that command.', ephemeral: true };
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(reply);
          } else {
            await interaction.reply(reply);
          }
        } catch (e) {
          console.error('Failed to send error reply:', e.message);
        }
      }
      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      const distube = interaction.client.distube;

      if (interaction.customId === 'qview_add_modal') {
        const query = interaction.fields.getTextInputValue('qview_add_input');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
          return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });
        }

        await interaction.deferReply();
        try {
          await distube.play(voiceChannel, query, {
            member: interaction.member,
            textChannel: interaction.channel,
          });
          await interaction.deleteReply().catch(() => {});
        } catch (error) {
          await interaction.editReply({ content: `Could not add: ${error.message}` });
        }
        return;
      }

      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const distube = interaction.client.distube;
      const queue = distube.getQueue(interaction.guildId);
      const id = interaction.customId;

      if (!queue) {
        return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
      }

      try {
        // Music control buttons
        switch (id) {
          case 'music_pause_resume':
            if (queue.paused) {
              distube.resume(interaction.guildId);
              await interaction.reply({ content: 'Resumed the music.' });
            } else {
              distube.pause(interaction.guildId);
              await interaction.reply({ content: 'Paused the music.' });
            }
            return;

          case 'music_skip':
            if (queue.songs.length <= 1 && queue.autoplay === false) {
              await distube.stop(interaction.guildId);
              await interaction.reply({ content: 'Skipped. No more songs in the queue.' });
            } else {
              await distube.skip(interaction.guildId);
              await interaction.reply({ content: 'Skipped to the next song.' });
            }
            return;

          case 'music_stop':
            await distube.stop(interaction.guildId);
            await interaction.reply({ content: 'Stopped the music and cleared the queue.' });
            return;

          case 'music_loop': {
            const nextMode = (queue.repeatMode + 1) % 3;
            distube.setRepeatMode(interaction.guildId, nextMode);
            const modeNames = ['Off', 'Song', 'Queue'];
            await interaction.reply({ content: `Loop mode: **${modeNames[nextMode]}**` });
            return;
          }

          case 'music_shuffle':
            await distube.shuffle(interaction.guildId);
            await interaction.reply({ content: 'Shuffled the queue.' });
            return;

          case 'music_previous': {
            const { getHistory } = require('../events/distube/playSong');
            const history = getHistory(interaction.guildId);
            if (history.length === 0) {
              await interaction.reply({ content: 'No previous songs to play.', ephemeral: true });
              return;
            }
            const prevSong = history[0];
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
              await interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });
              return;
            }
            await interaction.deferReply();
            try {
              // Insert previous song at position 1 (next up) then skip to it
              await distube.play(voiceChannel, prevSong.url, {
                member: interaction.member,
                textChannel: interaction.channel,
                position: 1,
              });
              await distube.skip(interaction.guildId);
              await interaction.deleteReply().catch(() => {});
            } catch (error) {
              await interaction.editReply({ content: `Could not play previous: ${error.message}` });
            }
            return;
          }

          case 'music_queue': {
            const embed = buildQueueViewEmbed(queue, 1, null);
            const components = buildQueueViewComponents(queue, 1, null);
            await interaction.reply({ embeds: [embed], components, ephemeral: false });
            return;
          }
        }

        // Seek buttons
        if (id === 'seek_restart' || id.startsWith('seek_back_') || id.startsWith('seek_forward_')) {
          const { buildNowPlayingEmbed, buildControlRows } = require('../events/distube/playSong');
          let newTime;
          if (id === 'seek_restart') {
            newTime = 0;
          } else {
            const currentTime = queue.currentTime;
            const delta = id === 'seek_back_10' ? -10
              : id === 'seek_back_30' ? -30
              : id === 'seek_forward_10' ? 10 : 30;
            newTime = Math.max(0, Math.min(currentTime + delta, queue.songs[0].duration - 1));
          }
          await distube.seek(interaction.guildId, newTime);
          await new Promise(r => setTimeout(r, 200));
          const embed = buildNowPlayingEmbed(queue, queue.songs[0]);
          const components = buildControlRows();
          await interaction.update({ embeds: [embed], components });
          return;
        }

        // Queue view buttons
        if (id.startsWith('qview_')) {
          await handleQueueViewButton(interaction, queue, distube);
          return;
        }

        // Legacy queue pagination buttons
        if (id.startsWith('queue_prev_') || id.startsWith('queue_next_')) {
          const currentPage = parseInt(id.split('_')[2], 10);
          const newPage = id.startsWith('queue_prev_') ? currentPage - 1 : currentPage + 1;
          const { buildQueueEmbed, buildQueueButtons, SONGS_PER_PAGE } = require('../commands/queue');
          const totalPages = Math.max(1, Math.ceil((queue.songs.length - 1) / SONGS_PER_PAGE));
          const embed = buildQueueEmbed(queue, newPage);
          const components = totalPages > 1 ? [buildQueueButtons(newPage, totalPages)] : [];
          await interaction.update({ embeds: [embed], components });
          return;
        }

      } catch (error) {
        console.error('Button interaction error:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
        }
      }
    }
  },
};

async function handleQueueViewButton(interaction, queue, distube) {
  const id = interaction.customId;
  const parts = id.split('_');

  // qview_close
  if (id === 'qview_close') {
    await interaction.message.delete().catch(() => {});
    return;
  }

  // qview_add - show modal
  if (id === 'qview_add') {
    await interaction.showModal(buildAddSongModal());
    return;
  }

  // qview_shuffle
  if (id === 'qview_shuffle') {
    await distube.shuffle(interaction.guildId);
    return updateQueueView(interaction, queue, 1, null);
  }

  // qview_pick_POS_PAGE - select a song
  if (id.startsWith('qview_pick_')) {
    const pos = parseInt(parts[2], 10);
    const page = parseInt(parts[3], 10);
    return updateQueueView(interaction, queue, page, pos);
  }

  // qview_move_FROM_TO_PAGE - move song to position
  if (id.startsWith('qview_move_')) {
    const fromPos = parseInt(parts[2], 10);
    const toPos = parseInt(parts[3], 10);
    const page = parseInt(parts[4], 10);
    if (fromPos !== toPos && fromPos > 0 && fromPos < queue.songs.length) {
      const [song] = queue.songs.splice(fromPos, 1);
      queue.songs.splice(toPos, 0, song);
    }
    return updateQueueView(interaction, queue, page, null);
  }

  // qview_cancel_PAGE - cancel selection
  if (id.startsWith('qview_cancel_')) {
    const page = parseInt(parts[2], 10);
    return updateQueueView(interaction, queue, page, null);
  }

  // qview_first_N / qview_last_N - jump to first/last page
  if (id.startsWith('qview_first_') || id.startsWith('qview_last_')) {
    const maxPos = queue.songs.length - 1;
    const totalPages = Math.max(1, Math.ceil(maxPos / 10));
    const newPage = id.startsWith('qview_first_') ? 1 : totalPages;
    return updateQueueView(interaction, queue, newPage, null);
  }

  // qview_prev_N / qview_next_N
  if (id.startsWith('qview_prev_') || id.startsWith('qview_next_')) {
    const currentPage = parseInt(parts[2], 10);
    const newPage = id.startsWith('qview_prev_') ? currentPage - 1 : currentPage + 1;
    return updateQueueView(interaction, queue, newPage, null);
  }

  // qview_mfirst_POS_PAGE / qview_mlast_POS_PAGE - jump to first/last in moving mode
  if (id.startsWith('qview_mfirst_') || id.startsWith('qview_mlast_')) {
    const selectedPos = parseInt(parts[2], 10);
    const maxPos = queue.songs.length - 1;
    const totalPages = Math.max(1, Math.ceil(maxPos / 10));
    const newPage = id.startsWith('qview_mfirst_') ? 1 : totalPages;
    return updateQueueView(interaction, queue, newPage, selectedPos);
  }

  // qview_mprev_POS_PAGE / qview_mnext_POS_PAGE - page nav while in moving mode
  if (id.startsWith('qview_mprev_') || id.startsWith('qview_mnext_')) {
    const selectedPos = parseInt(parts[2], 10);
    const currentPage = parseInt(parts[3], 10);
    const newPage = id.startsWith('qview_mprev_') ? currentPage - 1 : currentPage + 1;
    return updateQueueView(interaction, queue, newPage, selectedPos);
  }

  // qview_top_POS_PAGE - "Play Next" button
  if (id.startsWith('qview_top_')) {
    const pos = parseInt(parts[2], 10);
    const page = parseInt(parts[3], 10);
    if (pos > 0 && pos < queue.songs.length) {
      const [song] = queue.songs.splice(pos, 1);
      queue.songs.splice(1, 0, song);
    }
    return updateQueueView(interaction, queue, page, 1);
  }

  // qview_remove_POS_PAGE
  if (id.startsWith('qview_remove_')) {
    const pos = parseInt(parts[2], 10);
    const page = parseInt(parts[3], 10);
    if (pos > 0 && pos < queue.songs.length) {
      queue.songs.splice(pos, 1);
    }
    return updateQueueView(interaction, queue, page, null);
  }
}
