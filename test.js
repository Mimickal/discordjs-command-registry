/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
const expect = require('chai').expect;
const nock = require('nock');
const { DiscordAPIError } = require('@discordjs/rest');
const {
	Client,
	Interaction,
} = require('discord.js');
const {
	SlashCommandRegistry,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} = require('.');

describe('Builders have setHandler() functions injected', function() {
	Array.of(
		SlashCommandBuilder,
		SlashCommandSubcommandBuilder,
		SlashCommandSubcommandGroupBuilder,
	).forEach(klass => {

		it(`${klass.name} function injected`, function() {
			const builder = new klass();
			expect(builder).to.respondTo('setHandler');

			const handler = () => {};
			builder.setHandler(handler);
			expect(builder).to.have.property('handler', handler);
		});

		it(`${klass.name} error thrown for non-functions`, function() {
			const builder = new klass();
			expect(() => { builder.setHandler('') }).to.throw(
				Error, "handler was 'string', expected 'function'"
			);
		});
	});
});

describe('SlashCommandRegistry addCommand()', function() {

	beforeEach(function() {
		this.registry = new SlashCommandRegistry();
	});

	it('Add builder instance', function() {
		const builder = new SlashCommandBuilder();
		expect(() => this.registry.addCommand(builder)).to.not.throw();
		expect(this.registry.commands).to.include(builder);
	});

	it('value must be a builder', function() {
		expect(() => this.registry.addCommand('thing')).to.throw(
			Error, 'input did not resolve to a SlashCommandBuilder. Got thing'
		);
	});

	it('Function returns builder', function() {
		expect(this.registry.commands).to.be.empty;
		expect(() => this.registry.addCommand(builder => builder)).to.not.throw();
		expect(this.registry.commands).to.have.lengthOf(1);
	});

	it('Function must return a builder', function() {
		expect(() => this.registry.addCommand(builder => 'thing')).to.throw(
			Error, 'input did not resolve to a SlashCommandBuilder. Got thing'
		);
	});
});

describe('SlashCommandRegistry toJSON()', function() {

	before(function() {
		this.registry = new SlashCommandRegistry()
			.addCommand(builder => builder
				.setName('test1')
				.setDescription('test description 1')
			)
			.addCommand(builder => builder
				.setName('test2')
				.setDescription('test description 2')
			)
			.addCommand(builder => builder
				.setName('test3')
				.setDescription('test description 3')
			);
		this.expected = [
			{
				name: 'test1',
				description: 'test description 1',
				options: [],
				default_permission: undefined,
			},
			{
				name: 'test2',
				description: 'test description 2',
				options: [],
				default_permission: undefined,
			},
			{
				name: 'test3',
				description: 'test description 3',
				options: [],
				default_permission: undefined,
			}
		];
	});

	it('Serialize all', function() {
		expect(this.registry.toJSON()).to.deep.equal(this.expected);
	});

	it('Serialize subset', function() {
		expect(this.registry.toJSON(['test1', 'test3']))
			.to.deep.equal([ this.expected[0], this.expected[2] ]);
	});
});

