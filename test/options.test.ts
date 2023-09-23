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
import { Application, Guild, GuildEmoji } from 'discord.js';

import { getApplication, getEmoji } from '..';
import { mockAgent, MockCommandInteraction } from './mock';

describe('Option resolvers', function() {
	const TEST_OPT_NAME = 'test_opt';

	/**
	 * Makes a {@link MockCommandInteraction} object with a single string
	 * option containing the given value.
	 */
	function makeInteractionWithOpt(value: string | undefined): MockCommandInteraction {
		return new MockCommandInteraction({
			name: 'test',
			...(value ? { opt: {
				name: TEST_OPT_NAME,
				value: value,
			}} : {}),
		});
	}

	describe(getApplication.name, function() {

		it('Required but not provided', async function() {
			const interaction = makeInteractionWithOpt(undefined);
			try {
				await getApplication(interaction, TEST_OPT_NAME, true);
				return expect.fail('Expected exception but got none');
			} catch (err) {
				expect(err).to.be.instanceOf(TypeError);
				expect((err as TypeError).message).to.equal(
					`Required option "${TEST_OPT_NAME}" not found.`
				);
			}
		});

		it('Returns a good application', async function() {
			const test_app_id = '12345';
			const test_app_name = 'cool thing';

			mockAgent.get('https://discord.com')
				.intercept({
					method: 'GET',
					path: `/api/v10/applications/${test_app_id}/rpc`,
				}).reply(200, {
					id: test_app_id,
					name: test_app_name,
					icon: 'testhashthinghere',
				}, {
					headers: { 'content-type': 'application/json' }
				});

			const interaction = makeInteractionWithOpt(test_app_id);

			const app = await getApplication(interaction, TEST_OPT_NAME);
			expect(app).to.be.instanceOf(Application);
			expect(app.id).to.equal(test_app_id);
			expect(app.name).to.equal(test_app_name);
		});
	});

	describe(getEmoji.name, function() {

		it('Required but not provided', function() {
			const interaction = makeInteractionWithOpt(undefined);
			expect(
				() => getEmoji(interaction, TEST_OPT_NAME, true)
			).to.throw(TypeError, `Required option "${TEST_OPT_NAME}" not found.`);
		});

		it('Optional and not provided', function() {
			const interaction = makeInteractionWithOpt(undefined);
			const emoji = getEmoji(interaction, TEST_OPT_NAME);
			expect(emoji).to.be.null;
		});

		it('Not an emoji string', function() {
			const interaction = makeInteractionWithOpt('not an emoji');
			const emoji = getEmoji(interaction, TEST_OPT_NAME);
			expect(emoji).to.be.null;
		});

		it('Built-in emoji string', function() {
			const test_str = '🦊';
			const interaction = makeInteractionWithOpt(test_str);
			const emoji = getEmoji(interaction, TEST_OPT_NAME);
			expect(emoji).to.be.a.string;
			expect(emoji).to.equal(test_str);
		});

		it('Complex emoji string', function() {
			// These are all emojis that were demonstrated to trip up the regex
			Array.of('1️⃣', '🕴️', '🎞️', '🖼️').forEach(emoji_str => {
				const interaction = makeInteractionWithOpt(emoji_str);
				const got_emoji = getEmoji(interaction, TEST_OPT_NAME);
				expect(got_emoji).to.be.a.string;
				expect(got_emoji).to.equal(emoji_str);
			});
		});

		describe('Custom emojis', function() {
			const TEST_EMOJI_ID = '884481185005326377';
			const TEST_EMOJI_NAME = 'fennec_fox';
			const TEST_EMOJI_STR = `<:${TEST_EMOJI_NAME}:${TEST_EMOJI_ID}>`;

			// Need to populate the test client's cache with our test emoji.
			// Discord.js internally aggregates the emojis of individual guilds
			// on the fly, so we need to make a fake guild and set up all those
			// links, too.
			// https://github.com/discordjs/discord.js/blob/14.9.0/packages/discord.js/src/client/Client.js#L179
			function addTestEmojiToClient(interaction: MockCommandInteraction): void {
				//@ts-ignore Private constructor
				const test_guild = new Guild(interaction.client, {
					channels: [true], // Dumb hack.
				});
				// @ts-ignore Private constructor
				const test_emoji = new GuildEmoji(interaction.client,
					{ id: TEST_EMOJI_ID, name: TEST_EMOJI_NAME },
					test_guild
				);
				test_guild.emojis.cache.set(TEST_EMOJI_ID, test_emoji);
				interaction.client.guilds.cache.set(test_guild.id, test_guild);
			}

			it('Custom emoji by raw Discord ID', function() {
				const interaction = makeInteractionWithOpt(TEST_EMOJI_ID);
				addTestEmojiToClient(interaction)

				const emoji = getEmoji(interaction, TEST_OPT_NAME);
				expect(emoji).to.be.instanceOf(GuildEmoji);
				expect(emoji?.toString()).to.equal(TEST_EMOJI_STR);
			});

			it('Custom emoji string', function() {
				const interaction = makeInteractionWithOpt(TEST_EMOJI_STR);
				addTestEmojiToClient(interaction);

				const emoji = getEmoji(interaction, TEST_OPT_NAME);
				expect(emoji).to.be.instanceOf(GuildEmoji)
				expect(emoji?.toString()).to.equal(TEST_EMOJI_STR);
			});
		});
	});
});
