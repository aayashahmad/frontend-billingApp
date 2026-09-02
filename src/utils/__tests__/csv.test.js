import { parseProductCsv } from '../csv';

describe('parseProductCsv', () => {
  it('reads a headered file', () => {
    const { rows, errors } = parseProductCsv(
      'barcode,name,rate\n8901491101813,Lays Cream & Onion,20\n8901725004330,Parle-G,10',
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { barcode: '8901491101813', name: 'Lays Cream & Onion', rate: 20 },
      { barcode: '8901725004330', name: 'Parle-G', rate: 10 },
    ]);
  });

  it('accepts the aliases a spreadsheet export uses', () => {
    const { rows } = parseProductCsv('EAN,Product Name,MRP\n123,Soap,33');
    expect(rows).toEqual([{ barcode: '123', name: 'Soap', rate: 33 }]);
  });

  it('reorders to match the header', () => {
    const { rows } = parseProductCsv('price,name,barcode\n15,Biscuit,999');
    expect(rows).toEqual([{ barcode: '999', name: 'Biscuit', rate: 15 }]);
  });

  it('falls back to column order when there is no header', () => {
    const { rows } = parseProductCsv('123,Soap,33');
    expect(rows).toEqual([{ barcode: '123', name: 'Soap', rate: 33 }]);
  });

  it('handles quoted fields containing commas', () => {
    const { rows } = parseProductCsv('barcode,name,rate\n123,"Rice, Basmati 5kg",550');
    expect(rows[0].name).toBe('Rice, Basmati 5kg');
  });

  it('handles escaped quotes', () => {
    const { rows } = parseProductCsv('barcode,name,rate\n123,"Milk ""Full Cream""",60');
    expect(rows[0].name).toBe('Milk "Full Cream"');
  });

  it('strips currency symbols from the rate', () => {
    const { rows } = parseProductCsv('barcode,name,rate\n123,Soap,₹ 33.50');
    expect(rows[0].rate).toBe(33.5);
  });

  it('handles CRLF line endings', () => {
    const { rows } = parseProductCsv('barcode,name,rate\r\n123,Soap,33\r\n456,Oil,120');
    expect(rows).toHaveLength(2);
  });

  it('reports bad lines by file position and keeps the good ones', () => {
    const { rows, errors } = parseProductCsv(
      'barcode,name,rate\n123,Soap,33\n,Missing barcode,10\n456,,20\n789,Oil,abc\n999,Rice,550',
    );
    expect(rows.map((r) => r.barcode)).toEqual(['123', '999']);
    expect(errors).toEqual([
      'Line 3: no barcode.',
      'Line 4: no name.',
      'Line 5: rate must be a number above zero.',
    ]);
  });

  it('rejects a zero or negative rate', () => {
    const { rows, errors } = parseProductCsv('barcode,name,rate\n123,Soap,0');
    expect(rows).toEqual([]);
    expect(errors[0]).toContain('above zero');
  });

  it('reports an empty file', () => {
    expect(parseProductCsv('').errors).toEqual(['The file is empty.']);
    expect(parseProductCsv('   \n  ').errors).toEqual(['The file is empty.']);
  });

  it('ignores blank lines between rows', () => {
    const { rows } = parseProductCsv('barcode,name,rate\n123,Soap,33\n\n456,Oil,120\n');
    expect(rows).toHaveLength(2);
  });
});
