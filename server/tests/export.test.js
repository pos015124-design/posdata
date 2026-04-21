/**
 * Export Service Tests
 * Tests PDF and Excel report generation functionality
 */

const ExportService = require('../services/exportService');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

describe('Export Service', () => {
  let testSales, testProducts, testCustomers, testExpenses;

  beforeEach(async () => {
    // Create test data
    testProducts = await Product.create([
      {
        name: 'Export Test Product 1',
        code: 'ETP001',
        barcode: '1234567890123',
        price: 100,
        stock: 50,
        purchasePrice: 80,
        category: 'Electronics',
        supplier: 'Test Supplier 1',
        reorderPoint: 10
      },
      {
        name: 'Export Test Product 2',
        code: 'ETP002',
        barcode: '1234567890124',
        price: 200,
        stock: 30,
        purchasePrice: 150,
        category: 'Accessories',
        supplier: 'Test Supplier 2',
        reorderPoint: 5
      }
    ]);

    testCustomers = await Customer.create([
      {
        name: 'Export Test Customer 1',
        type: 'cash',
        email: 'customer1@export.test'
      },
      {
        name: 'Export Test Customer 2',
        type: 'credit',
        email: 'customer2@export.test',
        creditLimit: 1000
      }
    ]);

    // Create test sales
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    testSales = await Sale.create([
      {
        items: [
          {
            product: testProducts[0]._id,
            name: testProducts[0].name,
            quantity: 2,
            price: 100,
            total: 200
          }
        ],
        customer: testCustomers[0]._id,
        subtotal: 200,
        total: 200,
        tax: 36,
        taxRate: 18,
        amountPaid: 200,
        change: 0,
        paymentMethod: 'cash',
        staff: new mongoose.Types.ObjectId(),
        createdAt: today
      },
      {
        items: [
          {
            product: testProducts[1]._id,
            name: testProducts[1].name,
            quantity: 1,
            price: 200,
            total: 200
          }
        ],
        customer: testCustomers[1]._id,
        subtotal: 200,
        total: 200,
        tax: 36,
        taxRate: 18,
        amountPaid: 200,
        change: 0,
        paymentMethod: 'credit',
        staff: new mongoose.Types.ObjectId(),
        createdAt: yesterday
      }
    ]);

    // Create test expenses
    testExpenses = await Expense.create([
      {
        description: 'Export Test Expense 1',
        amount: 50,
        category: 'Office Supplies',
        date: today,
        staff: new mongoose.Types.ObjectId()
      },
      {
        description: 'Export Test Expense 2',
        amount: 100,
        category: 'Utilities',
        date: yesterday,
        staff: new mongoose.Types.ObjectId()
      }
    ]);
  });

  describe('PDF Generation', () => {
    it('should generate PDF sales report', async () => {
      const filters = { dateRange: 'week' };
      const options = { includeCharts: true, format: 'standard' };

      const startTime = Date.now();
      const pdfBuffer = await ExportService.generateSalesPDF(filters, options);
      const generationTime = Date.now() - startTime;

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      expect(generationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 100);
      expect(pdfHeader).toContain('%PDF');
    });

    it('should generate PDF inventory report', async () => {
      const filters = { category: 'Electronics' };

      const startTime = Date.now();
      const pdfBuffer = await ExportService.generateInventoryPDF(filters);
      const generationTime = Date.now() - startTime;

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      expect(generationTime).toBeLessThan(10000);

      // Verify PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 100);
      expect(pdfHeader).toContain('%PDF');
    });

    it('should handle empty data gracefully in PDF', async () => {
      // Clear all test data
      await Sale.deleteMany({});
      await Product.deleteMany({});

      const filters = { dateRange: 'day' };
      const pdfBuffer = await ExportService.generateSalesPDF(filters);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Excel Generation', () => {
    it('should generate Excel sales report', async () => {
      const filters = { dateRange: 'week' };
      const options = { includeCharts: false, format: 'detailed' };

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
      const filters = { dateRange: 'month' };
      const excelBuffer = await ExportService.generateSalesExcel(filters);

      expect(excelBuffer).toBeInstanceOf(Buffer);
      expect(excelBuffer.length).toBeGreaterThan(0);

      // The buffer should contain worksheet references
      const bufferString = excelBuffer.toString();
      expect(bufferString).toContain('Summary');
      expect(bufferString).toContain('Daily Trends');
      expect(bufferString).toContain('Top Products');
    });

    it('should handle different date ranges', async () => {
      const dateRanges = ['day', 'week', 'month'];
      
      for (const dateRange of dateRanges) {
        const filters = { dateRange };
        const excelBuffer = await ExportService.generateSalesExcel(filters);
        
        expect(excelBuffer).toBeInstanceOf(Buffer);
        expect(excelBuffer.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance', () => {
    it('should generate reports within acceptable time limits', async () => {
      const tests = [
        { method: 'generateSalesPDF', filters: { dateRange: 'week' } },
        { method: 'generateSalesExcel', filters: { dateRange: 'week' } },
        { method: 'generateInventoryPDF', filters: {} }
      ];

      for (const test of tests) {
        const startTime = Date.now();
        
        if (test.method === 'generateInventoryPDF') {
          await ExportService[test.method](test.filters);
        } else {
          await ExportService[test.method](test.filters, {});
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
          ExportService.generateSalesPDF({ dateRange: 'day' }, {})
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
        startDate: 'invalid-date',
        endDate: 'invalid-date'
      };

      await expect(
        ExportService.generateSalesPDF(invalidFilters)
      ).rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      // Temporarily close database connection
      await mongoose.connection.close();

      await expect(
        ExportService.generateSalesPDF({ dateRange: 'day' })
      ).rejects.toThrow();

      // Reconnect for other tests
      await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/dukani_test');
    });
  });

  describe('Data Formatting', () => {
    it('should format currency values correctly in PDF', async () => {
      const filters = { dateRange: 'day' };
      const pdfBuffer = await ExportService.generateSalesPDF(filters);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      
      // Check that the PDF contains properly formatted currency
      const pdfText = pdfBuffer.toString();
      expect(pdfText).toMatch(/\$[\d,]+\.?\d*/); // Currency format pattern
    });

    it('should include all required sections in reports', async () => {
      const filters = { dateRange: 'week' };
      
      // Test PDF sections
      const pdfBuffer = await ExportService.generateSalesPDF(filters);
      const pdfText = pdfBuffer.toString();
      
      expect(pdfText).toContain('DUKANI RETAIL SYSTEM');
      expect(pdfText).toContain('Sales Report');
      expect(pdfText).toContain('Sales Summary');
      
      // Test Excel sections
      const excelBuffer = await ExportService.generateSalesExcel(filters);
      const excelText = excelBuffer.toString();
      
      expect(excelText).toContain('Summary');
      expect(excelText).toContain('Daily Trends');
      expect(excelText).toContain('Top Products');
    });
  });
});
