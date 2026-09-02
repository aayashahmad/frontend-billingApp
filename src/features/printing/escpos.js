/**
 * ESC/POS receipt encoder.
 *
 * Written here rather than taken from a printer library on purpose: the
 * maintained options either speak BLE only or have a few hundred weekly
 * downloads, and a receipt is not something to hand to an unmaintained
 * dependency. The byte protocol is small and stable, and keeping it in plain
 * JavaScript means the layout can be unit-tested without a printer attached.
 *
 * Only the transport — pairing and writing bytes — needs a native module.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Characters per line, by paper width. Font A is 12 dots wide. */
export const PAPER_WIDTHS = Object.freeze({
  '58': { columns: 32, label: '58 mm (2 inch)' },
  '80': { columns: 48, label: '80 mm (3 inch)' },
});

export const DEFAULT_PAPER_WIDTH = '58';

export const columnsFor = (paperWidth) =>
  (PAPER_WIDTHS[String(paperWidth)] ?? PAPER_WIDTHS[DEFAULT_PAPER_WIDTH]).columns;

const ALIGN = { left: 0, center: 1, right: 2 };

/**
 * Accumulates the byte stream.
 *
 * Every method returns `this` so a receipt reads top-to-bottom in the order
 * it prints.
 */
export class EscPosBuilder {
  constructor(paperWidth = DEFAULT_PAPER_WIDTH) {
    this.columns = columnsFor(paperWidth);
    this.bytes = [];
  }

  raw(...values) {
    this.bytes.push(...values);
    return this;
  }

  /** Resets the printer to a known state — previous jobs can leave modes set. */
  init() {
    return this.raw(ESC, 0x40);
  }

  align(mode) {
    return this.raw(ESC, 0x61, ALIGN[mode] ?? ALIGN.left);
  }

  bold(on) {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }

  /** Double height and/or width, via the character-size register. */
  size({ width = 1, height = 1 } = {}) {
    const w = Math.min(Math.max(width, 1), 2) - 1;
    const h = Math.min(Math.max(height, 1), 2) - 1;
    return this.raw(GS, 0x21, (w << 4) | h);
  }

  /**
   * Latin-1, which covers the accented characters a shop name may contain.
   * The rupee sign is not in this code page, so callers use "Rs" instead —
   * printing a byte the printer cannot render produces a stray glyph.
   */
  text(value) {
    const string = String(value ?? '');
    for (let i = 0; i < string.length; i += 1) {
      const code = string.charCodeAt(i);
      this.bytes.push(code > 0xff ? 0x3f : code);
    }
    return this;
  }

  line(value = '') {
    return this.text(value).raw(LF);
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i += 1) this.bytes.push(LF);
    return this;
  }

  /** A full-width rule, e.g. `--------`. */
  rule(char = '-') {
    return this.line(char.repeat(this.columns));
  }

  /**
   * Label on the left, value hard against the right margin.
   *
   * When the two cannot fit on one line the label is truncated rather than
   * wrapped, so the figure — the part that matters — always stays aligned.
   */
  row(label, value) {
    const right = String(value ?? '');
    const room = this.columns - right.length;
    const left = String(label ?? '').slice(0, Math.max(room - 1, 0));
    const gap = Math.max(this.columns - left.length - right.length, 1);
    return this.line(left + ' '.repeat(gap) + right);
  }

  /**
   * A wrapped block of text, broken on spaces.
   *
   * Long item names are the normal case on a 32-column receipt, and breaking
   * mid-word makes them unreadable.
   */
  wrap(value, indent = 0) {
    const width = this.columns - indent;
    const words = String(value ?? '').split(/\s+/).filter(Boolean);
    let current = '';

    words.forEach((word) => {
      if (!current.length) {
        current = word;
      } else if (current.length + 1 + word.length <= width) {
        current += ` ${word}`;
      } else {
        this.line(' '.repeat(indent) + current);
        current = word;
      }
    });

    if (current.length) this.line(' '.repeat(indent) + current);
    // A word longer than the paper still has to go somewhere; the printer
    // wraps it itself rather than dropping it.
    return this;
  }

  /** Feeds clear of the tear bar, then cuts if the printer has a cutter. */
  cut() {
    return this.feed(4).raw(GS, 0x56, 0x42, 0x00);
  }

  toBytes() {
    return this.bytes;
  }

  /** Base64, which is how the bytes cross the native bridge. */
  toBase64() {
    let binary = '';
    this.bytes.forEach((byte) => {
      binary += String.fromCharCode(byte & 0xff);
    });
    return globalThis.btoa
      ? globalThis.btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  }
}

export default EscPosBuilder;
