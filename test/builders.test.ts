/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
import { expect } from 'chai';
import * as Discord from 'discord.js';

import {
	ContextMenuCommandBuilder,
	Handler,
	SlashCommandCustomOption,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
	SlashCommandRegistry,
} from '../src';
import { BuilderInput } from '../src/builders';

type CanSetHandler = new () => {
	setHandler: (handler: Handler<Discord.CommandInteraction>) => unknown;
}
type CanAddSubCommand = new () => {
	addSubcommand: (input: BuilderInput<SlashCommandSubcommandBuilder>) => unknown;
};

// These are static type tests to ensure Handler can accept all of these types.
new SlashCommandRegistry()
	// Can accept all ContextMenuCommandInteraction types
	.addContextMenuCommand(cmd => cmd
		.setType(Discord.ApplicationCommandType.User)
		.setHandler((int: Discord.UserContextMenuCommandInteraction) => {})
		.setHandler((int: Discord.MessageContextMenuCommandInteraction) => {})
	)
	// Can accept ChatInputCommandInteractions
	.addCommand(cmd => cmd
		.setHandler((int: Discord.CommandInteraction) => {})
		.setHandler((int: Discord.ChatInputCommandInteraction) => {})
	)
	// Can accept a fallback handler
	.setDefaultHandler((int: Discord.CommandInteraction) => {})
	// Can accept commands with options
	.addCommand(cmd => cmd
		.addChannelOption(opt => opt)
	)
	// Can accept subcommands with options
	.addCommand(cmd => cmd
		.addSubcommand(sub => sub
			.addChannelOption(opt => opt)
		)
	)

describe('Builders have setHandler() functions injected', function() {
	Array.of<CanSetHandler>(
		ContextMenuCommandBuilder,
		SlashCommandBuilder,
		SlashCommandSubcommandBuilder,
		SlashCommandSubcommandGroupBuilder,
	).forEach(Class => {

		it(`${Class.name} function injected`, function() {
			const builder = new Class();
			expect(builder).to.respondTo('setHandler');

			const handler = () => {};
			builder.setHandler(handler);
			expect(builder).to.have.property('handler', handler);
		});

		it(`${Class.name} error thrown for non-functions`, function() {
			const builder = new Class();
			// @ts-expect-error This is a test of a runtime safety check.
			expect(() => { builder.setHandler('') }).to.throw(
				Error, "handler was 'string', expected 'function'"
			);
		});
	});
});

describe('Builders require our overridden classes', function() {
	Array.of<CanAddSubCommand>(
		SlashCommandBuilder,
		SlashCommandSubcommandGroupBuilder,
	).forEach(Class => {
		it(`${Class.name} wants ${SlashCommandSubcommandBuilder.name}`, function() {
			const builder = new Class();
			const subcommand = new Discord.SlashCommandSubcommandBuilder();

			// @ts-expect-error This is a test of a runtime safety check.
			expect(() => builder.addSubcommand(subcommand)).to.throw(
				Error,
				'Use SlashCommandSubcommandBuilder from discord-command-registry, not discord.js'
			);
		});
	});

	it(`${SlashCommandBuilder.name} wants ${SlashCommandSubcommandGroupBuilder.name}`, function() {
		const builder = new SlashCommandBuilder();
		const group = new Discord.SlashCommandSubcommandGroupBuilder();

		// @ts-expect-error This is a test of a runtime safety check.
		expect(() => builder.addSubcommandGroup(group)).to.throw(
			Error,
			'Use SlashCommandSubcommandGroupBuilder from discord-command-registry, not discord.js'
		)
	});
});

describe('Builders support our custom option resolvers', function() {
	const TEST_NAME = 'test_name';
	const TEST_DESC = 'test command description';
	function makeOpt(opt: SlashCommandCustomOption): SlashCommandCustomOption {
		return opt
			.setName(TEST_NAME)
			.setDescription(TEST_DESC)
			.setRequired(true);
	}

	Array.from([
		SlashCommandBuilder,
		SlashCommandSubcommandBuilder,
	]).forEach(Class => {
		function makeBuilder() {
			return new Class()
				.setName('ignored')
				.setDescription('ignored');
		}

		it(`${Class.name}.${new Class().addApplicationOption.name}`, function() {
			const builder = makeBuilder().addApplicationOption(makeOpt);
			expect(builder.options[0].toJSON()).to.contain({
				name: TEST_NAME,
				description: TEST_DESC,
				min_length: 18,
				max_length: 20,
				required: true,
				type: Discord.ApplicationCommandOptionType.String,
			});
		});

		it(`${Class.name}.${new Class().addEmojiOption.name}`, function() {
			const builder = makeBuilder().addEmojiOption(makeOpt);
			expect(builder.options[0].toJSON()).to.contain({
				name: TEST_NAME,
				description: TEST_DESC,
				min_length: 1,
				max_length: 32,
				required: true,
				type: Discord.ApplicationCommandOptionType.String,
			});
		});
	});
});
