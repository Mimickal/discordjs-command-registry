/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	CommandInteractionOption,
	CommandInteractionOptionResolver,
	Guild,
	GuildDefaultMessageNotifications,
	GuildExplicitContentFilter,
	GuildHubType,
	GuildMFALevel,
	GuildMember,
	GuildMemberFlags,
	GuildNSFWLevel,
	GuildPremiumTier,
	GuildSystemChannelFlags,
	InteractionType,
	PermissionsBitField,
} from 'discord.js';
import { RawGuildData } from 'discord.js/typings/rawDataTypes';
import { MockAgent, setGlobalDispatcher } from 'undici'; // From discord.js

// discord.js uses undici for HTTP requests, so we piggyback off of that
// transitive dependency to mock those requests in testing.
const mockAgent = new MockAgent();
mockAgent.disableNetConnect();
setGlobalDispatcher(mockAgent);

export { mockAgent };

const GUILD_ID = 'test_guild_id';

/**
 * A crappy mock interaction for testing that satisfies an instanceof check
 * without any of the actual safety checks.
 */
export class MockCommandInteraction extends ChatInputCommandInteraction<'cached'> {
	private is_command: boolean;
	private is_in_guild: boolean;

	constructor(args: {
		name: string;
		is_command?: boolean;
		command_group?: string;
		subcommand?: string;
		opt?: {
			name: string;
			value: string;
		};
		member?: MockGuildMember;
		is_in_guild?: boolean;
	}) {
		const client = new Client({ intents: [] });

		// This is like 90% fake garbage to satisfy TypeScript
		// and 10% fake garbage to avoid undefined read errors.
		super(client, {
			id: 'fake_int_id',
			application_id: 'fake_test_id',
			type: InteractionType.ApplicationCommand,
			token: 'fake_token',
			locale: 'en-US',
			version: 1,
			channel_id: 'fake_channel_id',
			app_permissions: '0',
			channel: {
				id: 'fake_channel_id',
				type: ChannelType.DM,
			},
			data: {
				id: 'fake_data_id',
				name: 'fake_data_name',
				type: ApplicationCommandType.ChatInput,
			},
			guild_id: GUILD_ID,
			user: {
				id: 'fake_user_id',
				username: 'fake_test_user',
				discriminator: '1234',
				avatar: null,
				global_name: null,
			},
		});

		this.is_command = args.is_command ?? true;
		this.is_in_guild = args.is_in_guild ?? true;
		this.commandName = args.name;
		if (args.member) this.member = args.member;

		// Pull this up to get some type safety where we can.
		const opts: CommandInteractionOption[] = args.opt ? [{
			name: args.opt.name,
			type: ApplicationCommandOptionType.String,
			value: args.opt.value,
		}] : [];
		// @ts-ignore This constructor is private, but fu.
		this.options = new CommandInteractionOptionResolver(client, opts);
		Reflect.set(this.options, '_group', args.command_group);
		Reflect.set(this.options, '_subcommand', args.subcommand);
	}

	public inCachedGuild(): this is ChatInputCommandInteraction<'cached'> {
		return this.is_in_guild;
	}

	public isChatInputCommand(): boolean {
		return this.is_command;
	}
}

// @ts-expect-error Guild constructor is private, so extend it to expose it
// in a slightly more type-safe way.
class MockGuild extends Guild {
	constructor(client: Client<true>, data: RawGuildData) {
		super(client, data);
	}
}

// @ts-expect-error GuildMember constructor is private
export class MockGuildMember extends GuildMember {
	private _permissions: PermissionsBitField;

	constructor(args: {
		permissions?: bigint;
	}) {
		const client = new Client({ intents: [] });

		const guild = new MockGuild(client, {
			afk_channel_id: null,
			afk_timeout: 60,
			application_id: null,
			banner: null,
			default_message_notifications: GuildDefaultMessageNotifications.OnlyMentions,
			description: null,
			discovery_splash: null,
			emojis: [],
			explicit_content_filter: GuildExplicitContentFilter.AllMembers,
			features: [],
			hub_type: GuildHubType.Default,
			icon: null,
			id: GUILD_ID,
			mfa_level: GuildMFALevel.None,
			name: 'test_guild',
			nsfw_level: GuildNSFWLevel.Safe,
			owner_id: 'owner_id',
			preferred_locale: '',
			premium_progress_bar_enabled: false,
			premium_tier: GuildPremiumTier.None,
			public_updates_channel_id: null,
			roles: [],
			rules_channel_id: null,
			safety_alerts_channel_id: null,
			splash: null,
			stickers: [],
			system_channel_flags: GuildSystemChannelFlags.SuppressGuildReminderNotifications,
			system_channel_id: null,
			unavailable: false,
		});

		super(client, {
			flags: GuildMemberFlags.BypassesVerification,
			guild_id: GUILD_ID,
			joined_at: `${Date.now()}`,
			permissions: `${args.permissions ?? ''}`,
			roles: [],
		}, guild);

		this._permissions = new PermissionsBitField(args.permissions);
	}

	get permissions(): PermissionsBitField {
		return this._permissions;
	}

	public fetch(force?: boolean | undefined): Promise<GuildMember> {
		return Promise.resolve(this);
	}
}
