import fs from 'fs';
import youtubedl from 'youtube-dl-exec';
import { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import { URL } from 'url';
import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from '@discordjs/builders';
import { inject, injectable, optional } from 'inversify';
import Spotify from 'spotify-web-api-node';
import Command from './index.js';
import { TYPES } from '../types.js';
import ThirdParty from '../services/third-party.js';
import getYouTubeAndSpotifySuggestionsFor from '../utils/get-youtube-and-spotify-suggestions-for.js';
import KeyValueCacheProvider from '../services/key-value-cache.js';
import { ONE_HOUR_IN_SECONDS } from '../utils/constants.js';
import AddQueryToQueue from '../services/add-query-to-queue.js';

@injectable()
export default class implements Command {
  public readonly slashCommand: Partial<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder> & Pick<SlashCommandBuilder, 'toJSON'>;

  public requiresVC = true;

  private readonly spotify?: Spotify;
  private readonly cache: KeyValueCacheProvider;
  private readonly addQueryToQueue: AddQueryToQueue;

  constructor(
    @inject(TYPES.ThirdParty) @optional() thirdParty: ThirdParty,
    @inject(TYPES.KeyValueCache) cache: KeyValueCacheProvider,
    @inject(TYPES.Services.AddQueryToQueue) addQueryToQueue: AddQueryToQueue
  ) {
    this.spotify = thirdParty?.spotify;
    this.cache = cache;
    this.addQueryToQueue = addQueryToQueue;

    const queryDescription = thirdParty === undefined
      ? 'YouTube URL or search query'
      : 'YouTube URL, Spotify URL, or search query';

    this.slashCommand = new SlashCommandBuilder()
      .setName('play')
      .setDescription('play a song')
      .addStringOption(option =>
        option
          .setName('query')
          .setDescription(queryDescription)
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const query = interaction.options.getString('query', true);
    const cookiePath = process.env.YTDL_COOKIE || '/usr/app/youtube.com_cookies.txt';
    const isURL = query.startsWith('http://') || query.startsWith('https://');
    const target = isURL ? query : `ytsearch:${query}`;

    try {
      const info = await youtubedl(target, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        cookies: cookiePath,
      }) as any;

      
let url: string | null = null;

function extractAudioUrl(formats: any[]): string | null {
  if (!Array.isArray(formats)) return null;
  for (const fmt of formats) {
    if (fmt?.acodec !== 'none' && fmt?.vcodec === 'none' && fmt?.url) {
      return fmt.url;
    }
  }
  return null;
}

if (info.url) {
  url = info.url;
} else if (Array.isArray(info.entries) && info.entries[0]) {
  url = extractAudioUrl(info.entries[0].formats) || info.entries[0].url || null;
} else {
  url = extractAudioUrl(info.formats);
}


      console.log(`🎵 Title: ${info.title}`);
      console.log(`🔗 URL: ${url}`);

      if (!url) {
        await interaction.editReply({ content: '🚫 ope: No playable URL found.' });
        return;
      }

      await interaction.editReply({ content: `🎵 Title: ${info.title}
🔗 URL: ${url}` });

      // queue and play logic would go here
    } catch (err) {
      console.error("💥 yt-dlp failed:", err);
      const message = err instanceof Error ? err.message : String(err);

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: `🚫 ope: ${message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `🚫 ope: ${message}`, ephemeral: true });
      }
    }
  }

  public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    // your autocomplete logic here
  }
}
