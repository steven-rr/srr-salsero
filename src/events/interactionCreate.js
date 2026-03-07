const { RepeatMode } = require('distube');

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
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(reply);
        } else {
          await interaction.reply(reply);
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

          default:
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
