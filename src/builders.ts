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
//
// We use the same "mixin" pattern discord.js uses in `@discordjs/builders`
// https://github.com/discordjs/discord.js/blob/14.9.0/packages/builders/src/interactions/slashCommands/SlashCommandBuilder.ts

import * as Discord from 'discord.js';
import { Mixin } from 'ts-mixer';
import { s } from '@sapphire/shapeshift';

const { name: pack_name } = require('../package.json');

/** Either a Builder or a function that returns a Builder. */
export type BuilderInput<T> = T | ((thing: T) => T);
/** The function called during command execution. */
export type Handler = (interaction: Discord.CommandInteraction) => unknown;
/** A string option with the length set internally. */
export type SlashCommandCustomOption = Omit<Discord.SlashCommandStringOption,
	'setMinLength' | 'setMaxLength'
>;

/** Mixin that adds builder support for our additional custom options. */
class MoreOptionsMixin extends Discord.SharedSlashCommandOptions {
	/**
	 * Adds an Application option.
	 *
	 * @param input Either a string builder or a function that returns a builder.
	 */
	addApplicationOption(input: BuilderInput<SlashCommandCustomOption>): this {
		const result = resolveBuilder(input, Discord.SlashCommandStringOption);

		// Discord Application ID length
		(result as Discord.SlashCommandStringOption)
			.setMinLength(18)
			.setMaxLength(20);

		return addThing(this, result, Discord.SlashCommandStringOption);
	}

	/**
	 * Adds an Emoji option. This appears as a string option that will accept
	 * a string containing an emoji ID, emoji name, or emoji literal.
	 *
	 * @param input Either a string builder or a function that returns a builder.
	 */
	addEmojiOption(input: BuilderInput<SlashCommandCustomOption>): this {
		const result = resolveBuilder(input, Discord.SlashCommandStringOption);

		// Emoji literals are 1 or more characters.
		// Emoji names are 1 to 32 characters.
		// Emoji IDs are somewhere in between, like 18 to 20.
		(result as Discord.SlashCommandStringOption)
			.setMinLength(1)
			.setMaxLength(32);

		return addThing(this, result, Discord.SlashCommandStringOption);
	}
}

/** Mixin that adds the ability to set and store a command handler function. */
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

/**
 * Discord.js builders are not designed to be grouped together in a collection.
 * This union represents any possible end value for an individual command's
 * builder.
 */
export type SlashCommandBuilderReturn =
	| SlashCommandBuilder
	| Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
	| SlashCommandSubcommandsOnlyBuilder;

type SlashCommandSubcommandsOnlyBuilder = Omit<SlashCommandBuilder,
	| Exclude<keyof Discord.SharedSlashCommandOptions, 'options'>
	| keyof MoreOptionsMixin
>;

// NOTE: it's important that Discord's built-ins are the last Mixin in the list!
// Otherwise, we run the risk of stepping on field initialization.

export class ContextMenuCommandBuilder extends Mixin(
	CommandHandlerMixin,
	Discord.ContextMenuCommandBuilder,
) {}

export class SlashCommandBuilder extends Mixin(
	CommandHandlerMixin,
	MoreOptionsMixin,
	Discord.SlashCommandBuilder,
) {
	// @ts-ignore We want to force this to only accept our version of the
	// builder with .setHandler.
	addSubcommand(
		input: BuilderInput<SlashCommandSubcommandBuilder>
	): SlashCommandSubcommandsOnlyBuilder {
		return addThing(this, input,
			SlashCommandSubcommandBuilder,
			Discord.SlashCommandSubcommandBuilder
		);
	}

	// @ts-ignore We want to force this to only accept our version of the
	// builder with .setHandler.
	addSubcommandGroup(
		input: BuilderInput<SlashCommandSubcommandGroupBuilder>
	): SlashCommandSubcommandsOnlyBuilder {
		return addThing(this, input,
			SlashCommandSubcommandGroupBuilder,
			Discord.SlashCommandSubcommandGroupBuilder,
		);
	}
}

export class SlashCommandSubcommandGroupBuilder extends Mixin(
	CommandHandlerMixin,
	Discord.SlashCommandSubcommandGroupBuilder,
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
	MoreOptionsMixin,
	CommandHandlerMixin,
	Discord.SlashCommandSubcommandBuilder,
) {}

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
	Parent?: new () => P,
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
	ParentInstanceOf?: new () => P,
): asserts input is T {
	if (!(input instanceof ExpectedInstanceOf)) {
		throw new Error(ParentInstanceOf && input instanceof ParentInstanceOf
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
