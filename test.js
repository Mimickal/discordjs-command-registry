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

