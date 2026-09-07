const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

/**
 * Every source file must parse.
 *
 * Jest only compiles what a test imports, so a syntax error in a screen no
 * test touches passes the suite and then fails at runtime as a blank app —
 * which is exactly how two broken imports reached the emulator. This walks
 * the whole tree instead.
 */
const collect = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });

const sources = collect(path.join(__dirname, '..'));

describe('every source file compiles', () => {
  it('finds the source tree', () => {
    expect(sources.length).toBeGreaterThan(50);
  });

  it.each(sources.map((file) => [path.relative(process.cwd(), file), file]))(
    '%s',
    (_label, file) => {
      expect(() =>
        babel.transformFileSync(file, { presets: ['babel-preset-expo'] }),
      ).not.toThrow();
    },
  );
});