describe('SlashCommandRegistry registerCommands()', function() {
	let captured_request;
	let res_code = 200;
	const scope_guard = nock('https://discord.com/')
		.persist()
		.put(/.*/)
		.reply(function(uri, body) {
			captured_request = this.req;
			captured_request.body = body;
			return [res_code, 'Mocked Discord response'];
		});

	beforeEach(function() {
		this.app_id = 'test_app_id';
		this.token = 'test_token';
		this.registry = new SlashCommandRegistry()
			.setApplicationId(this.app_id).setToken(this.token);

		captured_request = null;
	});

	it('Uses set application ID and token', async function() {
		await this.registry.registerCommands();
		expect(captured_request.path)
			.to.equal(`/api/v9/applications/${this.app_id}/commands`);
		expect(captured_request.headers.authorization[0])
			.to.equal(`Bot ${this.token}`);
	});

	it('Uses application ID override', async function() {
		const new_app_id = 'override';
		await this.registry.registerCommands({ application_id: new_app_id });
		expect(captured_request.path)
			.to.equal(`/api/v9/applications/${new_app_id}/commands`);
	});

	it('Uses token override and resets after', async function() {
		const newtoken = 'override';
		await this.registry.registerCommands({ token: newtoken });
		expect(captured_request.headers.authorization[0])
			.to.equal(`Bot ${newtoken}`);

		// Token is reset
		await this.registry.registerCommands();
		expect(captured_request.headers.authorization[0])
			.to.equal(`Bot ${this.token}`);
	});

	it('Providing guild registers as guild commands', async function() {
		const guild = 'test_guild_id';
		await this.registry.registerCommands({ guild: guild });
		expect(captured_request.path).to.equal(
			`/api/v9/applications/${this.app_id}/guilds/${guild}/commands`
		);
	});

	it('Providing command name array registers a subset', async function() {
		this.registry
			.addCommand(builder => builder.setName('test1').setDescription('test desc 1'))
			.addCommand(builder => builder.setName('test2').setDescription('test desc 2'));

		await this.registry.registerCommands({ commands: ['test1'] });
		expect(captured_request.body).to.deep.equal(
			[{ name: 'test1', description: 'test desc 1', options: [] }]
		);
	});

	it('Handles errors from the Discord API', function() {
		res_code = 400;
		return this.registry.registerCommands()
			.then(() => expect.fail('Expected exception but got none'))
			.catch(err => {
				expect(err).to.be.instanceOf(DiscordAPIError);
				expect(err.message).to.equal('Unknown Error');
			});
	});
});

// A crappy mock interaction for testing that satisfies an instanceof check
// without any of the actual safety checks.
class MockCommandInteraction extends Interaction {
	constructor(args) {
		const client = new Client({ intents: [] });
		super(client, {
			type: 1,
			user: {}
		});

		this.is_command = args.is_command ?? true;
		this.commandName = args.name;
		this.options = {
			getSubcommandGroup: function(toggle) {
				if (toggle ?? true) throw Error('Bad');
				return args.group;
			},
			getSubcommand: function(toggle) {
				if (toggle ?? true) throw Error('Bad');
				return args.subcommand;
			}
		};
	}
	isCommand() {
		return this.is_command;
	}
}

