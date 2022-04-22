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
 * @external CommandInteraction
 * @see https://discord.js.org/#/docs/main/stable/class/CommandInteraction
 */
/**
 * The function called during command execution.
 *
 * @callback Handler
 * @param {CommandInteraction} interaction A Discord.js CommandInteraction object.
 * @return {any}
 */

const {
	Application,
	Interaction,
	Snowflake,
	CommandInteraction,
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const {
	ApplicationCommandType,
	Routes,
} = require('discord-api-types/v9');
const {
	ContextMenuCommandBuilder,
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
ContextMenuCommandBuilder.prototype.setHandler = setHandler;
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
	 * The handler run for unrecognized commands.
	 */
	default_handler = null;

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
				`input did not resolve to a SlashCommandBuilder. Got ${builder}`
			);
		}

		this.#command_map.set(builder.name, builder);
		return this;
	}

	/**
	 * Defines a new context menu command from a builder.
	 * Commands defined here can also be registered with Discord's API.
	 *
	 * @param {ContextMenuCommandBuilder|Function<ContextMenuCommandBuilder>} input
	 *   Either a ContextMenuCommandBuilder or a function that returns a
	 *   ContextMenuCommandBuilder.
	 * @throws {Error} if builder is not an instance of ContextMenuCommandBuilder
	 *   or a function that returns a ContextMenuCommandBuilder.
	 * @returns {SlashCommandRegistry} instance so we can chain calls.
	 */
	addContextMenuCommand(input) {
		const builder = (typeof input === 'function')
			? input(new ContextMenuCommandBuilder())
			: input;

		if (!(builder instanceof ContextMenuCommandBuilder)) {
			throw new Error(
				`input did not resolve to a ContextMenuCommandBuilder. Got ${builder}`
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
	 * Sets up a function to run for unrecognized commands.
	 *
	 * @param {Handler} handler The function to execute for unrecognized commands.
	 * @throws {Error} if handler is not a function.
	 * @return {CommandRegistry} instance so we can chain calls.
	 */
	setDefaultHandler(handler) {
		if (typeof handler !== 'function') {
			throw new Error(`handler was '${typeof handler}', expected 'function'`);
		}

		this.default_handler = handler;
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
	 * Attempts to execute the given Discord.js Interaction using the most
	 * specific handler provided. For example, if an individual subcommand does
	 * not have a handler but the parent command does, the parent's handler will
	 * be called. If no builder matches the interaction, the default handler is
	 * called (if provided).
	 *
	 * This function is a no-op if:
	 * - The interaction is not a supported {@link Interaction} type. We
	 *   currently support:
	 *     - {@link CommandInteraction}
	 *     - {@link ContextMenuInteraction}
	 * - No builder matches the interaction and no default handler is set.
	 *
	 * This function is set up so it can be directly used as the handler for
	 * Discord.js' `interactionCreate` event (but you may consider a thin wrapper
	 * for logging).
	 *
	 * @param {Interaction} interaction A Discord.js Interaction object.
	 * @return {Promise<*>} Fulfills based on command execution.
	 * @resolve The value returned from the {@link Handler}.
	 * @reject
	 * - Received interaction does not match a command builder. This will
	 *   usually happen if a bot's command definitions are changed without
	 *   updating the bot application with Discord's API.
	 * - Any Error that occurs during handler execution.
	 */
	async execute(interaction) {
		// TODO maybe allow "non-strict" interaction matching?
		if (!(interaction instanceof Interaction)) {
			throw new Error('given value was not a Discord.js Interaction');
		}

		if (!interaction.isCommand() && !interaction.isContextMenu()) {
			return;
		}

		const cmd_name  = interaction.commandName;
		const cmd_group = interaction.options.getSubcommandGroup(false);
		const cmd_sub   = interaction.options.getSubcommand(false);

		// Find the most specific command handler for this CommandInteraction.
		// Drill down matching valid structures here:
		// https://canary.discord.com/developers/docs/interactions/slash-commands#nested-subcommands-and-groups
		const builder_cmd = this.#command_map.get(cmd_name);
		if (!builder_cmd) {
			throw builderErr(interaction, 'command');
		}

		let builder_group;
		if (cmd_group) {
			builder_group = builder_cmd.options.find(b =>
				b instanceof SlashCommandSubcommandGroupBuilder &&
				b.name === cmd_group
			);
			if (!builder_group) {
				throw builderErr(interaction, 'group');
			}
		}

		let builder_sub;
		if (cmd_sub) {
			// See above linked Discord docs on valid command structure.
			builder_sub = (builder_group || builder_cmd).options.find(b =>
				b instanceof SlashCommandSubcommandBuilder &&
				b.name === cmd_sub
			);
			if (!builder_sub) {
				throw builderErr(interaction, 'subcommand');
			}
		}

		const handler =
			builder_sub?.handler   ??
			builder_group?.handler ??
			builder_cmd.handler    ??
			this.default_handler;

		return handler?.(interaction);
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
	 * @return {Promise<JSON>} Fulfills based on the Discord API call.
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

/**
 * Resolves a string interaction option into an Application object.
 * Neither Discord.js nor Discord's own API support application options in
 * commands, so we need to use a builder's `.addStringOption(...)` function
 * instead.
 *
 * **NOTE**: This depends on an undocumented API endpoint. This could break if
 * this endpoint changes.
 * `/applications/{application.id}/rpc`
 *
 * @param {CommandInteraction} interaction A Discord.js interaction containing a
 *   string option containing an application's ID.
 * @param {String} opt_name The option containing the application's ID.
 * @param {Boolean} required Whether to throw an error if the option is not
 *   found (default false).
 * @return {Promise<Application>} Fulfills based on the Discord API call.
 * @resolve {@link Application} The resolved Application object.
 * @reject Any error from the Discord API, e.g. invalid application ID.
 */
async function getApplication(interaction, opt_name, required=false) {
	const app_id = interaction.options.getString(opt_name, required);
	return new REST({ version: '9' })
		.setToken('ignored')
		.get(`/applications/${app_id}/rpc`) // NOTE: undocumented endpoint!
		.then(data => new Application(interaction.client, data))
}

const DEFAULT_EMOJI_PATTERN = /^\p{Emoji}+/u;
const CUSTOM_EMOJI_PATTERN = /^<a?:[^:]+:(\d{17,22})>$/;

/**
 * Resolves a string interaction option into a single emoji. Built-in emojis are
 * just unicode strings, thus they return as unicode strings. Custom emojis have
 * a little more going on, so they are returned as Discord.js GuildEmoji objects.
 *
 * @param {CommandInteraction} interaction A Discord.js interaction containing a
 *   string option that contains an emoji.
 * @param {String} opt_name The option containing the Emoji.
 * @param {Boolean} required Whether to throw an error if the option is not
 *   found (default false).
 * @return {GuildEmoji|String|null} The resolved emoji as a Discord.js
 *   GuildEmoji object for custom emojis, as a String for built-in emojis, or
 *   null if not found.
 */
function getEmoji(interaction, opt_name, required=false) {
	const emoji_str = interaction.options.getString(opt_name, required) || '';

	if (emoji_str.match(DEFAULT_EMOJI_PATTERN)) {
		return emoji_str;
	}

	const match = emoji_str.match(CUSTOM_EMOJI_PATTERN);
	if (match) {
		const emoji_id = match[1];
		return interaction.client.emojis.resolve(emoji_id);
	}

	return null;
}

// Makes an Error describing a mismatched Discord.js CommandInteraction.
function builderErr(interaction, part) {
	return new Error(
		`No known command matches the following (mismatch starts at '${part}')\n` +
		`\tcommand:    ${interaction.commandName}\n` +
		`\tgroup:      ${interaction.options.getSubcommandGroup(false) ?? '<none>'}\n` +
		`\tsubcommand: ${interaction.options.getSubcommand(false) ?? '<none>'}\n` +
		'You may need to update your commands with the Discord API.'
	);
}

module.exports = {
	Options: Object.freeze({
		getApplication,
		getEmoji,
	}),
	...require('@discordjs/builders'), // Forward utils and stuff
	ApplicationCommandType, // For context menu builder
	SlashCommandRegistry,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
};
