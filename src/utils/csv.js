/**
 * Minimal CSV reader for the product import.
 *
 * Handles quoted fields, escaped quotes and both line endings, because a file
 * exported from Excel or Google Sheets will contain all three — but stops
 * well short of a general CSV library, which would be far more code than a
 * three-column price list warrants.
 */
const splitLine = (line) => {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside quotes is a literal quote.
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }

  fields.push(field);
  return fields.map((value) => value.trim());
};

const HEADER_ALIASES = {
  barcode: ['barcode', 'ean', 'upc', 'code', 'gtin', 'sku'],
  name: ['name', 'item', 'product', 'item name', 'product name', 'description'],
  rate: ['rate', 'price', 'mrp', 'selling price', 'amount'],
};

/** Matches a header cell against the accepted names for each column. */
const columnFor = (heading) => {
  const cleaned = heading.toLowerCase().replace(/[_-]+/g, ' ').trim();
  return Object.keys(HEADER_ALIASES).find((key) =>
    HEADER_ALIASES[key].includes(cleaned),
  );
};

/**
 * Parses a product price list.
 *
 * Returns `{ rows, errors }` — a bad line is reported by its position in the
 * file and skipped, so one typo never costs the whole import.
 */
export const parseProductCsv = (text) => {
  const lines = String(text || '')
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return { rows: [], errors: ['The file is empty.'] };

  const heading = splitLine(lines[0]);
  const mapping = heading.map(columnFor);

  const hasHeader =
    mapping.includes('barcode') && mapping.includes('name') && mapping.includes('rate');

  // Without a recognisable header, fall back to the documented column order.
  const index = hasHeader
    ? {
        barcode: mapping.indexOf('barcode'),
        name: mapping.indexOf('name'),
        rate: mapping.indexOf('rate'),
      }
    : { barcode: 0, name: 1, rate: 2 };

  const body = hasHeader ? lines.slice(1) : lines;
  const rows = [];
  const errors = [];

  body.forEach((line, position) => {
    // Numbered against the file itself, so it matches the spreadsheet.
    const lineNumber = position + (hasHeader ? 2 : 1);
    const fields = splitLine(line);

    const barcode = (fields[index.barcode] || '').replace(/\s+/g, '');
    const name = fields[index.name] || '';
    const rawRate = (fields[index.rate] || '').replace(/[^\d.]/g, '');
    const rate = Number(rawRate);

    if (!barcode) {
      errors.push(`Line ${lineNumber}: no barcode.`);
      return;
    }
    if (!name.trim()) {
      errors.push(`Line ${lineNumber}: no name.`);
      return;
    }
    if (!rawRate || !Number.isFinite(rate) || rate <= 0) {
      errors.push(`Line ${lineNumber}: rate must be a number above zero.`);
      return;
    }

    rows.push({ barcode, name: name.trim(), rate });
  });

  return { rows, errors };
};

export default parseProductCsv;
