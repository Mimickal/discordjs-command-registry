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

import { Middleware, SlashCommandBuilder } from '../src';
const { requireAdmin, requireGuild } = Middleware;

import { MockCommandInteraction, MockGuildMember } from './mock';

describe('Middleware', function() {
describe(requireAdmin.name, function() {
	const cmd = new SlashCommandBuilder().setHandler(requireAdmin(
		(interaction) => 'Standard handler',
		(interaction) => 'Rejected handler',
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
		expect(result).to.equal('Standard handler');
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
		expect(result).to.equal('Rejected handler');
	});

	it('Rejected handler called for non-Guild interaction', async function() {
		const interaction = new MockCommandInteraction({
			name: 'test',
			is_in_guild: false,
		});

		const result = await cmd.handler!(interaction);
		expect(result).to.equal('Rejected handler');
	});
});
});
