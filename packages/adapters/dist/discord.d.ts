import { type VoiceBasedChannel } from "discord.js";
import { type DiscordGatewayAdapterLibraryMethods, type DiscordGatewayAdapterImplementerMethods } from "@discordjs/voice";
export declare function createDiscordJSAdapter(channel: VoiceBasedChannel): (methods: DiscordGatewayAdapterLibraryMethods) => DiscordGatewayAdapterImplementerMethods;
