/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/

// Ok this is a bit of a nightmare. Let me explain.
// We want the command builders to all support an additional field and setter
// for a handler function. We also want that change to be a drop-in replacement.
//
// In JavaScript, we can hack it onto the existing builders' prototypes.
// It works, but it is indeed a hack, so it breaks any sort of type hinting.
//
// In TypeScript, we want type safety, so we need to do it the "right" way.
// This means extending discord.js' builders, and duplicating some functionality
// to get type safety/checking with our classes.
// We also want this to be a drop-in replacement though, so the class names all
// need to stay the same. So what do we do? Import all discord.js' things into a
// "Discord" namespace, duplicate some logic (addCommand, etc...) to return our
// versions of the classes, and do a wee bit of (safe) @ts-ignore-ing to change
// the parameter type of some inherited methods.
// Most of what follows is satisfying TypeScript's type checker.

import * as Discord from 'discord.js';
import { Mixin } from 'ts-mixer';
import { s } from '@sapphire/shapeshift';

const { name: pack_name } = require('../package.json');

/** Either a Builder or a function that returns a Builder. */
export type BuilderInput<T> = T | ((thing: T) => T);
/** The function called during command execution. */
export type Handler = (interaction: Discord.CommandInteraction) => unknown;

/**
 * Mixin that adds the ability to set and store a command handler function.
 *
 * This implementation matches the pattern used in `@discordjs/builders`
 * https://github.com/discordjs/discord.js/blob/14.9.0/packages/builders/src/interactions/slashCommands/SlashCommandBuilder.ts
 */
class CommandHandlerMixin {
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


export class ContextMenuCommandBuilder extends Mixin(
	Discord.ContextMenuCommandBuilder,
	CommandHandlerMixin,
) {}

export class SlashCommandBuilder extends Mixin(
	Discord.SlashCommandBuilder,
	CommandHandlerMixin,
) {
	// @ts-ignore We want to force this to only accept our version of the
	// builder with .setHandler.
	addSubcommand(input: BuilderInput<SlashCommandSubcommandBuilder>): this {
		return addThing(this, input,
			SlashCommandSubcommandBuilder,
			Discord.SlashCommandSubcommandBuilder
		);
	}

	// @ts-ignore We want to force this to only accept our version of the
	// builder with .setHandler.
	addSubcommandGroup(input: BuilderInput<SlashCommandSubcommandGroupBuilder>): this {
		return addThing(this, input,
			SlashCommandSubcommandGroupBuilder,
			Discord.SlashCommandSubcommandGroupBuilder,
		);
	}
}

export class SlashCommandSubcommandGroupBuilder extends Mixin(
	Discord.SlashCommandSubcommandGroupBuilder,
	CommandHandlerMixin,
) {
	// @ts-ignore We want to force this to only accept our version of the
	// builder with .setHandler.
	addSubcommand(input: BuilderInput<SlashCommandSubcommandBuilder>): this {
		return addThing(this, input,
			SlashCommandSubcommandBuilder,
			Discord.SlashCommandSubcommandBuilder
		);
	}
}

export class SlashCommandSubcommandBuilder extends Mixin(
	Discord.SlashCommandSubcommandBuilder,
	CommandHandlerMixin,
) {}

/**
 * Discord.js builders are not designed to be grouped together in a collection.
 * This union represents any possible end value for an individual command's
 * builder.
 */
export type SlashCommandBuilderReturn =
	| SlashCommandBuilder
	| Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
	| SlashCommandSubcommandsOnlyBuilder;

type SlashCommandSubcommandsOnlyBuilder = Omit<
	SlashCommandBuilder,
	Exclude<keyof Discord.SharedSlashCommandOptions, 'options'>
>;

/**
 * Some magic to de-duplicate our overridden addWhatever methods.
 * Couldn't bind `this` with a Mixin, so this will have to do.
 */
function addThing<
	S extends { options: Discord.ToAPIApplicationCommandOptions[] },
	T extends Discord.ToAPIApplicationCommandOptions,
	P,
>(
	self: S,
	input: BuilderInput<T>,
	Class: new () => T,
	Parent: new () => P,
): S {
	validateMaxOptionsLength(self.options);
	const result = resolveBuilder(input, Class);
	assertReturnOfBuilder(result, Class, Parent);
	self.options.push(result);
	return self;
}

/**
 * Adapted from
 * https://github.com/discordjs/discord.js/blob/14.9.0/packages/builders/src/interactions/slashCommands/Assertions.ts#L68
 */
export function assertReturnOfBuilder<T, P>(
	input: unknown,
	ExpectedInstanceOf: new () => T,
	ParentInstanceOf: new () => P,
): asserts input is T {
	if (!(input instanceof ExpectedInstanceOf)) {
		throw new Error(input instanceof ParentInstanceOf
			? `Use ${ExpectedInstanceOf.name} from ${pack_name}, not discord.js`
			: `input did not resolve to a ${ExpectedInstanceOf.name}. Got ${input}`
		);
	}
}

/** Resolves {@link BuilderInput} values to their final form. */
export function resolveBuilder<T>(input: BuilderInput<T>, Class: new() => T): T {
	return input instanceof Function ? input(new Class()) : input;
}

/**
 * Stolen directly from
 * https://github.com/discordjs/discord.js/blob/14.9.0/packages/builders/src/interactions/slashCommands/Assertions.ts#L33
 */
function validateMaxOptionsLength(
	options: unknown
): asserts options is Discord.ToAPIApplicationCommandOptions[] {
	s.unknown.array.lengthLessThanOrEqual(25).parse(options);
}