describe('SlashCommandRegistry execute()', function() {

	beforeEach(function() {
		this.registry = new SlashCommandRegistry()
			.addCommand(command => command
				.setName('cmd1')
				.setDescription('Command with direct subcommands')
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
			);

		this.interaction = new MockCommandInteraction({
			name: 'cmd2',
			group: 'group1',
			subcommand: 'subcmd1',
		});
	});

	it('Error for setDefaultHandler() non-function values', function() {
		expect(() => this.registry.setDefaultHandler({})).to.throw(
			Error, "handler was 'object', expected 'function'"
		);
	});

	it('Handler priority 5: no-op if no handler set anywhere', function() {
		return this.registry.execute(this.interaction)
			.then(val => expect(val).to.be.undefined);
	});

	it('Handler priority 4: default handler', function() {
		const expected = 'Should see this';
		this.registry.setDefaultHandler(() => expected);

		return this.registry.execute(this.interaction)
			.then(val => expect(val).to.equal(expected));
	});

	it('Handler priority 3: top-level command handler', function() {
		const expected = 'Should see this';
		this.registry.setDefaultHandler(() => 'default handler called');
		this.registry.commands[1].setHandler(() => expected);

		return this.registry.execute(this.interaction)
			.then(val => expect(val).to.equal(expected));
	});

	it('Handler priority 3: top-level command handler (only command)', function() {
		const expected = 'Should see this';
		this.registry.setDefaultHandler(() => 'default handler called');
		this.registry.commands[2].setHandler(() => expected);

		return this.registry.execute(new MockCommandInteraction({
			name: 'cmd3',
		}))
			.then(val => expect(val).to.equal(expected));
	});

	it('Handler priority 2: subcommand group handler', function() {
		const expected = 'Should see this';
		this.registry.setDefaultHandler(() => 'default handler called');
		this.registry.commands[1].setHandler(() => 'top-level handler');
		this.registry.commands[1].options[0].setHandler(() => expected);

		return this.registry.execute(this.interaction)
			.then(val => expect(val).to.equal(expected));
	});

	it('Handler priority 1: subcommand handler', function() {
		const expected = 'Should see this';
		this.registry.setDefaultHandler(() => 'default handler called');
		this.registry.commands[1].setHandler(() => 'top-level handler');
		this.registry.commands[1].options[0].setHandler(() => 'group handler');
		this.registry.commands[1].options[0].options[0].setHandler(() => expected);

		return this.registry.execute(this.interaction)
			.then(val => expect(val).to.equal(expected));
	});

	it('Handler priority 1: subcommand handler (direct subcommand)', function() {
		const expected = 'Should see this';
		this.registry.setDefaultHandler(() => 'default handler called');
		this.registry.commands[0].setHandler(() => 'top-level handler');
		this.registry.commands[0].options[0].setHandler(() => expected);

		return this.registry.execute(new MockCommandInteraction({
			name: 'cmd1',
			subcommand: 'subcmd1',
		}))
			.then(val => expect(val).to.equal(expected));
	});

	it('Error on non-interaction value', function() {
		return this.registry.execute({})
			.then(() => expect.fail('Expected exception but got none'))
			.catch(err => {
				expect(err).to.be.instanceOf(Error);
				expect(err.message).to.equal('given value was not a Discord.js Interaction');
			});
	});

	it('No-op on non-CommandInteraction value', function() {
		this.registry.setDefaultHandler(() => 'default handler called');
		return this.registry.execute(new MockCommandInteraction({
			is_command: false,
		})).then(val => expect(val).to.be.undefined);
	});

	it('Error on missing command', function() {
		return this.registry.execute(new MockCommandInteraction({
			name: 'bad',
		}))
			.then(() => expect.fail('Expected exception but got none'))
			.catch(err => {
				expect(err).to.be.instanceOf(Error);
				expect(err.message).to.contain(
					"No known command matches the following (mismatch starts at 'command')\n" +
					"	command:    bad\n" +
					"	group:      <none>\n" +
					"	subcommand: <none>\n"
				);
			});
	});

	it('Error on missing group', function() {
		return this.registry.execute(new MockCommandInteraction({
			name: 'cmd1',
			group: 'bad',
		}))
			.then(() => expect.fail('Expected exception but got none'))
			.catch(err => {
				expect(err).to.be.instanceOf(Error);
				expect(err.message).to.contain(
					"No known command matches the following (mismatch starts at 'group')\n" +
					"	command:    cmd1\n" +
					"	group:      bad\n" +
					"	subcommand: <none>\n"
				);
			});
	});

	it('Error on missing subcommand', function() {
		return this.registry.execute(new MockCommandInteraction({
			name: 'cmd2',
			group: 'group1',
			subcommand: 'bad',
		}))
			.then(() => expect.fail('Expected exception but got none'))
			.catch(err => {
				expect(err).to.be.instanceOf(Error);
				expect(err.message).to.contain(
					"No known command matches the following (mismatch starts at 'subcommand')\n" +
					"	command:    cmd2\n" +
					"	group:      group1\n" +
					"	subcommand: bad\n"
				);
			});
	});

	it('Gracefully handles error thrown in handler', function() {
		const expected = 'I was thrown from the handler';
		this.registry.setDefaultHandler(() => { throw new Error(expected) });

		return this.registry.execute(this.interaction)
			.then(() => expect.fail('Expected exception but got none'))
			.catch(err => {
				expect(err).to.be.instanceOf(Error);
				expect(err.message).to.equal(expected);
			});
	});
});
