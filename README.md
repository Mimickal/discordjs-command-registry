# Discord.js Command Registry

<a href="LICENSE.md"><img align="right" alt="AGPL-3.0 Logo"
src="https://www.gnu.org/graphics/lgplv3-with-text-154x68.png">
</a>

This is a data structure that lets you define Discord.js slash commands,
register them with Discord's API, and route Discord.js Interaction events to
your handler for that command.

Currently Discord.js separates slash command creation into three different,
weirdly disjoined processes. They want you to:
1. [Define your commands with a builder](https://github.com/discordjs/builders/blob/main/docs/examples/Slash%20Command%20Builders.md),
which is only used to construct the data of an HTTP call.
1. [Deploy them with a separate HTTP PUT call](https://discordjs.guide/creating-your-bot/creating-commands.html#command-deployment-script),
which uses an entirely separate library that directly relies on the Discord API
1. [Set up a fairly complicated file structure for each command](https://github.com/discordjs/builders/blob/main/docs/examples/Slash%20Command%20Builders.md),
which still requires you to write your own router and juggle your own handlers

This library simplifies this process by letting you do this all in one place.

It also provides some bridging functionality to support additional option types:
- Application

## Usage

### Defining commands with the `SlashCommandRegistry`

This library adds a new builder `SlashCommandRegistry` that serves as the
entry point for defining all of your commands. Existing builders from
[@discordjs/builders](https://www.npmjs.com/package/@discordjs/builders)
still work as you expect, but there's a new function added to all of them:
`.setHandler(handler)`. The handler is a callback function that expects a
Discord.js `Interaction` instance. The `SlashCommandRegistry` will figure out
which handler to call based on the received `Interaction`.

```js
const {
    ApplicationCommandType,
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

### Registering commands with Discord

The `SlashCommandRegistry` can register commands with Discord's API with a
single function call.

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

Ok cool, but what if you need more control? You also can restrict this to
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

You can also store the `application_id` and `token` in the registry to avoid
repeating it:

```js
commands
    .setApplicationID('your bot client ID')
    .setToken('your bot token here');

commands.registerCommands({ commands: ['ping'] });
```

### Executing commands

You can pipe Discord.js interaction events directly into a
`SlashCommandRegistry`'s `execute()` method.

```js
const Discord = require('discord.js');
const { SlashCommandRegistry } = require('discord-command-registry');

const client = new Discord.Client({...});
const commands = new SlashCommandRegistry();
// Additional setup omitted for brevity...

client.on(Discord.Constants.Events.INTERACTION_CREATE, (interaction) => {
    commands.execute(interaction)
        .then(result => console.log('Command returned this', result))
        .catch(err => console.error('Command failed', err));
});
```

This library does not do anything with the `Interaction` object other than route
it to the appropriate handler function. It's up to you to extract relevant data
(such as options) from the `Interaction`.

### Which handler gets called?

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

### Additional option types

Discord (and Discord.js) does not currently support command options for things
like Applications. This library provides functions to approximate these
additional option types:

- `getApplication(interaction, option_name)`

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
        // Add your application option as a string option
        .addStringOption(option => option
            .setName('app')
            .setDescription('An application ID')
        )
        .setHandler(async (interaction) => {
            // Use this function to resolve that string option into an application.
            // NOTE this makes an HTTP call and so returns a promise.
            const app = await Options.getApplication(interaction, 'app');
            return interaction.reply(`Application name: ${app.name}`);
        });
    );
```

## Other stuff from `@discordjs/builders`

The Discord.js builders package [has a lot of neat
helper functions](https://discordjs.guide/popular-topics/builders.html). The
command registry passes all of these functions through, so they can be included
directly (preventing the need to add / import `@discordjs/builders`).

```js
const { bold, hyperlink, time } = require('discord-command-registry');
```

## Dependencies

This library is built using the following libraries. You will, of course, need
Node and Discord.js, but you don't need any of the others. This library
downloads these dependencies for you, and you interact with them through this
library.

- Node 16.6.0 (or above)
- [discord.js 13.x](https://discord.js.org/#/docs/main/13.3.1/general/welcome)
- [@discordjs/builders](https://www.npmjs.com/package/@discordjs/builders)
- [@discordjs/rest 0.1.0-canary.0](https://www.npmjs.com/package/@discordjs/rest)
- [discord-api-types v9](https://www.npmjs.com/package/discord-api-types)

## License

Copyright 2021 [Mimickal](https://github.com/Mimickal)

This code is licensed under the
[LGPL-3.0](https://www.gnu.org/licenses/lgpl-3.0-standalone.html) license.

Basically, you are free to use this library in your closed source projects, but
any modifications to this library must be made open source.

