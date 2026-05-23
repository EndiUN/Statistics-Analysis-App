/**
 * Unit tests for backend/controllers/uploadController.js
 *
 * Tests the upload pipeline: CSV/Excel parsing and the uploadDataset handler.
 * Mongoose (Scenario.create) is mocked, so no database is needed.
 */

const path = require('path');

// --- Mock Scenario model before requiring the controller ---
jest.mock('../models/Scenario', () => ({
  create: jest.fn(),
}));

const Scenario = require('../models/Scenario');
const { uploadDataset } = require('../controllers/uploadController');

// --- Helper: build a mock Express (req, res) pair ---
function buildReqRes(overrides = {}) {
  const req = {
    file: null,
    body: {},
    ...overrides,
  };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return { req, res };
}

/** Build a minimal multer-like file object from a Buffer. */
function buildFile(originalname, buffer) {
  return {
    originalname,
    buffer,
    mimetype: 'application/octet-stream',
    size: buffer.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// uploadDataset — validation
// ═══════════════════════════════════════════════════════════════════════════

describe('uploadDataset — input validation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 400 when no file is uploaded', async () => {
    const { req, res } = buildReqRes({ body: { name: 'Test', toolType: 'minitool2' } });
    await uploadDataset(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/No file uploaded/i);
  });

  test('returns 400 when name is missing', async () => {
    const csv = Buffer.from('before,after\n100,90');
    const { req, res } = buildReqRes({
      file: buildFile('data.csv', csv),
      body: { toolType: 'minitool2' },
    });
    await uploadDataset(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name is required/i);
  });

  test('returns 400 when name is only whitespace', async () => {
    const csv = Buffer.from('before,after\n100,90');
    const { req, res } = buildReqRes({
      file: buildFile('data.csv', csv),
      body: { name: '   ', toolType: 'minitool2' },
    });
    await uploadDataset(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name is required/i);
  });

  test('returns 400 when toolType is invalid', async () => {
    const csv = Buffer.from('before,after\n100,90');
    const { req, res } = buildReqRes({
      file: buildFile('data.csv', csv),
      body: { name: 'Test', toolType: 'unknown' },
    });
    await uploadDataset(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/toolType must be one of/i);
  });

  test('returns 400 for unsupported file extension', async () => {
    const { req, res } = buildReqRes({
      file: buildFile('data.txt', Buffer.from('hello')),
      body: { name: 'Test', toolType: 'minitool2' },
    });
    await uploadDataset(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Unsupported file format/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// uploadDataset — CSV parsing
// ═══════════════════════════════════════════════════════════════════════════

describe('uploadDataset — CSV parsing', () => {
  beforeEach(() => jest.clearAllMocks());

  test('parses a valid minitool2 CSV and saves the scenario', async () => {
    const csv = Buffer.from('before,after\n200,180\n210,190\n');
    Scenario.create.mockResolvedValue({
      _id: 'abc',
      name: 'Cholesterol Trial',
      toolType: 'minitool2',
      data: { dataBefore: [200, 210], dataAfter: [180, 190] },
    });

    const { req, res } = buildReqRes({
      file: buildFile('cholesterol.csv', csv),
      body: { name: 'Cholesterol Trial', toolType: 'minitool2' },
    });

    await uploadDataset(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Scenario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cholesterol Trial',
        toolType: 'minitool2',
        data: { dataBefore: [200, 210], dataAfter: [180, 190] },
      }),
    );
  });

  test('parses a valid minitool3 CSV and saves the scenario', async () => {
    const csv = Buffer.from('x,y\n1.5,2.5\n3,4\n');
    Scenario.create.mockResolvedValue({
      _id: 'xyz',
      name: 'Scatter',
      toolType: 'minitool3',
      data: { currentData: [{ x: 1.5, y: 2.5 }, { x: 3, y: 4 }] },
    });

    const { req, res } = buildReqRes({
      file: buildFile('scatter.csv', csv),
      body: { name: 'Scatter', toolType: 'minitool3' },
    });

    await uploadDataset(req, res);

    expect(res.statusCode).toBe(200);
    expect(Scenario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentData: [{ x: 1.5, y: 2.5 }, { x: 3, y: 4 }] },
      }),
    );
  });

  test('parses a valid minitool1 CSV and saves the scenario', async () => {
    const csv = Buffer.from('brand,lifespan\nDuracell,80\nEnergizer,100\n');
    Scenario.create.mockResolvedValue({
      _id: 'bat',
      name: 'Battery',
      toolType: 'minitool1',
      data: {
        bars: [{ brand: 'Duracell', lifespan: 80 }, { brand: 'Energizer', lifespan: 100 }],
        minLifespan: 80,
        maxLifespan: 100,
      },
    });

    const { req, res } = buildReqRes({
      file: buildFile('battery.csv', csv),
      body: { name: 'Battery', toolType: 'minitool1' },
    });

    await uploadDataset(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 when CSV data fails validation', async () => {
    // minitool2 columns present but wrong column names for minitool3
    const csv = Buffer.from('before,after\n100,90\n');
    const { req, res } = buildReqRes({
      file: buildFile('wrong.csv', csv),
      body: { name: 'Wrong', toolType: 'minitool3' },
    });

    await uploadDataset(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/validation failed/i);
  });

  test('returns 400 for malformed CSV with quote errors', async () => {
    // Unterminated quotes cause a "Quotes" type fatal error
    const csv = Buffer.from('before,after\n"100,90\n200,180\n');
    const { req, res } = buildReqRes({
      file: buildFile('bad.csv', csv),
      body: { name: 'Bad', toolType: 'minitool2' },
    });

    await uploadDataset(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/parsing failed/i);
  });

  test('trims whitespace from the scenario name', async () => {
    const csv = Buffer.from('before,after\n100,90\n');
    Scenario.create.mockResolvedValue({
      _id: 'trimmed',
      name: 'Trimmed Name',
      toolType: 'minitool2',
      data: { dataBefore: [100], dataAfter: [90] },
    });

    const { req, res } = buildReqRes({
      file: buildFile('data.csv', csv),
      body: { name: '  Trimmed Name  ', toolType: 'minitool2' },
    });

    await uploadDataset(req, res);

    expect(Scenario.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Trimmed Name' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// uploadDataset — Excel parsing
// ═══════════════════════════════════════════════════════════════════════════

describe('uploadDataset — Excel parsing', () => {
  beforeEach(() => jest.clearAllMocks());

  test('parses a valid .xlsx file and saves the scenario', async () => {
    // Build a minimal xlsx buffer using the xlsx library
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { before: 220, after: 200 },
      { before: 230, after: 210 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

    Scenario.create.mockResolvedValue({
      _id: 'xl1',
      name: 'Excel Test',
      toolType: 'minitool2',
      data: { dataBefore: [220, 230], dataAfter: [200, 210] },
    });

    const { req, res } = buildReqRes({
      file: buildFile('data.xlsx', buffer),
      body: { name: 'Excel Test', toolType: 'minitool2' },
    });

    await uploadDataset(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Scenario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { dataBefore: [220, 230], dataAfter: [200, 210] },
      }),
    );
  });

  test('parses .xls extension files', async () => {
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet([{ x: 10, y: 20 }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xls' }));

    Scenario.create.mockResolvedValue({
      _id: 'xl2',
      name: 'XLS',
      toolType: 'minitool3',
      data: { currentData: [{ x: 10, y: 20 }] },
    });

    const { req, res } = buildReqRes({
      file: buildFile('data.xls', buffer),
      body: { name: 'XLS', toolType: 'minitool3' },
    });

    await uploadDataset(req, res);

    expect(res.statusCode).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// uploadDataset — error handling
// ═══════════════════════════════════════════════════════════════════════════

describe('uploadDataset — error handling', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 500 when Scenario.create throws', async () => {
    const csv = Buffer.from('before,after\n100,90\n');
    Scenario.create.mockRejectedValue(new Error('DB connection lost'));

    const { req, res } = buildReqRes({
      file: buildFile('data.csv', csv),
      body: { name: 'Fail', toolType: 'minitool2' },
    });

    await uploadDataset(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/internal server error/i);
  });
});
