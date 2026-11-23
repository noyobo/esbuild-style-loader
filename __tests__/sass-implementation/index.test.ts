import { describe, expect, it, vi } from 'vitest';
import { getDefaultSassImplementation } from '../../src/sass-utils';

const { load, resolve } = vi.hoisted(() => {
  const resolve = vi.fn();
  return { load: Object.assign(vi.fn(), { resolve }), resolve };
});

vi.mock('node:module', () => ({ createRequire: () => load }));

function missingModule(name: string) {
  return Object.assign(new Error(`Cannot find module '${name}'`), { code: 'MODULE_NOT_FOUND' });
}

describe('Sass implementation selection', () => {
  it.each([
    ['sass', ['sass']],
    ['node-sass', ['sass', 'node-sass']],
    ['sass-embedded', ['sass', 'node-sass', 'sass-embedded']],
  ])('uses %s when it is the first installed implementation', (installed, lookups) => {
    const implementation = {};
    resolve.mockReset().mockImplementation((name) => {
      if (name !== installed) throw missingModule(name);
      return name;
    });
    load.mockReset().mockReturnValue(implementation);

    expect(getDefaultSassImplementation()).toBe(implementation);
    expect(resolve.mock.calls.map(([name]) => name)).toEqual(lookups);
    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith(installed);
  });

  it('surfaces the module resolution error when no Sass implementation is installed', () => {
    const error = missingModule('sass');
    resolve.mockReset().mockImplementation((name) => {
      throw missingModule(name);
    });
    load.mockReset().mockImplementation(() => {
      throw error;
    });

    expect(() => getDefaultSassImplementation()).toThrow(error);
    expect(load).toHaveBeenCalledWith('sass');
  });
});
