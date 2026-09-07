import QRCode from 'qrcode';

/**
 * QR codes for printed documents.
 *
 * The library's `toString` is promise-based, but the document builders are
 * synchronous all the way down and turning them async would ripple into every
 * caller for the sake of one decoration. `create` hands back the module matrix
 * synchronously, so the SVG is assembled here instead — a single path of
 * one-unit squares, scaled by the viewBox.
 *
 * SVG rather than a bitmap because expo-print rasterises at the printer's
 * resolution, so the code stays sharp at any size. The thermal printer uses
 * none of this: it draws its own QR from the text via ESC/POS, which sends far
 * less down a serial link.
 */

/**
 * Inline SVG markup for `value`, or an empty string if it cannot be encoded.
 *
 * Never throws — a bill that failed to print because of a decorative QR would
 * be a worse outcome than a bill without one.
 */
export const qrSvg = (value, { size = 120, quietZone = 2 } = {}) => {
  const data = String(value ?? '').trim();
  if (!data) return '';

  try {
    // Medium correction: a receipt gets folded and thumbed, and M recovers
    // roughly 15% damage without inflating the code the way H would.
    const { modules } = QRCode.create(data, { errorCorrectionLevel: 'M' });
    const count = modules.size;
    if (!count) return '';

    let path = '';
    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        if (modules.data[row * count + column]) {
          // One unit square per dark module; the viewBox does the scaling.
          path += `M${column + quietZone} ${row + quietZone}h1v1h-1z`;
        }
      }
    }
    if (!path) return '';

    // The quiet zone is part of the spec — scanners need the clear border to
    // find the code at all, so it is baked into the viewBox rather than left
    // to whatever margin the surrounding layout happens to have.
    const extent = count + quietZone * 2;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
      `viewBox="0 0 ${extent} ${extent}" shape-rendering="crispEdges">` +
      `<rect width="${extent}" height="${extent}" fill="#ffffff"/>` +
      `<path d="${path}" fill="#000000"/>` +
      `</svg>`
    );
  } catch {
    return '';
  }
};

export default qrSvg;
