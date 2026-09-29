import { buildCustomerStatementCsv } from '../statementCsv';

const customer = { name: 'Ramesh', phone: '9876543210', total_unpaid: 400 };
const owner = { business_name: 'Sharma Stores' };

const bill = {
  id: 7,
  created_at: '2026-01-15T10:00:00Z',
  bill_total: 1000,
  amount_paid: 600,
  unbalance: 400,
  advance_applied: 0,
  payment_type: 'cash',
  items: [
    { item_name: 'Rice', qty: 2, rate: 400, line_total: 800 },
    { item_name: 'Dal', qty: 1, rate: 200, line_total: 200 },
  ],
};

const parse = (csv) => csv.split('\n').map((line) => line.split(','));

describe('buildCustomerStatementCsv', () => {
  it('writes one row per line item', () => {
    const csv = buildCustomerStatementCsv({ customer, bills: [bill], owner });
    expect(csv).toContain('Rice');
    expect(csv).toContain('Dal');
  });

  it('puts the bill totals on the first line only, so sums do not double', () => {
    const rows = parse(
      buildCustomerStatementCsv({ customer, bills: [bill], owner }),
    );
    const rice = rows.find((row) => row.includes('Rice'));
    const dal = rows.find((row) => row.includes('Dal'));

    // Bill total column carries the figure once.
    expect(rice).toContain('1000.00');
    expect(dal).not.toContain('1000.00');
  });

  it('writes money as bare numbers a spreadsheet can add up', () => {
    const csv = buildCustomerStatementCsv({ customer, bills: [bill], owner });
    expect(csv).not.toContain('₹');
    expect(csv).toContain('800.00');
  });

  it('escapes a comma in a name instead of shifting every column', () => {
    const csv = buildCustomerStatementCsv({
      customer: { name: 'Sharma, R', phone: '9876543210' },
      bills: [],
      owner,
    });
    expect(csv).toContain('"Sharma, R"');
  });

  it('escapes a quote by doubling it', () => {
    const csv = buildCustomerStatementCsv({
      customer: { name: 'Ram "Raja"', phone: '1' },
      bills: [],
      owner,
    });
    expect(csv).toContain('"Ram ""Raja"""');
  });

  it('includes payments received, which settle dues off the bills', () => {
    const csv = buildCustomerStatementCsv({
      customer,
      bills: [bill],
      payments: [
        {
          id: 3,
          created_at: '2026-01-20T10:00:00Z',
          amount: 400,
          applied_to_dues: 400,
          advance_added: 0,
          outstanding_after: 0,
          payment_type: 'cash',
        },
      ],
      owner,
    });
    expect(csv).toContain('PAYMENTS RECEIVED');
    expect(csv).toContain('400.00');
  });

  it('still produces a usable file for a customer with no bills', () => {
    const csv = buildCustomerStatementCsv({ customer, bills: [], owner });
    expect(csv).toContain('Sharma Stores');
    expect(csv).toContain('Ramesh');
    expect(csv).not.toContain('undefined');
  });

  it('names the shop and the customer in the header block', () => {
    const csv = buildCustomerStatementCsv({ customer, bills: [bill], owner });
    const [first] = csv.split('\n');
    expect(first).toContain('Sharma Stores');
    expect(csv).toContain('9876543210');
  });
});
