/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/

/**
 * @external SlashCommandBuilder
 * @see https://github.com/discordjs/builders/blob/main/docs/examples/Slash%20Command%20Builders.md
 */

const { Interaction } = require('discord.js');
const {
	SlashCommandBuilder,
} = require('@discordjs/builders');

/**
 * A collection of Discord.js commands that registers itself with Discord's API
 * and routes Discord.js Interaction events to the appropriate command handlers.
 */
class SlashCommandRegistry {

	// Stores a SlashCommandBuilder and handler function together.
	#command_map = new Map();

	/**
	 * Accessor for the list of {@link SlashCommandBuilder} objects.
	 */
	get commands() {
		return Array.from(this.#command_map.values());
	}

	/**
	 * Defines a new command from a builder.
	 * Commands defined here can also be registered with Discord's API.
	 *
	 * @param {SlashCommandBuilder|Function<SlashCommandBuilder>} input
	 *   Either a SlashCommandBuilder or a function that returns a
	 *   SlashCommandBuilder.
	 * @throws {Error} if builder is not an instance of SlashCommandBuilder or
	 *   a function that returns a SlashCommandBuilder.
	 * @return {CommandRegistry} instance so we can chain calls.
	 */
	addCommand(input) {
		const builder = (typeof input === 'function')
			? input(new SlashCommandBuilder())
			: input;

		if (!(builder instanceof SlashCommandBuilder)) {
			throw new Error(
				`input did not resolve to a ${SlashCommandBuilder.name}. Got ${builder}`
			);
		}

		this.#command_map.set(builder.name, builder);
		return this;
	}
}

module.exports = {
	SlashCommandRegistry,
	SlashCommandBuilder,
};
