/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
import chai, { expect } from 'chai';
import promised from 'chai-as-promised';
chai.use(promised);
import {
	DiscordAPIError,
	ContextMenuCommandBuilder as DiscordContextMenuCommandBuilder,
	SlashCommandBuilder as DiscordSlashCommandBuilder,
} from 'discord.js';

import {
	ContextMenuCommandBuilder,
	SlashCommandBuilder,
	SlashCommandRegistry,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from '..';

import { MockCommandInteraction, mockAgent } from './mock';


describe(SlashCommandRegistry.name, function() {
describe(new SlashCommandRegistry().addCommand.name, function() {
	let registry: SlashCommandRegistry;

	beforeEach(function() {
		registry = new SlashCommandRegistry();
	});

	it('Add builder instance', function() {
		const builder = new SlashCommandBuilder();
		expect(() => registry.addCommand(builder)).to.not.throw();
		expect(registry.commands).to.include(builder);
	});

	it('value must be a builder', function() {
		// @ts-expect-error Testing underlying JS safeties
		expect(() => registry.addCommand('thing')).to.throw(
			Error, 'input did not resolve to a SlashCommandBuilder. Got thing'
		);
	});

	it('value must be OUR builder', function() {
		const builder = new DiscordSlashCommandBuilder();
		// @ts-expect-error Testing underlying JS safeties
		expect(() => registry.addCommand(builder)).to.throw(
			Error,
			'Use SlashCommandBuilder from discord-command-registry, not discord.js'
		);
	});

	it('Function returns builder', function() {
		expect(registry.commands).to.be.empty;
		expect(() => registry.addCommand(builder => builder)).to.not.throw();
		expect(registry.commands).to.have.lengthOf(1);
	});

	it('Function must return a builder', function() {
		// @ts-expect-error Testing underlying JS safeties
		expect(() => registry.addCommand(builder => 'thing')).to.throw(
			Error, 'input did not resolve to a SlashCommandBuilder. Got thing'
		);
	});
});

describe(new SlashCommandRegistry().addContextMenuCommand.name, function() {
	let registry: SlashCommandRegistry;

	beforeEach(function() {
		registry = new SlashCommandRegistry();
	});

	it('Add builder instance', function() {
		const builder = new ContextMenuCommandBuilder();
		expect(() => registry.addContextMenuCommand(builder)).to.not.throw();
		expect(registry.commands).to.include(builder);
	});

	it('value must be a builder', function() {
		// @ts-expect-error Testing underlying JS safeties
		expect(() => registry.addContextMenuCommand('thing')).to.throw(
			Error, 'input did not resolve to a ContextMenuCommandBuilder. Got thing'
		);
	});

	it('value must be OUR builder', function() {
		const builder = new DiscordContextMenuCommandBuilder();
		// @ts-expect-error Testing underlying JS safeties
		expect(() => registry.addContextMenuCommand(builder)).to.throw(
			Error,
			'Use ContextMenuCommandBuilder from discord-command-registry, not discord.js'
		);
	});

	it('Function returns builder', function() {
		expect(registry.commands).to.be.empty;
		expect(
			() => registry.addContextMenuCommand(builder => builder)
		).to.not.throw();
		expect(registry.commands).to.have.lengthOf(1);
	});

	it('Function must return a builder', function() {
		expect(
			// @ts-expect-error Testing underlying JS safeties
			() => registry.addContextMenuCommand(builder => 'thing')
		).to.throw(
			Error, 'input did not resolve to a ContextMenuCommandBuilder. Got thing'
		)
	});
});

describe(new SlashCommandRegistry().toJSON.name, function() {
	let expected: unknown[];
	let registry: SlashCommandRegistry;

	before(function() {
		registry = new SlashCommandRegistry()
			.addCommand(builder => builder
				.setName('test1')
				.setNameLocalizations({
					'en-US': 'test1',
					'ru': 'тест1',
				})
				.setDescription('test description 1')
				.setDescriptionLocalizations({
					'en-US': 'test description 1',
					'ru': 'Описание теста 1',
				})
			)
			.addCommand(builder => builder
				.setName('test2')
				.setDescription('test description 2')
			)
			.addCommand(builder => builder
				.setName('test3')
				.setDescription('test description 3')
			);

		expected = [
			{
				name: 'test1',
				name_localizations: {
					'en-US': 'test1',
					'ru': 'тест1',
				},
				description: 'test description 1',
				description_localizations: {
					'en-US': 'test description 1',
					'ru': 'Описание теста 1',
				},
				options: [],
				nsfw: undefined,
				default_permission: undefined,
				default_member_permissions: undefined,
				dm_permission: undefined,
			},
			{
				name: 'test2',
				description: 'test description 2',
				options: [],
				default_permission: undefined,
				default_member_permissions: undefined,
				description_localizations: undefined,
				dm_permission: undefined,
				name_localizations: undefined,
				nsfw: undefined,
			},
			{
				name: 'test3',
				description: 'test description 3',
				options: [],
				default_permission: undefined,
				default_member_permissions: undefined,
				description_localizations: undefined,
				dm_permission: undefined,
				name_localizations: undefined,
				nsfw: undefined,
			},
		];
	});

	it('Serialize all', function() {
		expect(registry.toJSON()).to.deep.equal(expected);
	});

	it('Serialize subset', function() {
		expect(registry.toJSON(['test1', 'test3']))
			.to.deep.equal([ expected[0], expected[2] ]);
	});
});

describe(new SlashCommandRegistry().registerCommands.name, function() {
	interface CapturedMockData {
		body?: unknown | null
		headers?: Record<string, string> | null;
		path?: string | null;
	}

	const app_id = 'test_app_id';
	const token = 'test_token';

	let captured: CapturedMockData;
	let registry: SlashCommandRegistry;

	/** Sets up a mock for one request. */
	function makeMockApiWithCode(code: number): void {
		mockAgent.get('https://discord.com')
			.intercept({
				method: 'PUT',
				path: (path: string) => {
					captured.path = path;
					return true;
				},
				headers: (headers: Record<string, string>) => {
					captured.headers = headers;
					return true;
				},
				body: (body: string) => {
					captured.body = JSON.parse(body);
					return true;
				},
			})
			.reply(code, 'Mocked Discord response');
	}

	beforeEach(function() {
		captured = {};
		registry = new SlashCommandRegistry()
			.setApplicationId(app_id)
			.setGuildId(null)
			.setToken(token);
	});

	it('Uses set application ID and token', async function() {
		makeMockApiWithCode(200);
		await registry.registerCommands();
		expect(captured.path)
			.to.equal(`/api/v10/applications/${app_id}/commands`);
		expect(captured.headers?.authorization)
			.to.equal(`Bot ${token}`);
	});

	it('Providing guild registers as guild commands', async function() {
		const guild = 'test_guild_id';
		makeMockApiWithCode(200);
		await registry.setGuildId(guild).registerCommands();
		expect(captured.path).to.equal(
			`/api/v10/applications/${app_id}/guilds/${guild}/commands`
		);
	});

	it('Uses application ID override', async function() {
		const new_app_id = 'override';
		makeMockApiWithCode(200);
		await registry.registerCommands({ application_id: new_app_id });
		expect(captured.path)
			.to.equal(`/api/v10/applications/${new_app_id}/commands`);
	});

	it('Uses token override and resets after', async function() {
		const newtoken = 'override';
		makeMockApiWithCode(200);
		await registry.registerCommands({ token: newtoken });
		expect(captured.headers?.authorization).to.equal(`Bot ${newtoken}`);

		// Token is reset
		makeMockApiWithCode(200);
		await registry.registerCommands();
		expect(captured.headers?.authorization).to.equal(`Bot ${token}`);
	});

	it('Uses guild ID override', async function() {
		const newGuild = 'override';
		makeMockApiWithCode(200);
		await registry
			.setGuildId('original_guild')
			.registerCommands({ guild: newGuild });

		expect(captured.path).to.equal(
			`/api/v10/applications/${app_id}/guilds/${newGuild}/commands`
		);
	});

	it('Providing command name array registers a subset', async function() {
		registry
			.addCommand(builder => builder.setName('test1').setDescription('test desc 1'))
			.addCommand(builder => builder.setName('test2').setDescription('test desc 2'));

		makeMockApiWithCode(200);
		await registry.registerCommands({ commands: ['test1'] });
		expect(captured.body).to.deep.equal(
			[{ name: 'test1', description: 'test desc 1', options: [] }]
		);
	});

	it('Handles errors from the Discord API', async function() {
		makeMockApiWithCode(400);
		return expect(registry.registerCommands())
			.to.be.rejectedWith(DiscordAPIError, 'No Description');
	});
});

describe(new SlashCommandRegistry().execute.name, function() {
	let interaction: MockCommandInteraction;
	let registry: SlashCommandRegistry;

	beforeEach(function() {
		registry = new SlashCommandRegistry()
			.addCommand(command => command
				.setName('cmd1')
				.setDescription('Command with direct subcommands')
				.setHandler(() => {})
				.addSubcommand(sub => sub
					.setName('subcmd1')
					.setDescription('Direct subcommand 1')
				)
				.addSubcommand(sub => sub
					.setName('subcmd2')
					.setDescription('Direct subcommand 2')
				)
			)
			.addCommand(command => command
				.setName('cmd2')
				.setDescription('Command with subcommand group')
				.addSubcommandGroup(group => group
					.setName('group1')
					.setDescription('Subcommand group 1')
					.addSubcommand(sub => sub
						.setName('subcmd1')
						.setDescription('subcommand in group 1')
					)
					.addSubcommand(sub => sub
						.setName('subcmd2')
						.setDescription('subcommand in group 2')
					)
				)
			)
			.addCommand(command => command
				.setName('cmd3')
				.setDescription('Top-level command only')
			)
			.addCommand(command => command
				.setName('cmd4')
				.setDescription('top-level command with options')
				.addBooleanOption(option => option
					.setName('opt')
					.setDescription('test option')
				)
			);

		interaction = new MockCommandInteraction({
			name: 'cmd2',
			command_group: 'group1',
			subcommand: 'subcmd1',
		});
	});

	it('Error for setDefaultHandler() non-function values', function() {
		// @ts-expect-error Testing underlying JS safeties
		expect(() => registry.setDefaultHandler({})).to.throw(
			Error, "handler was 'object', expected 'function'"
		);
	});

	it('Handler priority 5: no-op if no handler set anywhere', function() {
		expect(registry.execute(interaction)).to.be.undefined;
	});

	it('Handler priority 4: default handler', function() {
		const expected = 'Should see this';
		registry.setDefaultHandler(() => expected);
		expect(registry.execute(interaction)).to.equal(expected);
	});

	it('Handler priority 3: top-level command handler', function() {
		const expected = 'Should see this';
		registry.setDefaultHandler(() => 'default handler called');
		registry.commands[1].setHandler(() => expected);
		expect(registry.execute(interaction)).to.equal(expected);
	});

	it('Handler priority 3: top-level command handler (only command)', function() {
		const expected = 'Should see this';
		registry.setDefaultHandler(() => 'default handler called');
		registry.commands[2].setHandler(() => expected);

		expect(registry.execute(new MockCommandInteraction({
			name: 'cmd3',
		}))).to.equal(expected);
	});

	it('Handler priority 2: subcommand group handler', function() {
		const expected = 'Should see this';
		const cmd1 = registry.commands[1] as SlashCommandBuilder;
		const grp0 = cmd1.options[0] as SlashCommandSubcommandGroupBuilder;

		registry.setDefaultHandler(() => 'default handler called');
		cmd1.setHandler(() => 'top-level handler');
		grp0.setHandler(() => expected);

		expect(registry.execute(interaction)).to.equal(expected);
	});

	it('Handler priority 1: subcommand handler', function() {
		const expected = 'Should see this';
		const cmd1 = registry.commands[1] as SlashCommandBuilder;
		const grp0 = cmd1.options[0] as SlashCommandSubcommandGroupBuilder;
		const sub0 = grp0.options[0] as SlashCommandSubcommandBuilder;

		registry.setDefaultHandler(() => 'default handler called');
		cmd1.setHandler(() => 'top-level handler');
		grp0.setHandler(() => 'group handler');
		sub0.setHandler(() => expected);

		expect(registry.execute(interaction)).to.equal(expected);
	});

	it('Handler priority 1: subcommand handler (direct subcommand)', function() {
		const expected = 'Should see this';
		const cmd0 = registry.commands[0] as SlashCommandBuilder;
		const sub0 = cmd0.options[0] as SlashCommandSubcommandBuilder;

		registry.setDefaultHandler(() => 'default handler called');
		cmd0.setHandler(() => 'top-level handler');
		sub0.setHandler(() => expected);

		expect(registry.execute(new MockCommandInteraction({
			name: 'cmd1',
			subcommand: 'subcmd1',
		}))).to.equal(expected);
	});

	it('Error on non-interaction value', function() {
		// @ts-expect-error Testing underlying JS safeties
		expect(() => registry.execute({})).to.throw(
			Error, 'given value was not a Discord.js command'
		)
	});

	it('No-op on non-CommandInteraction value', function() {
		registry.setDefaultHandler(() => 'default handler called');
		expect(registry.execute(new MockCommandInteraction({
			name: 'test',
			is_command: false,
		}))).to.be.undefined;
	});

	it('Error on missing command', function() {
		expect(() => registry.execute(new MockCommandInteraction({
			name: 'bad',
		}))).to.throw(Error, [
			"No known command matches the following (mismatch starts at 'command')",
			"	command:    bad",
			"	group:      <none>",
			"	subcommand: <none>",
		].join('\n'));
	});

	it('Error on missing group', function() {
		expect(() => registry.execute(new MockCommandInteraction({
			name: 'cmd1',
			command_group: 'bad',
		}))).to.throw(Error, [
			"No known command matches the following (mismatch starts at 'group')",
			"	command:    cmd1",
			"	group:      bad",
			"	subcommand: <none>",
		].join('\n'));
	});

	it('Error on missing subcommand', function() {
		expect(() => registry.execute(new MockCommandInteraction({
			name: 'cmd2',
			command_group: 'group1',
			subcommand: 'bad',
		}))).to.throw(Error, [
			"No known command matches the following (mismatch starts at 'subcommand')",
			"	command:    cmd2",
			"	group:      group1",
			"	subcommand: bad",
		].join('\n'));
	});

	it('Gracefully handles error thrown in handler', function() {
		const expected = 'I was thrown from the handler';
		registry.setDefaultHandler(() => { throw new Error(expected) });

		expect(() => registry.execute(interaction)).to.throw(Error, expected);
	});
});

});
