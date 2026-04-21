/**
 * Export Routes for PDF and Excel Report Generation
 * Provides endpoints for generating and downloading reports
 */

const express = require('express');
const router = express.Router();
const { requireUser, checkPermission } = require('./middleware/auth');
const ExportService = require('../services/exportService');
const { logger } = require('../config/logger');
const rateLimit = require('express-rate-limit');

// Rate limiting for export endpoints (more restrictive due to resource intensity)
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 export requests per windowMs
  message: {
    error: 'Too many export requests',
    message: 'Please wait before requesting another export'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Generate and download PDF sales report
 */
router.get('/sales/pdf',
  requireUser,
  checkPermission('reports'),
  exportLimiter,
  async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        staff: req.query.staff,
        paymentMethod: req.query.paymentMethod,
        dateRange: req.query.dateRange
      };

      const options = {
        includeCharts: req.query.includeCharts === 'true',
        format: req.query.format || 'standard'
      };

      logger.info('Generating PDF sales report', {
        userId: req.user.userId,
        filters,
        options
      });

      const startTime = Date.now();
      const pdfBuffer = await ExportService.generateSalesPDF(filters, options);
      const generationTime = Date.now() - startTime;

      logger.info('PDF sales report generated successfully', {
        userId: req.user.userId,
        generationTime,
        bufferSize: pdfBuffer.length
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      logger.error('Failed to generate PDF sales report', {
        error: error.message,
        userId: req.user.userId,
        filters: req.query
      });

      res.status(500).json({
        error: 'Failed to generate PDF report',
        message: error.message
      });
    }
  }
);

/**
 * Generate and download Excel sales report
 */
router.get('/sales/excel',
  requireUser,
  checkPermission('reports'),
  exportLimiter,
  async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        staff: req.query.staff,
        paymentMethod: req.query.paymentMethod,
        dateRange: req.query.dateRange
      };

      const options = {
        includeCharts: req.query.includeCharts === 'true',
        format: req.query.format || 'detailed'
      };

      logger.info('Generating Excel sales report', {
        userId: req.user.userId,
        filters,
        options
      });

      const startTime = Date.now();
      const excelBuffer = await ExportService.generateSalesExcel(filters, options);
      const generationTime = Date.now() - startTime;

      logger.info('Excel sales report generated successfully', {
        userId: req.user.userId,
        generationTime,
        bufferSize: excelBuffer.length
      });

      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);

      res.send(excelBuffer);

    } catch (error) {
      logger.error('Failed to generate Excel sales report', {
        error: error.message,
        userId: req.user.userId,
        filters: req.query
      });

      res.status(500).json({
        error: 'Failed to generate Excel report',
        message: error.message
      });
    }
  }
);

/**
 * Generate and download PDF inventory report
 */
router.get('/inventory/pdf',
  requireUser,
  checkPermission('reports'),
  exportLimiter,
  async (req, res) => {
    try {
      const filters = {
        category: req.query.category,
        lowStockOnly: req.query.lowStockOnly === 'true'
      };

      logger.info('Generating PDF inventory report', {
        userId: req.user.userId,
        filters
      });

      const startTime = Date.now();
      const pdfBuffer = await ExportService.generateInventoryPDF(filters);
      const generationTime = Date.now() - startTime;

      logger.info('PDF inventory report generated successfully', {
        userId: req.user.userId,
        generationTime,
        bufferSize: pdfBuffer.length
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="inventory-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      logger.error('Failed to generate PDF inventory report', {
        error: error.message,
        userId: req.user.userId,
        filters: req.query
      });

      res.status(500).json({
        error: 'Failed to generate PDF inventory report',
        message: error.message
      });
    }
  }
);

/**
 * Get available export formats and options
 */
router.get('/formats',
  requireUser,
  checkPermission('reports'),
  async (req, res) => {
    try {
      const formats = {
        sales: {
          pdf: {
            name: 'PDF Sales Report',
            description: 'Professional formatted sales report with charts and summary',
            options: [
              { key: 'includeCharts', label: 'Include Charts', type: 'boolean', default: true },
              { key: 'format', label: 'Format', type: 'select', options: ['standard', 'detailed'], default: 'standard' }
            ]
          },
          excel: {
            name: 'Excel Sales Report',
            description: 'Detailed sales data in Excel format with multiple worksheets',
            options: [
              { key: 'includeCharts', label: 'Include Charts', type: 'boolean', default: false },
              { key: 'format', label: 'Format', type: 'select', options: ['summary', 'detailed'], default: 'detailed' }
            ]
          }
        },
        inventory: {
          pdf: {
            name: 'PDF Inventory Report',
            description: 'Inventory status report with stock levels and alerts',
            options: [
              { key: 'lowStockOnly', label: 'Low Stock Only', type: 'boolean', default: false }
            ]
          }
        },
        filters: {
          sales: [
            { key: 'dateRange', label: 'Date Range', type: 'select', options: ['day', 'week', 'month', 'custom'] },
            { key: 'startDate', label: 'Start Date', type: 'date', dependsOn: 'dateRange', value: 'custom' },
            { key: 'endDate', label: 'End Date', type: 'date', dependsOn: 'dateRange', value: 'custom' },
            { key: 'staff', label: 'Staff Member', type: 'select', source: 'staff' },
            { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['cash', 'credit', 'debit', 'mobile'] }
          ],
          inventory: [
            { key: 'category', label: 'Category', type: 'select', source: 'categories' },
            { key: 'lowStockOnly', label: 'Low Stock Only', type: 'boolean' }
          ]
        }
      };

      res.json({
        success: true,
        data: formats
      });

    } catch (error) {
      logger.error('Failed to get export formats', { error: error.message });
      res.status(500).json({
        error: 'Failed to fetch export formats',
        message: error.message
      });
    }
  }
);

/**
 * Get export history and statistics
 */
router.get('/history',
  requireUser,
  checkPermission('reports'),
  async (req, res) => {
    try {
      // In a real application, you would fetch this from a database
      // For now, return mock data
      const history = {
        recentExports: [
          {
            id: '1',
            type: 'sales',
            format: 'pdf',
            generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            generatedBy: req.user.userId,
            fileSize: '2.3 MB',
            downloadCount: 3
          },
          {
            id: '2',
            type: 'inventory',
            format: 'excel',
            generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            generatedBy: req.user.userId,
            fileSize: '1.8 MB',
            downloadCount: 1
          }
        ],
        statistics: {
          totalExports: 45,
          thisMonth: 12,
          mostPopularFormat: 'pdf',
          averageGenerationTime: '3.2s'
        }
      };

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      logger.error('Failed to get export history', { error: error.message });
      res.status(500).json({
        error: 'Failed to fetch export history',
        message: error.message
      });
    }
  }
);

module.exports = router;
