/*******************************************************************************
 * This file is part of discord-command-registry, a Discord.js slash command
 * library for Node.js
 * Copyright (C) 2021 Mimickal (Mia Moretti).
 *
 * discord-command-registry is free software under the GNU Lesser General Public
 * License v3.0. See LICENSE.md or
 * <https://www.gnu.org/licenses/lgpl-3.0.en.html> for more information.
 ******************************************************************************/
import { expect } from 'chai';

import { hyperlink, inlineCode, spoiler, time } from '../src';

describe('Utils forwarded', function() {

	it('spoiler', function() {
		expect(spoiler('this thing')).to.equal('||this thing||');
	});

	it('hyperlink', function() {
		expect(hyperlink('this thing', 'www.test.com')).to.equal(
			'[this thing](www.test.com)'
		);
	});

	it('inlineCode', function() {
		expect(inlineCode('this thing')).to.equal('`this thing`');
	});

	it('time', function() {
		const now = Date.now();
		expect(time(now)).to.equal(`<t:${now.valueOf()}>`);
	});
});
