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

import {
	ContextMenuCommandBuilder,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from '../src';
import { CommandHandlerMixin } from '../src/builders';

describe('Builders have setHandler() functions injected', function() {
	Array.of<new() => CommandHandlerMixin>(
		ContextMenuCommandBuilder,
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
			// @ts-expect-error This is a test of a runtime safety check.
			expect(() => { builder.setHandler('') }).to.throw(
				Error, "handler was 'string', expected 'function'"
			);
		});
	});
});
