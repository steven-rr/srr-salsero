const { EmbedBuilder } = require('discord.js');

const COLORS = {
  music: 0x1db954,
  error: 0xe74c3c,
  info: 0x3498db,
  warning: 0xf39c12,
};

function createEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || COLORS.music)
    .setTimestamp();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.fields) embed.addFields(options.fields);
  if (options.footer) embed.setFooter({ text: options.footer });

  return embed;
}

module.exports = { createEmbed, COLORS };
