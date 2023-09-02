/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
import {
	BaseInteraction,
	ChatInputCommandInteraction,
	CommandInteraction,
	ContextMenuCommandInteraction,
	DiscordAPIError,
	ContextMenuCommandBuilder as DiscordContextMenuCommandBuilder,
	SlashCommandBuilder as DiscordSlashCommandBuilder,
	REST,
	Routes,
	Snowflake,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

import {
	assertReturnOfBuilder,
	BuilderInput,
	ContextMenuCommandBuilder,
	Handler,
	resolveBuilder,
	SlashCommandBuilder,
	SlashCommandBuilderReturn,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from './builders';
import { API_VERSION } from './constants';

/** A top-level command builder. */
type TopLevelBuilder = SlashCommandBuilderReturn | ContextMenuCommandBuilder;

/** Optional parameters for registering commands. */
interface RegisterOpts {
	/**
	 * A Discord application ID. If specified, this ID will override the one
	 * specified via {@link SlashCommandRegistry.setAppId} for this call.
	 */
	application_id?: Snowflake;
	/**
	 * An array of command names. When specified, only these commands will be
	 * registered with Discord's API. This can be useful for only registering
	 * new commands. If omitted, all commands are registered.
	 */
	commands?: string[];
	/**
	 * A Discord Guild ID. If specified, this ID will override the one
	 * specified via {@link SlashCommandRegistry.setGuildId} for this call.
	 */
	guild?: Snowflake;
	/**
	 * A Discord bot token. If specified, this token will override the one
	 * specified via {@link SlashCommandRegistry.setToken} for this call.
	 */
	token?: string;
}

/**
 * A collection of Discord.js commands that registers itself with Discord's API
 * and routes Discord.js {@link BaseInteraction} events to the appropriate
 * command handlers.
 */
export default class SlashCommandRegistry {

	#command_map = new Map<string, TopLevelBuilder>();
	#rest: REST;

	/** The bot's Discord application ID. */
	application_id: Snowflake | null = null;

	/** The handler run for unrecognized commands. */
	default_handler: Handler<CommandInteraction> | null = null;

	/** A Discord guild ID used to restrict command registration to one guild. */
	guild_id: Snowflake | null = null;

	/** The bot token used to register commands with Discord's API. */
	token: string | null = null;

	/** Accessor for the list of Builder objects. */
	get commands(): TopLevelBuilder[] {
		return Array.from(this.#command_map.values());
	}

	/** Creates a new {@link SlashCommandRegistry}. */
	constructor() {
		this.#rest = new REST({ version: API_VERSION });
	}

	/**
	 * Defines a new slash command from a builder.
	 * Commands defined here can also be registered with Discord's API.
	 *
	 * @param input Either a SlashCommandBuilder or a function that returns a
	 *   SlashCommandBuilder.
	 * @throws If input does not resolve to a SlashCommandBuilder.
	 * @return Instance so we can chain calls.
	 */
	addCommand(input: BuilderInput<SlashCommandBuilder>): this {
		const builder = resolveBuilder(input, SlashCommandBuilder);
		assertReturnOfBuilder(builder,
			SlashCommandBuilder,
			DiscordSlashCommandBuilder
		);

		this.#command_map.set(builder.name, builder);
		return this;
	}

	/**
	 * Defines a new context menu command from a builder.
	 * Commands defined here can also be registered with Discord's API.
	 *
	 * @param input Either a ContextMenuCommandBuilder or a function that
	 *   returns a ContextMenuCommandBuilder.
	 * @throws If input does not resolve to a ContextMenuCommandBuilder.
	 * @returns Instance so we can chain calls.
	 */
	addContextMenuCommand(input: BuilderInput<ContextMenuCommandBuilder>): this {
		const builder = resolveBuilder(input, ContextMenuCommandBuilder);
		assertReturnOfBuilder(builder,
			ContextMenuCommandBuilder,
			DiscordContextMenuCommandBuilder,
		);

		this.#command_map.set(builder.name, builder);
		return this;
	}

	/**
	 * Sets the Discord application ID. This is the ID for the Discord
	 * application to register commands for.
	 *
	 * @param id The Discord application ID to register commands for.
	 * @return Instance so we can chain calls.
	 */
	setApplicationId(id: Snowflake): this {
		this.application_id = id;
		return this;
	}

	/**
	 * Sets up a function to run for unrecognized commands.
	 *
	 * @param handler The function to execute for unrecognized commands.
	 * @throws If handler is not a function.
	 * @return Instance so we can chain calls.
	 */
	setDefaultHandler(handler: Handler<CommandInteraction>): this {
		if (typeof handler !== 'function') {
			throw new Error(`handler was '${typeof handler}', expected 'function'`);
		}

		this.default_handler = handler;
		return this;
	}

	/**
	 * Sets the Discord guild ID. This restricts command registration to the
	 * given guild, rather than registering globally.
	 *
	 * @param id The Discord guild ID.
	 * @returns Instance so we can chain calls.
	 */
	setGuildId(id: Snowflake | null): this {
		this.guild_id = id;
		return this;
	}

	/**
	 * Sets the Discord bot token for this command registry.
	 *
	 * @param token A Discord bot token, used to register commands.
	 * @throws If token is not a string.
	 * @return {SlashCommandRegistry} instance so we can chain calls.
	 */
	setToken(token: string): this {
		// setToken handles validation for us.
		this.token = token;
		this.#rest.setToken(token);
		return this;
	}

	/**
	 * Returns an array of command builder JSON that can be sent to Discord's API.
	 *
	 * @param commands Optional array of command names.
	 *   If provided, only a subset of the command builders will be serialized.
	 * @return Array of command builder JSON.
	 */
	toJSON(commands?: string[]): (
		RESTPostAPIContextMenuApplicationCommandsJSONBody |
		RESTPostAPIChatInputApplicationCommandsJSONBody
	)[] {
		const should_add_cmd = commands
			? new Map(commands.map(name => [name, true]))
			: this.#command_map; // Doubles as a map of name -> truthy value

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
	 * - The interaction is not a supported Interaction type.
	 *   - {@link ContextMenuCommandInteraction}
	 *   - {@link ChatInputCommandInteraction}
	 * - No builder matches the interaction and no default handler is set.
	 *
	 * This function is set up so it can be directly used as the handler for
	 * Discord.js' `interactionCreate` event (but you may consider a thin
	 * wrapper for logging).
	 *
	 * @param interaction A Discord.js interaction object.
	 * @param T An optional type for the data returned by the handler.
	 *   Defaults to `unknown`.
	 * @resolve The value returned from the {@link Handler}.
	 * @reject
	 * - Received interaction does not match a command builder. This will
	 *   usually happen if a bot's command definitions are changed without
	 *   updating the bot application with Discord's API.
	 * - Any Error that occurs during handler execution.
	 */
	execute<T = unknown>(interaction: BaseInteraction): T | undefined {
		if (!(typeof interaction?.isCommand === 'function')) {
			throw new Error(`given value was not a Discord.js command`);
		}

		if (!interaction.isChatInputCommand?.() &&
			!interaction.isContextMenuCommand?.()
		) {
			return;
		}

		// Find the most specific command handler for this CommandInteraction.
		// Drill down matching valid structures here:
		// https://canary.discord.com/developers/docs/interactions/slash-commands#nested-subcommands-and-groups
		const builder_top = this.#command_map.get(interaction.commandName);
		if (!builder_top) {
			throw builderErr(interaction, 'command');
		}

		let builder_group: SlashCommandSubcommandGroupBuilder | undefined;
		let builder_sub: SlashCommandSubcommandBuilder | undefined;

		if (interaction.isChatInputCommand()) {
			const cmd_group = interaction.options.getSubcommandGroup?.(false);
			const cmd_sub   = interaction.options.getSubcommand?.(false);
			const builder_cmd = builder_top as SlashCommandBuilder;

			if (cmd_group) {
				// Discord.js' typing narrows all option objects down to a
				// single toJSON() function. The other option data is still
				// there in the underlying object though, and we want it.
				// The instanceof check here should make this a safe cast.
				builder_group = builder_cmd.options.find(b =>
					b instanceof SlashCommandSubcommandGroupBuilder &&
					b.name === cmd_group
				) as SlashCommandSubcommandGroupBuilder;

				if (!builder_group) {
					throw builderErr(interaction, 'group');
				}
			}

			if (cmd_sub) {
				// Same story here.
				builder_sub = (builder_group || builder_cmd).options.find(b =>
					b instanceof SlashCommandSubcommandBuilder &&
					b.name === cmd_sub
				) as SlashCommandSubcommandBuilder;

				if (!builder_sub) {
					throw builderErr(interaction, 'subcommand');
				}
			}
		}

		const handler =
			builder_sub?.handler   ??
			builder_group?.handler ??
			builder_top.handler    ??
			this.default_handler;

		// @ts-expect-error Discord.js Interaction types are mutually exclusive,
		// despite all extending BaseInteraction. We do our best to make sure
		// each individual handler is the right type, but the union of all of
		// them here resolves to "never".
		// https://discord.com/channels/222078108977594368/824411059443204127/1145960025962066033
		return handler ? handler(interaction) as T : undefined;
	}

	/**
	 * Registers known commands with Discord's API via an HTTP call.
	 *
	 * @param options Optional parameters for this function.
	 * @return Fulfills based on the Discord API call.
	 * @reject {@link DiscordAPIError} containing the Discord API error.
	 *     **NOTE**: This is the `DiscordAPIError` from the `@discordjs/rest`
	 *     package, *not* the `discord.js` package.
	 */
	async registerCommands(options?: RegisterOpts): Promise<unknown> {
		options = options ?? {};

		if (options.token) {
			this.#rest.setToken(options.token);
		}

		try {
			// app_id might not actually be defined, but Discord's API will
			// return an error if not.
			const app_id = (options.application_id || this.application_id)!;
			const guild_id = options.guild || this.guild_id;
			return await this.#rest.put(
				guild_id
					? Routes.applicationGuildCommands(app_id, guild_id)
					: Routes.applicationCommands(app_id),
				{ body: this.toJSON(options.commands) },
			);
		} finally {
			// So we only use provided token for one request.
			// this.token
			this.#rest.setToken(this.token!);
		}
	}
}

/** Makes an Error describing a mismatched Discord.js CommandInteraction. */
function builderErr(interaction: CommandInteraction, part: string): Error {
	return new Error([
		`No known command matches the following (mismatch starts at '${part}')`,
		`\tcommand:    ${interaction.commandName}`,
		...(interaction.isChatInputCommand() ? [
			`\tgroup:      ${interaction.options.getSubcommandGroup(false) ?? '<none>'}`,
			`\tsubcommand: ${interaction.options.getSubcommand(false) ?? '<none>'}`,
		] : []),
		'You may need to update your commands with the Discord API.',
	].join('\n'));
}
