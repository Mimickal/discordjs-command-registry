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
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from '../src';
import { BuilderInput, Handler } from '../src/builders';

type CanSetHandler = new () => {
	setHandler: (handler: Handler) => unknown;
}
type CanAddSubCommand = new () => {
	addSubcommand: (input: BuilderInput<SlashCommandSubcommandBuilder>) => unknown;
};

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
