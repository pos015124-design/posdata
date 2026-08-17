/**
 * Export Service Tests
 * Tests PDF and Excel report generation functionality
 */

const ExportService = require('../services/exportService');
const AnalyticsService = require('../services/analyticsService');
const ExcelJS = require('exceljs');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

const OWNER_ID = new mongoose.Types.ObjectId();
let invoiceCounter = 0;
const nextInvoice = () => `INV-EXP-${Date.now()}-${invoiceCounter++}`;

describe('Export Service', () => {
  let testSales, testProducts, testCustomers, testExpenses;

  beforeEach(async () => {
    // Create test data
    testProducts = await Product.create([
      {
        userId: OWNER_ID,
        name: 'Export Test Product 1',
        code: 'ETP001',
        barcode: '1234567890123',
        price: 100,
        stock: 50,
        purchasePrice: 80,
        category: 'Electronics',
        supplier: 'Test Supplier 1',
        reorderPoint: 10,
        status: 'active'
      },
      {
        userId: OWNER_ID,
        name: 'Export Test Product 2',
        code: 'ETP002',
        barcode: '1234567890124',
        price: 200,
        stock: 30,
        purchasePrice: 150,
        category: 'Accessories',
        supplier: 'Test Supplier 2',
        reorderPoint: 5,
        status: 'active'
      }
    ]);

    testCustomers = await Customer.create([
      {
        name: 'Export Test Customer 1',
        email: 'customer1@export.test',
        userId: OWNER_ID
      },
      {
        name: 'Export Test Customer 2',
        email: 'customer2@export.test',
        userId: OWNER_ID
      }
    ]);

    // Create test sales
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    testSales = await Sale.create([
      {
        invoiceNumber: nextInvoice(),
        items: [
          {
            productId: testProducts[0]._id,
            productName: testProducts[0].name,
            quantity: 2,
            price: 100,
            total: 200
          }
        ],
        customerId: testCustomers[0]._id,
        subtotal: 200,
        total: 200,
        tax: 36,
        amountPaid: 200,
        change: 0,
        paymentMethod: 'cash',
        createdBy: OWNER_ID,
        createdAt: today
      },
      {
        invoiceNumber: nextInvoice(),
        items: [
          {
            productId: testProducts[1]._id,
            productName: testProducts[1].name,
            quantity: 1,
            price: 200,
            total: 200
          }
        ],
        customerId: testCustomers[1]._id,
        subtotal: 200,
        total: 200,
        tax: 36,
        amountPaid: 200,
        change: 0,
        paymentMethod: 'cash',
        createdBy: OWNER_ID,
        createdAt: yesterday
      }
    ]);

    // Create test expenses
    testExpenses = await Expense.create([
      {
        title: 'Office Supplies',
        amount: 50,
        category: 'Office Supplies',
        date: today,
        createdBy: OWNER_ID
      },
      {
        title: 'Utilities',
        amount: 100,
        category: 'Utilities',
        date: yesterday,
        createdBy: OWNER_ID
      }
    ]);
  });

  afterEach(async () => {
    await Sale.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Expense.deleteMany({});
  });

  describe('PDF Generation', () => {
    it('should generate PDF sales report', async () => {
      const filters = { dateRange: 'week' };
      const options = { includeCharts: true, format: 'standard', userId: OWNER_ID.toString() };

      const startTime = Date.now();
      const pdfBuffer = await ExportService.generateSalesPDF(filters, options);
      const generationTime = Date.now() - startTime;

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      expect(generationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify PDF header + EOF trailer
      const pdfHeader = pdfBuffer.toString('ascii', 0, 100);
      expect(pdfHeader).toContain('%PDF');
      const pdfTrailer = pdfBuffer.toString('ascii', -32);
      expect(pdfTrailer).toContain('%%EOF');
    });

    it('should generate PDF inventory report', async () => {
      const filters = { category: 'Electronics', userId: OWNER_ID.toString() };

      const startTime = Date.now();
      const pdfBuffer = await ExportService.generateInventoryPDF(filters);
      const generationTime = Date.now() - startTime;

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      expect(generationTime).toBeLessThan(10000);

      const pdfHeader = pdfBuffer.toString('ascii', 0, 100);
      expect(pdfHeader).toContain('%PDF');
    });

    it('should handle empty data gracefully in PDF', async () => {
      // Clear all test data
      await Sale.deleteMany({});
      await Product.deleteMany({});

      const filters = { dateRange: 'day', userId: OWNER_ID.toString() };
      const pdfBuffer = await ExportService.generateSalesPDF(filters);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Excel Generation', () => {
    it('should generate Excel sales report', async () => {
      const filters = { dateRange: 'week' };
      const options = { includeCharts: false, format: 'detailed', userId: OWNER_ID.toString() };

      const startTime = Date.now();
      const excelBuffer = await ExportService.generateSalesExcel(filters, options);
      const generationTime = Date.now() - startTime;

      expect(excelBuffer).toBeInstanceOf(Buffer);
      expect(excelBuffer.length).toBeGreaterThan(0);
      expect(generationTime).toBeLessThan(10000);

      // Verify Excel header (ZIP signature for XLSX)
      const excelHeader = excelBuffer.toString('hex', 0, 4);
      expect(excelHeader).toBe('504b0304'); // ZIP file signature
    });

    it('should create multiple worksheets in Excel', async () => {
      const filters = { dateRange: 'month', userId: OWNER_ID.toString() };
      const excelBuffer = await ExportService.generateSalesExcel(filters);

      expect(excelBuffer).toBeInstanceOf(Buffer);
      expect(excelBuffer.length).toBeGreaterThan(0);

      // Reopen with ExcelJS to verify actual worksheet names
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelBuffer);
      const sheetNames = workbook.worksheets.map(ws => ws.name);

      expect(sheetNames).toContain('Summary');
      expect(sheetNames).toContain('Daily Trends');
      expect(sheetNames).toContain('Top Products');
    });

    it('should carry the real brand as workbook creator', async () => {
      const filters = { dateRange: 'day', userId: OWNER_ID.toString() };
      const excelBuffer = await ExportService.generateSalesExcel(filters);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelBuffer);
      expect(workbook.creator).toBe('E-Shop by BHABY GROUP LTD');
    });

    it('should handle different date ranges', async () => {
      const dateRanges = ['day', 'week', 'month'];

      for (const dateRange of dateRanges) {
        const filters = { dateRange, userId: OWNER_ID.toString() };
        const excelBuffer = await ExportService.generateSalesExcel(filters);

        expect(excelBuffer).toBeInstanceOf(Buffer);
        expect(excelBuffer.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Data Isolation', () => {
    it('should only include the requesting user\'s sales in the report', async () => {
      // A sale belonging to ANOTHER seller — must NOT appear in this report
      await Sale.create({
        invoiceNumber: nextInvoice(),
        items: [{ productId: new mongoose.Types.ObjectId(), productName: 'Other Seller Item', quantity: 1, price: 99999, total: 99999 }],
        subtotal: 99999,
        total: 99999,
        paymentMethod: 'mobile',
        createdBy: new mongoose.Types.ObjectId(),
        createdAt: new Date()
      });

      const excelBuffer = await ExportService.generateSalesExcel(
        { dateRange: 'day' },
        { userId: OWNER_ID.toString() }
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelBuffer);
      const summarySheet = workbook.getWorksheet('Summary');
      // Summary data starts at row 6 (header), so Total Revenue = row 7
      const totalRevenueCell = summarySheet.getCell('B7').value;

      // dateRange 'day' only includes today's sale (200). The other seller's
      // 99999 must be excluded by the userId scoping.
      expect(Number(totalRevenueCell)).toBe(200);
    });
  });

  describe('Performance', () => {
    it('should generate reports within acceptable time limits', async () => {
      const tests = [
        { method: 'generateSalesPDF', filters: { dateRange: 'week' } },
        { method: 'generateSalesExcel', filters: { dateRange: 'week' } },
        { method: 'generateInventoryPDF', filters: { category: 'Electronics' } }
      ];

      for (const test of tests) {
        const startTime = Date.now();

        if (test.method === 'generateInventoryPDF') {
          await ExportService[test.method]({ ...test.filters, userId: OWNER_ID.toString() });
        } else {
          await ExportService[test.method](test.filters, { userId: OWNER_ID.toString() });
        }

        const generationTime = Date.now() - startTime;
        expect(generationTime).toBeLessThan(10000); // 10 seconds max
      }
    });

    it('should handle concurrent export requests', async () => {
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          ExportService.generateSalesPDF({ dateRange: 'day' }, { userId: OWNER_ID.toString() })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(buffer => {
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      });

      // Should complete all requests within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds for 5 concurrent requests
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid filters gracefully', async () => {
      const invalidFilters = {
        startDate: 'not-a-real-date',
        endDate: 'also-not-a-date',
        userId: OWNER_ID.toString()
      };

      // Must not throw — invalid dates simply fall back to the default window
      const pdfBuffer = await ExportService.generateSalesPDF(invalidFilters, { userId: OWNER_ID.toString() });
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should propagate analytics failures', async () => {
      // Simulate a failure inside the analytics layer (e.g. DB outage) without
      // destroying the shared test connection
      jest.spyOn(AnalyticsService, 'getSalesAnalytics').mockRejectedValueOnce(new Error('Database unavailable'));

      await expect(
        ExportService.generateSalesPDF({ dateRange: 'day' }, { userId: OWNER_ID.toString() })
      ).rejects.toThrow();
    });
  });
});
