/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
import * as Discord from 'discord.js';
import { Mixin } from 'ts-mixer';

/** The function called during command execution. */
type Handler = (interaction: Discord.CommandInteraction) => any;

/**
 * Mixin that adds the ability to set and store a command handler function.
 *
 * This implementation matches the pattern used in `@discordjs/builders`
 * https://github.com/discordjs/discord.js/blob/main/packages/builders/src/interactions/slashCommands/SlashCommandBuilder.ts
 */
export class CommandHandlerMixin { // NOTE: exported for test only
	/** The function called when this command is executed. */
	public readonly handler: Handler | undefined;

	/** Sets the function called when this command is executed. */
	setHandler(handler: Handler): this {
		if (typeof handler !== 'function') {
			throw new Error(`handler was '${typeof handler}', expected 'function'`);
		}

		Reflect.set(this, 'handler', handler);
		return this;
	}
}

export class ContextMenuCommandBuilder extends
	Mixin(Discord.ContextMenuCommandBuilder, CommandHandlerMixin) {}

export class SlashCommandBuilder extends
	Mixin(Discord.SlashCommandBuilder, CommandHandlerMixin) {}

export class SlashCommandSubcommandBuilder extends
	Mixin(Discord.SlashCommandSubcommandBuilder, CommandHandlerMixin) {}

export class SlashCommandSubcommandGroupBuilder extends
	Mixin(Discord.SlashCommandSubcommandGroupBuilder, CommandHandlerMixin) {}
