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

## Usage

Coming soon!

## Dependencies

This library is built using the following libraries. You will, of course, need
Node and Discord.js, but you don't need any of the others. This library
downloads these dependencies for you, and you interact with them through this
library.

- Node 16.6.0 (or above)
- [discord.js 13.1.0](https://discord.js.org/#/docs/main/13.1.0/general/welcome)
- [@discordjs/builders 0.6.0](https://www.npmjs.com/package/@discordjs/builders)
- [discord-api-types v9](https://www.npmjs.com/package/discord-api-types)

## License

Copyright 2021 [Mimickal](https://github.com/Mimickal)

This code is licensed under the
[LGPL-3.0](https://www.gnu.org/licenses/lgpl-3.0-standalone.html) license.

Basically, you are free to use this library in your closed source projects, but
any modifications to this library must be made open source.

