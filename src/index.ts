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

import * as Options from './options';
import SlashCommandRegistry from './registry';
export {
	/**
	 * @deprecated Import the methods from {@link Options} methods directly
	 * from the root package instead.
	 */
	Options,
	SlashCommandRegistry,
};
