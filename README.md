# Discord.js Command Registry

<a href="LICENSE.md"><img align="right" alt="LGPL-3.0 Logo"
src="https://www.gnu.org/graphics/lgplv3-with-text-154x68.png">
</a>

_Now with 100% more TypeScript!_

_**Updates:**_
- _**Version 3.x of this library no longer forwards vanilla builder
utilities. See [Helpers](#helpers).**_
- _**Version 2.2.0 of this library added TypeScript support. This version can
still be used with JavaScript without issues.**_
- _**Version 2.x of this library supports discord.js v14. If you still need
v13 support, use an older 1.x version of this library.**_

## What is this?

Discord.js Command Registry is a data structure that lets you define Discord.js
slash commands, register them with Discord's API, and route Discord.js
Interaction events to your handler for that command.

## Why should I use this?

Currently Discord.js separates slash command creation into three different,
weirdly disjoined processes. They want you to:
1. [Define your commands with a builder](https://github.com/discordjs/discord.js/tree/main/packages/builders),
which is only used to construct the data of an HTTP call.
1. [Deploy them with a separate HTTP PUT call](https://discordjs.guide/creating-your-bot/command-deployment.html#guild-commands),
which uses an entirely separate library that directly relies on the Discord API
1. [Set up a fairly complicated file structure for each command](https://discordjs.guide/creating-your-bot/slash-commands.html),
which still requires you to write your own router and juggle your own handlers

This library simplifies this process by letting you do this all in one place.
You can:
1. [Define your commands using builders](#defining-commands-with-the-slashcommandregistry)
2. [Register your commands directly from the builder](#registering-commands-with-discord)
3. [Execute handlers for your interactions directly from the builder](#executing-commands)

It also supports some additional "option" types
- Application
- Emoji

# Usage

## Defining commands with the `SlashCommandRegistry`

This library adds a new builder `SlashCommandRegistry` that serves as the
entry point for defining all of your commands. Existing builders from
[`@discordjs/builders`](https://www.npmjs.com/package/@discordjs/builders)
still work as you expect, but there's a new function added to all of them:
`.setHandler(handler)`. The handler is a callback function that expects a
Discord.js `Interaction` instance. The `SlashCommandRegistry` will figure out
which handler to call based on the received `Interaction`.

```js
const { ApplicationCommandType } = require('discord.js');
const {
    SlashCommandRegistry,
    // Can also import these directly, but you don't need them
    // ContextMenuCommandBuilder,
    // SlashCommandBuilder,
    // SlashCommandSubcommandBuilder,
    // SlashCommandSubcommandGroupBuilder,
} = require('discord-command-registry');

const commands = new SlashCommandRegistry()
    .addDefaultHandler(interaction => interaction.reply("I can't do this yet"))
    .addCommand(command => command
        .setName('ping')
        .setDescription('Ping pong command')
        .setHandler(interaction => interaction.reply('pong'))
    )
    .addCommand(command => command
        .setName('info')
        .setDescription('Gets some info on something')
        .addSubCommand(sub => sub
            .setName('all')
            .setDescription('Gets all the info ever created')
            .setHandler(interaction => interaction.reply('All things'))
        )
        .addSubcommand(sub => sub
            .setname('user')
            .setDescription('Gets info for a user')
            .addUserOption(opt => opt
                .setName('user')
                .setDescription('The user whose info to list')
                .setHandler(interaction => interaction.reply('User info'))
            )
        )
    )
    .addContextMenuCommand(command => command
        .setName('select')
        .setType(ApplicationCommandType.Message)
        .setHandler(interaction => interaction.reply('selected a message'))
    );
```

## Registering commands with Discord

This library gives you a lot of flexibility with registration.

### Using the script

If you put your `SlashCommandRegistry` in its own file and make it the default
export, you can use the script included with this library.

```js
// src/commands.js
// Define your SlashCommandRegistry as the default export in its own file.
const commands = new SlashCommandRegistry();
module.exports = commands;
```

```sh
# If your app ID and token are set in commands.js:
npx register src/commands.js

# If your app ID and token are defined in a config file:
# NOTE: don't forget the -- to pass args to the script!
npx register src/commands.js -- --config path/to/my/config.json

# If you want to pass app ID and token in directly:
# You can provide token as a string or a file, but you should prefer files to
# avoid printing your token in your shell.
npx register src/commands.js -- --app 1234 --token path/to/token_file
npx register src/commands.js -- --app 1234 --token "my token text"
```

### Using the script with TypeScript

If you're using TypeScript and aren't transpiling to JavaScript (e.g. running
your bot with `ts-node`), you can still use this script. This library ships
with a separate, stand-alone TypeScript version of this register script.

Like the JavaScript version, put your `SlashCommandRegistry` in its own file
and make it the default export:

```ts
// src/commands.ts
// Define your SlashCommandRegistry as the default export in its own file.
const commands = new SlashCommandRegistry();
export default commands;
```

Then you can run the register script from `node_modules` like this:
```sh
npx ts-node --esm --skipIgnore --logError --compilerOptions '{"esModuleInterop":true,"resolveJsonModule":true}' node_modules/discord-command-registry/src/register.ts
```

If you'd rather remove all the `ts-node` flags, you can also specify these
options in your `tsconfig.json`, like this:
```json
{
    "ts-node": {
        "esm": true,
        "skipIgnore": true,
        "logError": true,
        "compilerOptions": {
            "esModuleInterop": true,
            "resolveJsonModule": true,
        }
    }
}
```

### `--config` JSON format

You can provide registration configuration from a JSON file instead of
specifying individual flags. The following fields are supported:

```json
{
    "token": "<your Discord bot token>",
    "app": "<Discord bot application ID>",
    "guild": "<ID of Discord guild to register commands in>"
}
```

### Using `SlashCommandRegistry.registerCommands()`

If you want more control over registration, the `SlashCommandRegistry` can
register commands with Discord's API with a single function call.

```js
commands.registerCommands({
    application_id: 'your bot client ID',
    token: 'your bot token here',
    guild: 'a guild ID', // If provided, commands are registered for this guild.
                         // If omitted, commands are registered globally.
})
.then(res => console.log('Successfully registered', res))
.catch(err => console.error('Something went wrong', err));
```

Ok cool, but what if you need even more control? You also can restrict this to
register only a subset of commands.

```js
await commands.registerCommands({
    application_id: 'your bot client ID',
    token: 'your bot token here',
    commands: ['ping'],
});
await commands.registerCommands({
    application_id: 'your bot client ID',
    token: 'your bot token here',
    guild: 'some guild ID',
    commands: ['info']
});
```

You can also store the `application_id`, `guild_id`, and `token` in the
registry to avoid repeating it:

```js
commands
    .setApplicationID('your bot client ID')
    .setGuildId('your guild ID')
    .setToken('your bot token here');

commands.registerCommands({ commands: ['ping'] });
```

## Executing commands

You can pipe Discord.js interaction events directly into a
`SlashCommandRegistry`'s `execute()` method.

```js
const Discord = require('discord.js');
const { SlashCommandRegistry } = require('discord-command-registry');

const client = new Discord.Client({...});
const commands = new SlashCommandRegistry();
// Additional setup omitted for brevity...

client.on(Discord.Events.InteractionCreate, (interaction) => {
    commands.execute(interaction)
        .then(result => console.log('Command returned this', result))
        .catch(err => console.error('Command failed', err));
});
```

This library does not do anything with the `Interaction` object other than route
it to the appropriate handler function. It's up to you to extract relevant data
(such as options) from the `Interaction`.

## Which handler gets called?

I added a handler to a subcommand, the group that subcommand belongs to, the
command that group belongs to, and to the registry itself. Which one actually
gets used when I execute an interaction?

The `SlashCommandRegistry` picks the **most specific** handler it can find,
according to this priority list:

1. Subcommand
1. Subcommand Group
1. Top-level Command
1. Registry's default

In other words, if your command and subcommand both have a handler, only the
subcommand's handler will be called. Using a lower-priority handler can give you
some flexibility if you have many commands that all use similar code.

## Additional option types

Discord (and Discord.js) does not currently support command options for things
like Applications. This library provides builders and functions to approximate
these additional option types:

(Note: these are registered as string options under the hood)

- New types
  - `SlashCommandCustomOption`
- New builder options
  - `addApplicationOption(custom_option)`
  - `addEmojiOption(custom_option)`
- Option resolvers (via `Options.getX`)
  - `getApplication(interaction, option_name, required=false)`
  - `getEmoji(interaction, option_name, required=false)`

To use these, register the option using the appropriate custom builder, then
use the `Options.getX(...)` helpers to retrieve the value.

For example, this is a functional example of an Application option:

```js
const {
    Options,
    SlashCommandRegistry,
} = require('discord-command-registry');

const commands = new SlashCommandRegistry()
    .addCommand(command => command
        .addName('mycmd')
        .addDescription('Example command that has an application option')
        // New function this library adds. Uses string options under the hood.
        .addApplicationOption(option => option
            .setName('app')
            .setDescription('An application ID')
        )
        .setHandler(async (interaction) => {
            // Use this function to resolve that option into an application.
            // NOTE this makes an HTTP call and so returns a promise.
            const app = await Options.getApplication(interaction, 'app');
            return interaction.reply(`Application name: ${app.name}`);
        });
    );
```

## Helpers

We no longer export `@discordjs/builders` helper functions like `bold` and
`hyperlink`. Originally, `@discordjs/builders` was a separate package, so
forwarding its functions saved developers from needing to add it directly.
These functions have since been integrated into the parent `discord.js` package,
so our export is no longer necessary. Just import them directly from
`discord.js` instead.

# License

Copyright 2021 [Mimickal](https://github.com/Mimickal)

This code is licensed under the
[LGPL-3.0](https://www.gnu.org/licenses/lgpl-3.0-standalone.html) license.

Basically, you are free to use this library in your closed source projects, but
any modifications to this library must be made open source.

