const expect = require('chai').expect;
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
