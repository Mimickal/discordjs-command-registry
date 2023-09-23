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
	CommandInteraction,
	Guild,
	PermissionFlagsBits,
} from 'discord.js';

import { Handler } from './builders';

/**
 * Command handler middleware that only runs the handler if the user who
 * initiated the interaction has the {@link PermissionFlagsBits.Administrator}
 * permission. If the check fails, the {@link reject} handler is called instead.
 * Implies {@link requireGuild}.
 */
export function requireAdmin<T extends CommandInteraction>(
	handler: Handler<T>,
	reject?: Handler<T>,
): Handler<T> {
	return async function(interaction: T): Promise<unknown> {
		if (!interaction.inCachedGuild()) {
			return reject?.(interaction);
		};

		const member = await interaction.member.fetch();

		if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
			return reject?.(interaction);
		}

		return handler(interaction);
	}
}

/**
 * Command handler middleware that only runs the handler if the interaction
 * comes from a Guild. If the check fails, the {@link reject} handler is called
 * instead.
 */
export function requireGuild<T extends CommandInteraction>(
	handler: Handler<T & { get guild(): Guild }>,
	reject?: Handler<T>,
): Handler<T> {
	return function(interaction: T): unknown {
		return interaction.inCachedGuild()
			? handler(interaction)
			: reject?.(interaction);
	}
}
