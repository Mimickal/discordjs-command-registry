/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
export {
	ContextMenuCommandBuilder,
	Handler,
	SlashCommandBuilder,
	SlashCommandCustomOption,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from './builders';
export * from './middleware';
export * from './options';

import {
	getApplication,
	getEmoji,
} from './options';

/**
 * @deprecated Import these methods directly from the root package instead.
 * {@link Options} will be removed in v4.0.0.
 */
const Options = Object.freeze({
	getApplication,
	getEmoji,
});

import SlashCommandRegistry from './registry';
export {
	Options,
	SlashCommandRegistry,
};
