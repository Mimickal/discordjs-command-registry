const expect = require('chai').expect;
const nock = require('nock');
const { DiscordAPIError } = require('@discordjs/rest');
const {
	SlashCommandRegistry,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
 } = require('.');

describe('Command builders have handler functions injected', function() {
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
