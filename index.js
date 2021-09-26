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
/**
 * The function called during command execution.
 *
 * @callback Handler
 * @param {CommandInteraction} interaction A Discord.js CommandInteraction object.
 * @return {any}
 */

const {
	Interaction,
	Snowflake,
} = require('discord.js');
const {
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} = require('@discordjs/builders');

/**
 * Sets a handler function called when this command is executed.
 *
 * @param {Handler} handler The handler function
 * @returns {any} instance so we can chain calls.
 */
function setHandler(handler) {
	if (typeof handler !== 'function') {
		throw new Error(`handler was ${typeof handler}, expected 'function'`);
	}

	this.handler = handler;
	return this;
}
// Inject setHandler into the builder classes. Doing this instead of extending
// the builder classes allows us to set command handlers with the standard
// builder objects without needing to re-implement theaddSubcommand(Group)
// functions.
SlashCommandBuilder.prototype.setHandler = setHandler;
SlashCommandSubcommandBuilder.prototype.setHandler = setHandler;
SlashCommandSubcommandGroupBuilder.prototype.setHandler = setHandler;

/**
 * A collection of Discord.js commands that registers itself with Discord's API
 * and routes Discord.js Interaction events to the appropriate command handlers.
 */
class SlashCommandRegistry {

	#command_map = new Map();

	/**
	 * The bot's Discord application ID.
	 */
	app_id = null;

	/**
	 * The bot token used to register commands with Discord's API.
	 */
	token = null;

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
	 * @return {SlashCommandRegistry} instance so we can chain calls.
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

	/**
	 * Sets the Discord application ID. This is the ID for the Discord
	 * application to register commands for.
	 *
	 * @param {Snowflake} id The Discord application ID to register commands for.
	 * @return {SlashCommandRegistry} instance so we can chain calls.
	 */
	setAppId(id) {
		this.app_id = id;
		return this;
	}

	/**
	 * Sets the Discord bot token for this command registry.
	 *
	 * @param {String} token A Discord bot token, used to register commands.
	 * @throws {Error} if token is not a string.
	 * @return {SlashCommandRegistry} instance so we can chain calls.
	 */
	setToken(token) {
		// setToken handles validation for us
		this.token = token;
		this.#rest.setToken(token);
		return this;
	}
}

module.exports = {
	SlashCommandRegistry,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
};
