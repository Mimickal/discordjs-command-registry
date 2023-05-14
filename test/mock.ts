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
	InteractionType,
} from 'discord.js';
import { MockAgent, setGlobalDispatcher } from 'undici'; // From discord.js

// discord.js uses undici for HTTP requests, so we piggyback off of that
// transitive dependency to mock those requests in testing.
const mockAgent = new MockAgent();
mockAgent.disableNetConnect();
setGlobalDispatcher(mockAgent);

export { mockAgent };

/**
 * A crappy mock interaction for testing that satisfies an instanceof check
 * without any of the actual safety checks.
 */
export class MockCommandInteraction extends ChatInputCommandInteraction {
	private is_command: boolean;

	constructor(args: {
		name: string;
		is_command?: boolean;
		command_group?: string;
		subcommand?: string;
		opt?: {
			name: string;
			value: string;
		};
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
			user: {
				id: 'fake_user_id',
				username: 'fake_test_user',
				discriminator: '1234',
				avatar: null,
			},
		});

		this.is_command = args.is_command ?? true;
		this.commandName = args.name;

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

	isChatInputCommand(): boolean {
		return this.is_command;
	}
}
