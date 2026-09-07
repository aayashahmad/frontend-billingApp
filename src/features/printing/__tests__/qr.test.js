import { qrSvg } from '../qr';

describe('qrSvg', () => {
  it('produces scalable SVG markup for a UPI link', () => {
    const svg = qrSvg('upi://pay?pa=shop@ybl&pn=Shop&cu=INR&am=835.00');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('<path');
    // crispEdges keeps module boundaries hard when the printer scales it.
    expect(svg).toContain('shape-rendering="crispEdges"');
  });

  it('includes the quiet zone scanners need to find the code', () => {
    const svg = qrSvg('hello', { quietZone: 4 });
    const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const withoutZone = qrSvg('hello', { quietZone: 0 }).match(
      /viewBox="0 0 (\d+) (\d+)"/,
    );
    expect(Number(viewBox[1])).toBe(Number(withoutZone[1]) + 8);
  });

  it('honours the requested pixel size', () => {
    expect(qrSvg('hello', { size: 200 })).toContain('width="200"');
  });

  it('returns empty markup rather than throwing on nothing to encode', () => {
    expect(qrSvg('')).toBe('');
    expect(qrSvg(null)).toBe('');
    expect(qrSvg(undefined)).toBe('');
  });

  it('grows the module count as the payload grows', () => {
    const small = qrSvg('a').match(/viewBox="0 0 (\d+)/)[1];
    const large = qrSvg('x'.repeat(300)).match(/viewBox="0 0 (\d+)/)[1];
    expect(Number(large)).toBeGreaterThan(Number(small));
  });
});
