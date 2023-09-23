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
import { PermissionFlagsBits } from 'discord.js';

import {
	requireAdmin,
	requireGuild,
	SlashCommandBuilder,
} from '..';

import { MockCommandInteraction, MockGuildMember } from './mock';

const STANDARD_HANDLER_MSG = 'Standard handler' as const;
const REJECTED_HANDLER_MSG = 'Rejected handler' as const;

describe('Middleware', function() {
describe(requireAdmin.name, function() {
	const cmd = new SlashCommandBuilder().setHandler(requireAdmin(
		(interaction) => STANDARD_HANDLER_MSG,
		(interaction) => REJECTED_HANDLER_MSG,
	));

	it('Standard handler called for Admin user', async function() {
		const interaction = new MockCommandInteraction({
			name: 'test',
			is_in_guild: true,
			member: new MockGuildMember({
				permissions: PermissionFlagsBits.Administrator,
			}),
		});

		const result = await cmd.handler!(interaction);
		expect(result).to.equal(STANDARD_HANDLER_MSG);
	});

	it('Rejected handler called for non-Admin user', async function() {
		const interaction = new MockCommandInteraction({
			name: 'test',
			is_in_guild: true,
			member: new MockGuildMember({
				permissions: undefined,
			}),
		});

		const result = await cmd.handler!(interaction);
		expect(result).to.equal(REJECTED_HANDLER_MSG);
	});

	it('Rejected handler called for non-Guild interaction', async function() {
		const interaction = new MockCommandInteraction({
			name: 'test',
			is_in_guild: false,
		});

		const result = await cmd.handler!(interaction);
		expect(result).to.equal(REJECTED_HANDLER_MSG);
	});
});

describe(requireGuild.name, function() {
	const cmd = new SlashCommandBuilder().setHandler(requireGuild(
		(interaction) => STANDARD_HANDLER_MSG,
		(interaction) => REJECTED_HANDLER_MSG,
	));

	it('Standard handler called for interaction in Guild', async function() {
		const interaction = new MockCommandInteraction({
			name: 'test',
			is_in_guild: true,
		});

		const result = await cmd.handler!(interaction);
		expect(result).to.equal(STANDARD_HANDLER_MSG);
	});

	it('Rejected handler called for interaction outside Guild', async function() {
		const interaction = new MockCommandInteraction({
			name: 'test',
			is_in_guild: false,
		});

		const result = await cmd.handler!(interaction);
		expect(result).to.equal(REJECTED_HANDLER_MSG);
	});
});
});
