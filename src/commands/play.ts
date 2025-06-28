import fs from 'fs';
import ytdl from 'ytdl-core';
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

    const cookiePath = process.env.YTDL_COOKIE || '/cookies/cookies.txt';
    let cookie = '';
    if (fs.existsSync(cookiePath)) {
      cookie = fs.readFileSync(cookiePath, 'utf8');
    }

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
    const query = interaction.options.getString('query', true);

    const cookiePath = process.env.YTDL_COOKIE || '/cookies/cookies.txt';
    let cookie = '';
    if (fs.existsSync(cookiePath)) {
      cookie = fs.readFileSync(cookiePath, 'utf8');
    }

    const videoUrl = query; // Replace this with however you're generating the actual URL

    const stream = ytdl(videoUrl, {
      requestOptions: {
        headers: {
          cookie,
        },
      },
    });

    // Your logic to play the stream...
  }

  public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    // existing autocomplete logic
  }
}
