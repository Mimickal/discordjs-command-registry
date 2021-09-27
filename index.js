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
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
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
		throw new Error(`handler was '${typeof handler}', expected 'function'`);
	}

	this.handler = handler;
	return this;
}
// Inject setHandler into the builder classes. Doing this instead of extending
// the builder classes allows us to set command handlers with the standard
// builder objects without needing to re-implement the addSubcommand(Group)
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
	#rest = null;

	/**
	 * The bot's Discord application ID.
	 */
	application_id = null;

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
	 * Creates a new {@link SlashCommandRegistry}.
	 */
	constructor() {
		this.#rest = new REST({ version: '9' });
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
	setApplicationId(id) {
		this.application_id = id;
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

	/**
	 * Returns an array of command builder JSON that can be sent to Discord's API.
	 *
	 * @param {String[]} commands Optional array of command names. If provided,
	 *     only a subset of the command builders will be serialized.
	 * @return {JSON[]} Array of command builder JSON.
	 */
	toJSON(commands) {
		const should_add_cmd = commands
			? new Map(commands.map(name => [name, true]))
			: this.#command_map; // Also a map of name -> truthy value

		return this.commands
			.filter(cmd => should_add_cmd.get(cmd.name))
			.map(cmd => cmd.toJSON());
	}

	/**
	 * Registers known commands with Discord's API via an HTTP call.
	 *
	 * @param {Object} options Optional parameters for this function.
	 * - {@link Snowflake} `application_id` - A Discord application ID. If
	 *     specified, this ID will override the one specified via
	 *     {@link SlashCommandRegistry.setAppId} for this call.
	 * - {@link String[]} `commands` - An array of command names. When specified,
	 *     only these commands will be registered with the API. This can be
	 *     useful for only registering new commands. If omitted, all commands
	 *     are registered.
	 * - {@link Snowflake} `guild` - A Discord Guild ID. If provided, commands
	 *     will be registered for a specific guild instead of globally. This can
	 *     be useful for testing commands.
	 * - {@link String} `token` - A Discord bot token. If specified, this token
	 *     will override the one specified via
	 *     {@link SlashCommandRegistry.setToken} for this call.
	 * @return {Promise} Fulfills based on the Discord API call.
	 * @resolve {@link JSON} Response body returned from Discord's API.
	 * @reject {@link DiscordAPIError} containing the Discord API error.
	 *     **NOTE**: This is the `DiscordAPIError` from the `@discordjs/rest`
	 *     package, *not* the `discord.js` package.
	 */
	async registerCommands(options) {
		options = options || {};

		if (options.token) {
			this.#rest.setToken(options.token);
		}

		try {
			const app_id = options.application_id || this.application_id;
			return await this.#rest.put(
				options.guild
					? Routes.applicationGuildCommands(app_id, options.guild)
					: Routes.applicationCommands(app_id),
				{ body: this.toJSON(options.commands) },
			);
		} finally {
			// So we only use provided token for one request
			this.#rest.setToken(this.token);
		}
	}
}

module.exports = {
	SlashCommandRegistry,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
};
