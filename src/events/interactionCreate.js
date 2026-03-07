const { RepeatMode } = require('distube');
const { formatDuration } = require('../utils/formatDuration');

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

    // Handle button interactions
    if (interaction.isButton()) {
      const distube = interaction.client.distube;
      const queue = distube.getQueue(interaction.guildId);

      if (!queue) {
        return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
      }

      try {
        switch (interaction.customId) {
          case 'music_pause_resume':
            if (queue.paused) {
              distube.resume(interaction.guildId);
              await interaction.reply({ content: 'Resumed the music.' });
            } else {
              distube.pause(interaction.guildId);
              await interaction.reply({ content: 'Paused the music.' });
            }
            break;

          case 'music_skip':
            if (queue.songs.length <= 1 && queue.autoplay === false) {
              await distube.stop(interaction.guildId);
              await interaction.reply({ content: 'Skipped. No more songs in the queue.' });
            } else {
              await distube.skip(interaction.guildId);
              await interaction.reply({ content: 'Skipped to the next song.' });
            }
            break;

          case 'music_stop':
            await distube.stop(interaction.guildId);
            await interaction.reply({ content: 'Stopped the music and cleared the queue.' });
            break;

          case 'music_loop':
            const nextMode = (queue.repeatMode + 1) % 3;
            distube.setRepeatMode(interaction.guildId, nextMode);
            const modeNames = ['Off', 'Song', 'Queue'];
            await interaction.reply({ content: `Loop mode: **${modeNames[nextMode]}**` });
            break;

          case 'music_shuffle':
            await distube.shuffle(interaction.guildId);
            await interaction.reply({ content: 'Shuffled the queue.' });
            break;

          case 'seek_restart':
          case 'seek_back_10':
          case 'seek_back_30':
          case 'seek_forward_10':
          case 'seek_forward_30': {
            const { buildNowPlayingEmbed, buildControlRows } = require('../events/distube/playSong');
            let newTime;
            if (interaction.customId === 'seek_restart') {
              newTime = 0;
            } else {
              const currentTime = queue.currentTime;
              const delta = interaction.customId === 'seek_back_10' ? -10
                : interaction.customId === 'seek_back_30' ? -30
                : interaction.customId === 'seek_forward_10' ? 10 : 30;
              newTime = Math.max(0, Math.min(currentTime + delta, queue.songs[0].duration - 1));
            }
            await distube.seek(interaction.guildId, newTime);
            // Small delay so queue.currentTime reflects the new position
            await new Promise(r => setTimeout(r, 200));
            const embed = buildNowPlayingEmbed(queue, queue.songs[0]);
            const components = buildControlRows();
            await interaction.update({ embeds: [embed], components });
            break;
          }

          default:
            // Queue pagination buttons
            if (interaction.customId.startsWith('queue_prev_') || interaction.customId.startsWith('queue_next_')) {
              const currentPage = parseInt(interaction.customId.split('_')[2], 10);
              const newPage = interaction.customId.startsWith('queue_prev_') ? currentPage - 1 : currentPage + 1;
              const { buildQueueEmbed, buildQueueButtons, SONGS_PER_PAGE } = require('../commands/queue');
              const totalPages = Math.max(1, Math.ceil((queue.songs.length - 1) / SONGS_PER_PAGE));
              const embed = buildQueueEmbed(queue, newPage);
              const components = totalPages > 1 ? [buildQueueButtons(newPage, totalPages)] : [];
              await interaction.update({ embeds: [embed], components });
            }
            break;
        }
      } catch (error) {
        console.error('Button interaction error:', error);
        if (!interaction.replied) {
          await interaction.reply({ content: 'Something went wrong.', ephemeral: true });
        }
      }
    }
  },
};
