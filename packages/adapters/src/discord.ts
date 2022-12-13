import {
  type GatewayVoiceServerUpdateDispatchData,
  type GatewayVoiceStateUpdateDispatchData,
  type InternalDiscordGatewayAdapterCreator,
  type InternalDiscordGatewayAdapterLibraryMethods,
  type Snowflake,
  type Client,
  type Guild,
  type VoiceBasedChannel,
  GatewayDispatchEvents,
  Status,
  Events,
} from "discord.js";
import {
  type DiscordGatewayAdapterLibraryMethods,
  type DiscordGatewayAdapterImplementerMethods,
} from "@discordjs/voice";

const adapters = new Map<
  Snowflake,
  InternalDiscordGatewayAdapterLibraryMethods
>();
const trackedClients = new Set<Client>();
const trackedShards = new Map<number, Set<Snowflake>>();

function trackClient(client: Client) {
  if (trackedClients.has(client)) return;
  trackedClients.add(client);
  client.ws.on(
    GatewayDispatchEvents.VoiceServerUpdate,
    (payload: GatewayVoiceServerUpdateDispatchData) => {
      adapters.get(payload.guild_id)?.onVoiceServerUpdate(payload);
    }
  );
  client.ws.on(
    GatewayDispatchEvents.VoiceStateUpdate,
    (payload: GatewayVoiceStateUpdateDispatchData) => {
      if (
        payload.guild_id &&
        payload.session_id &&
        payload.user_id === client.user?.id
      ) {
        adapters.get(payload.guild_id)?.onVoiceStateUpdate(payload);
      }
    }
  );
  client.on(Events.ShardDisconnect, (_, shardId) => {
    const guilds = trackedShards.get(shardId);
    if (guilds) {
      for (const guildID of guilds.values()) {
        adapters.get(guildID)?.destroy();
      }
    }
    trackedShards.delete(shardId);
  });
}

function trackGuild(guild: Guild) {
  let guilds = trackedShards.get(guild.shardId);
  if (!guilds) {
    guilds = new Set();
    trackedShards.set(guild.shardId, guilds);
  }
  guilds.add(guild.id);
}

export function createDiscordJSAdapter(channel: VoiceBasedChannel) {
  return (
    methods: DiscordGatewayAdapterLibraryMethods
  ): DiscordGatewayAdapterImplementerMethods => {
    adapters.set(channel.guild.id, methods);
    trackClient(channel.client);
    trackGuild(channel.guild);

    return {
      sendPayload(payload) {
        if (channel.guild.shard.status === Status.Ready) {
          channel.guild.shard.send(payload);
          return true;
        }
        return false;
      },
      destroy() {
        return adapters.delete(channel.guild.id);
      },
    };
  };
}
