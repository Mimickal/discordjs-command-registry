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
	Application,
	ChatInputCommandInteraction,
	FormattingPatterns,
	GuildEmoji,
	REST,
} from 'discord.js';

import { API_VERSION } from './constants';

const DEFAULT_EMOJI_PATTERN = /^\p{Emoji}+/u;
const DISCORD_ID_PATTERN = /^\d{17,22}$/;

/**
 * Resolves a string interaction option into an Application object.
 * Neither Discord.js nor Discord's own API support application options in
 * commands, so we need to use a builder's `.addStringOption(...)` function
 * instead.
 *
 * **NOTE**: This depends on an undocumented API endpoint.
 * This could break if this endpoint changes:
 * `/applications/{application.id}/rpc`
 *
 * @param interaction A Discord.js interaction containing a string option that
 *   contains an Application's ID.
 * @param opt_name The string option containing the application's ID.
 * @param required Whether to throw an error if the option is not found.
 * @reject Any error from the Discord API, e.g. invalid application ID.
 */
export async function getApplication(
	interaction: ChatInputCommandInteraction,
	opt_name: string,
	required=false,
): Promise<Application> {
	const app_id = interaction.options.getString(opt_name, required);
	return new REST({ version: API_VERSION })
		.setToken('ignored')
		.get(`/applications/${app_id}/rpc`) // NOTE: undocumented endpoint!
		// @ts-ignore This constructor is private, but discord.js doesn't
		// offer any other way to instantiate or look up an Application.
		.then(data => new Application(interaction.client, data))
}

/**
 * Resolves a string interaction option into a single emoji. Built-in emojis are
 * just unicode strings, thus they return as unicode strings. Custom emojis have
 * a little more going on, so they are returned as Discord.js GuildEmoji objects.
 *
 * @param interaction A Discord.js interaction containing a string option that
 *   contains an emoji.
 * @param opt_name The string option containing the Emoji.
 * @param required Whether to throw an error if the option is not found.
 * @return {GuildEmoji|String|null} The resolved emoji as a Discord.js
 *   GuildEmoji object for custom emojis, as a String for built-in emojis, or
 *   null if not found.
 */
export function getEmoji(
	interaction: ChatInputCommandInteraction,
	opt_name: string,
	required=false,
): GuildEmoji | string | null {
	const emoji_str = interaction.options.getString(opt_name, required) || '';

	// This matches built-in emojis AND Discord IDs, so we need a another check.
	if (emoji_str.match(DEFAULT_EMOJI_PATTERN)) {
		if (emoji_str.match(DISCORD_ID_PATTERN)) {
			return interaction.client.emojis.resolve(emoji_str);
		}

		return emoji_str;
	}

	const match = emoji_str.match(FormattingPatterns.Emoji);
	if (match?.groups) {
		const emoji_id = match.groups.id;
		return interaction.client.emojis.resolve(emoji_id);
	}

	return null;
}

