import {
  type VoiceBasedChannel,
  Client,
  GatewayIntentBits,
  Routes,
  REST,
} from "discord.js";
import {
  createAudioResource,
  createAudioPlayer,
  StreamType,
  entersState,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} from "@discordjs/voice";

import { createDiscordJSAdapter } from "adapters";

const player = createAudioPlayer();

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

function play() {
  const resource = createAudioResource(process.env.DISCORD_GOSPEL_STREAM_URI, {
    inputType: StreamType.Arbitrary,
  });

  player.play(resource);

  return entersState(player, AudioPlayerStatus.Playing, 5000);
}

async function connectToChannel(channel: VoiceBasedChannel) {
  const channelId = process.env.DISCORD_GOSPEL_CHANNEL_ID;

  const connection = joinVoiceChannel({
    channelId: channelId ? channelId : channel.id,
    guildId: channel.guildId,
    adapterCreator: createDiscordJSAdapter(channel),
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

async function bootstrap() {
  const commands = [
    {
      name: "join",
      description: "Starts 24/7 radio on selected channel!",
    },
  ];

  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_GOSPEL_TOKEN
  );

  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_GOSPEL_APP_ID),
      {
        body: commands,
      }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }

  client.on("ready", async () => {
    console.log(`Logged in as ${client?.user?.tag}!`);

    try {
      await play();
    } catch (error) {
      console.log(error);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const channel = interaction.channel;
    if (!channel) {
      interaction.reply("Join a voice channel then try again!");
      return;
    }

    if (channel.type !== 2) {
      interaction.reply("Join a voice channel then try again!");
      return;
    }

    if (interaction.commandName !== "join") {
      return;
    }

    try {
      const connection = await connectToChannel(channel);

      connection.subscribe(player);
      await interaction.reply("Playing now!");
    } catch (error) {
      console.log("error", error);
    }
  });

  await client.login(process.env.DISCORD_GOSPEL_TOKEN);
}

bootstrap();
