#!/usr/bin/env node
/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
import { lstatSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Command } from 'commander';

const cliArgs = new Command()
	.description([
		"Registers a SlashCommandRegistry's commands with Discord's API.",
		'This only needs to be done once after commands are updated. Updating',
		'commands globally can take some time to propagate! For testing, use',
		'guild-specific commands (specify "guild").',
	].join(' '))
	.argument('<registry>',
		'Path to a JS (or TS) file whose default export is a SlashCommandRegistry.',
		(path) => require(resolve(path)),
	)
	.option('-a, --app <string>', 'The Discord bot application ID.')
	.option('-c, --config <path>',
		'Load other options from JSON config file.\n' +
		'Keys match names of options for this script.',
		(path) => {
			const config = require(resolve(path));
			const extras = Object.keys(config).filter(
				key => !['app', 'guild', 'token'].includes(key)
			);
			if (extras.length > 0) {
				console.info('Ignoring extra config values:', extras.join(', '));
			}
			return config;
		},
	)
	.option('-g, --guild <string>', 'A Discord guild ID.')
	.option('-n, --names <string...>', 'Only register these commands.')
	.option('-t, --token <string|path>',
		'Path to a token file OR a raw token string.\n' +
		'ALERT: Using a file is highly recommended to avoid printing token in your shell history!',
		(value) => {
			const stat = lstatSync(value, {throwIfNoEntry: false});
			return stat?.isFile()
				? readFileSync(resolve(value)).toString()
				: value;
		},
	)
	.parse(process.argv);

const registry = cliArgs.processedArgs[0];

const application_id = (
	cliArgs.getOptionValue('app') ??
	cliArgs.getOptionValue('config')?.app ??
	registry.application_id
);
const guild = (
	cliArgs.getOptionValue('guild') ??
	cliArgs.getOptionValue('config')?.guild ??
	registry.guild_id
);

if (!application_id) {
	console.error('Error: Could not determine Application ID! Specify via config or CLI option.');
	process.exit(1);
}

console.info([
	`Registering commands for application '${application_id}' `,
	guild ? `in guild '${guild}'` : 'GLOBALLY',
	'...',
].join(''));

registry.registerCommands({
	application_id,
	guild,
	token: (
		cliArgs.getOptionValue('token') ??
		cliArgs.getOptionValue('config')?.token
	),
	commands: cliArgs.getOptionValue('names'),
}).then((data: unknown) => {
	console.debug(data);
	console.debug();
	console.info('Registration successful!', guild
		? `Commands in Guild '${guild}' should be available immediately.`
		: 'Commands may take some time to globally propagate.'
	);

}).catch((err: Error) => {
	console.error('Error registering commands!\n\n', err);
	process.exit(1);
});
