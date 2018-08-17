/**
 * Tests for the logda module.
 * @since 8/16/18
 * @file
 */

import { expect } from 'chai';
import log from '../src';

describe('/src', () => {
  it('Should export a Logda instance by default', () => {
    expect(log).to.be.an('object');
  });
});
