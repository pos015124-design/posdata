/**
 * Export Service for PDF and Excel Report Generation
 * Provides professional formatted reports with charts and branding
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');
const AnalyticsService = require('./analyticsService');

class ExportService {
  
  /**
   * Generate PDF sales report
   * @param {Object} filters - Report filters
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async generateSalesPDF(filters = {}, options = {}) {
    try {
      const analytics = await AnalyticsService.getSalesAnalytics(filters);
      
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Sales Report',
          Author: 'Dukani System',
          Subject: 'Sales Analytics Report',
          Creator: 'Dukani Retail Management System'
        }
      });

      // Add company header
      this.addPDFHeader(doc, 'Sales Report', filters);
      
      // Add summary section
      this.addSalesSummaryToPDF(doc, analytics.summary);
      
      // Add charts section (simplified for now)
      this.addSalesChartsToPDF(doc, analytics);
      
      // Add detailed tables
      this.addSalesTablesToPDF(doc, analytics);
      
      // Add footer
      this.addPDFFooter(doc);
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      });

    } catch (error) {
      logger.error('Failed to generate PDF sales report', { error: error.message });
      throw new Error('PDF generation failed');
    }
  }

  /**
   * Generate Excel sales report
   * @param {Object} filters - Report filters
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} Excel buffer
   */
  static async generateSalesExcel(filters = {}, options = {}) {
    try {
      const analytics = await AnalyticsService.getSalesAnalytics(filters);
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Dukani System';
      workbook.created = new Date();
      
      // Summary worksheet
      const summarySheet = workbook.addWorksheet('Summary', {
        pageSetup: { paperSize: 9, orientation: 'portrait' }
      });
      
      this.addSalesSummaryToExcel(summarySheet, analytics.summary, filters);
      
      // Daily trend worksheet
      const trendSheet = workbook.addWorksheet('Daily Trends');
      this.addDailyTrendToExcel(trendSheet, analytics.dailyTrend);
      
      // Top products worksheet
      const productsSheet = workbook.addWorksheet('Top Products');
      this.addTopProductsToExcel(productsSheet, analytics.topProducts);
      
      // Staff performance worksheet
      const staffSheet = workbook.addWorksheet('Staff Performance');
      this.addStaffPerformanceToExcel(staffSheet, analytics.staffPerformance);
      
      // Payment methods worksheet
      const paymentSheet = workbook.addWorksheet('Payment Methods');
      this.addPaymentMethodsToExcel(paymentSheet, analytics.paymentMethods);
      
      return await workbook.xlsx.writeBuffer();

    } catch (error) {
      logger.error('Failed to generate Excel sales report', { error: error.message });
      throw new Error('Excel generation failed');
    }
  }

  /**
   * Generate inventory PDF report
   * @param {Object} filters - Report filters
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async generateInventoryPDF(filters = {}) {
    try {
      const analytics = await AnalyticsService.getInventoryAnalytics(filters);
      
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Inventory Report',
          Author: 'Dukani System',
          Subject: 'Inventory Analytics Report'
        }
      });

      this.addPDFHeader(doc, 'Inventory Report', filters);
      this.addInventorySummaryToPDF(doc, analytics.stockOverview);
      this.addInventoryTablesToPDF(doc, analytics);
      this.addPDFFooter(doc);
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      });

    } catch (error) {
      logger.error('Failed to generate PDF inventory report', { error: error.message });
      throw new Error('PDF generation failed');
    }
  }

  /**
   * Add PDF header with company branding
   * @param {PDFDocument} doc - PDF document
   * @param {string} title - Report title
   * @param {Object} filters - Report filters
   */
  static addPDFHeader(doc, title, filters = {}) {
    // Company header
    doc.fontSize(20)
       .fillColor('#2563eb')
       .text('DUKANI RETAIL SYSTEM', 50, 50);
    
    doc.fontSize(16)
       .fillColor('#1f2937')
       .text(title, 50, 80);
    
    // Report metadata
    doc.fontSize(10)
       .fillColor('#6b7280')
       .text(`Generated: ${new Date().toLocaleString()}`, 50, 110);
    
    if (filters.startDate && filters.endDate) {
      doc.text(`Period: ${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`, 50, 125);
    }
    
    // Add line separator
    doc.moveTo(50, 150)
       .lineTo(545, 150)
       .strokeColor('#e5e7eb')
       .stroke();
  }

  /**
   * Add sales summary section to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Object} summary - Sales summary data
   */
  static addSalesSummaryToPDF(doc, summary) {
    let yPosition = 170;
    
    doc.fontSize(14)
       .fillColor('#1f2937')
       .text('Sales Summary', 50, yPosition);
    
    yPosition += 30;
    
    const summaryData = [
      ['Total Revenue', `$${summary.totalRevenue?.toLocaleString() || '0'}`],
      ['Total Sales', summary.totalSales?.toLocaleString() || '0'],
      ['Average Order Value', `$${summary.averageOrderValue?.toFixed(2) || '0'}`],
      ['Revenue Growth', `${summary.revenueGrowth?.toFixed(1) || '0'}%`],
      ['Sales Growth', `${summary.salesGrowth?.toFixed(1) || '0'}%`]
    ];
    
    summaryData.forEach(([label, value]) => {
      doc.fontSize(10)
         .fillColor('#374151')
         .text(label, 50, yPosition)
         .text(value, 200, yPosition);
      yPosition += 20;
    });
  }

  /**
   * Add charts section to PDF (simplified)
   * @param {PDFDocument} doc - PDF document
   * @param {Object} analytics - Analytics data
   */
  static addSalesChartsToPDF(doc, analytics) {
    let yPosition = 320;
    
    doc.fontSize(14)
       .fillColor('#1f2937')
       .text('Sales Trends', 50, yPosition);
    
    yPosition += 30;
    
    // Simple text-based chart representation
    if (analytics.dailyTrend && analytics.dailyTrend.length > 0) {
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text('Daily Sales Trend (Last 7 days):', 50, yPosition);
      
      yPosition += 20;
      
      analytics.dailyTrend.slice(-7).forEach(day => {
        doc.text(`${day.date}: $${day.revenue?.toLocaleString() || '0'} (${day.sales || 0} sales)`, 70, yPosition);
        yPosition += 15;
      });
    }
  }

  /**
   * Add sales tables to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Object} analytics - Analytics data
   */
  static addSalesTablesToPDF(doc, analytics) {
    let yPosition = 500;
    
    // Top Products Table
    if (analytics.topProducts && analytics.topProducts.length > 0) {
      doc.addPage();
      yPosition = 50;
      
      doc.fontSize(14)
         .fillColor('#1f2937')
         .text('Top Products', 50, yPosition);
      
      yPosition += 30;
      
      // Table headers
      doc.fontSize(10)
         .fillColor('#374151')
         .text('Product', 50, yPosition)
         .text('Quantity Sold', 200, yPosition)
         .text('Revenue', 300, yPosition);
      
      yPosition += 20;
      
      analytics.topProducts.slice(0, 10).forEach(product => {
        doc.text(product.productName || 'Unknown', 50, yPosition)
           .text(product.totalQuantity?.toString() || '0', 200, yPosition)
           .text(`$${product.totalRevenue?.toLocaleString() || '0'}`, 300, yPosition);
        yPosition += 15;
      });
    }
  }

  /**
   * Add PDF footer
   * @param {PDFDocument} doc - PDF document
   */
  static addPDFFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(8)
         .fillColor('#9ca3af')
         .text(`Page ${i + 1} of ${pageCount}`, 50, 750)
         .text('Generated by Dukani Retail Management System', 350, 750);
    }
  }

  /**
   * Add sales summary to Excel worksheet
   * @param {ExcelJS.Worksheet} worksheet - Excel worksheet
   * @param {Object} summary - Sales summary data
   * @param {Object} filters - Report filters
   */
  static addSalesSummaryToExcel(worksheet, summary, filters) {
    // Set worksheet title
    worksheet.getCell('A1').value = 'Sales Report Summary';
    worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF2563eb' } };
    worksheet.mergeCells('A1:D1');

    // Add report metadata
    worksheet.getCell('A3').value = 'Generated:';
    worksheet.getCell('B3').value = new Date().toLocaleString();

    if (filters.startDate && filters.endDate) {
      worksheet.getCell('A4').value = 'Period:';
      worksheet.getCell('B4').value = `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`;
    }

    // Add summary data
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Revenue', summary.totalRevenue || 0],
      ['Total Sales', summary.totalSales || 0],
      ['Average Order Value', summary.averageOrderValue || 0],
      ['Revenue Growth (%)', summary.revenueGrowth || 0],
      ['Sales Growth (%)', summary.salesGrowth || 0],
      ['Total Tax', summary.totalTax || 0],
      ['Total Discount', summary.totalDiscount || 0],
      ['Net Profit', summary.netProfit || 0]
    ];

    let row = 6;
    summaryData.forEach(([metric, value]) => {
      worksheet.getCell(`A${row}`).value = metric;
      worksheet.getCell(`B${row}`).value = value;

      if (row === 6) {
        // Header row styling
        worksheet.getRow(row).font = { bold: true };
        worksheet.getRow(row).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFf3f4f6' }
        };
      } else if (typeof value === 'number' && metric.includes('$')) {
        // Currency formatting
        worksheet.getCell(`B${row}`).numFmt = '$#,##0.00';
      } else if (typeof value === 'number' && metric.includes('%')) {
        // Percentage formatting
        worksheet.getCell(`B${row}`).numFmt = '0.0%';
        worksheet.getCell(`B${row}`).value = value / 100;
      }

      row++;
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 20 },
      { width: 15 }
    ];
  }

  /**
   * Add daily trend data to Excel worksheet
   * @param {ExcelJS.Worksheet} worksheet - Excel worksheet
   * @param {Array} dailyTrend - Daily trend data
   */
  static addDailyTrendToExcel(worksheet, dailyTrend) {
    worksheet.getCell('A1').value = 'Daily Sales Trend';
    worksheet.getCell('A1').font = { size: 14, bold: true };

    // Headers
    const headers = ['Date', 'Revenue', 'Sales Count'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFf3f4f6' }
      };
    });

    // Data rows
    dailyTrend.forEach((day, index) => {
      const row = index + 4;
      worksheet.getCell(`A${row}`).value = day.date;
      worksheet.getCell(`B${row}`).value = day.revenue || 0;
      worksheet.getCell(`C${row}`).value = day.sales || 0;

      // Format currency
      worksheet.getCell(`B${row}`).numFmt = '$#,##0.00';
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 12 },
      { width: 15 },
      { width: 12 }
    ];
  }

  /**
   * Add top products data to Excel worksheet
   * @param {ExcelJS.Worksheet} worksheet - Excel worksheet
   * @param {Array} topProducts - Top products data
   */
  static addTopProductsToExcel(worksheet, topProducts) {
    worksheet.getCell('A1').value = 'Top Products';
    worksheet.getCell('A1').font = { size: 14, bold: true };

    // Headers
    const headers = ['Product Name', 'Quantity Sold', 'Revenue', 'Sales Count'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFf3f4f6' }
      };
    });

    // Data rows
    topProducts.forEach((product, index) => {
      const row = index + 4;
      worksheet.getCell(`A${row}`).value = product.productName || 'Unknown';
      worksheet.getCell(`B${row}`).value = product.totalQuantity || 0;
      worksheet.getCell(`C${row}`).value = product.totalRevenue || 0;
      worksheet.getCell(`D${row}`).value = product.salesCount || 0;

      // Format currency
      worksheet.getCell(`C${row}`).numFmt = '$#,##0.00';
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 12 }
    ];
  }

  /**
   * Add staff performance data to Excel worksheet
   * @param {ExcelJS.Worksheet} worksheet - Excel worksheet
   * @param {Array} staffPerformance - Staff performance data
   */
  static addStaffPerformanceToExcel(worksheet, staffPerformance) {
    worksheet.getCell('A1').value = 'Staff Performance';
    worksheet.getCell('A1').font = { size: 14, bold: true };

    // Headers
    const headers = ['Staff ID', 'Sales Count', 'Total Revenue', 'Average Order Value'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFf3f4f6' }
      };
    });

    // Data rows
    staffPerformance.forEach((staff, index) => {
      const row = index + 4;
      worksheet.getCell(`A${row}`).value = staff._id || 'Unknown';
      worksheet.getCell(`B${row}`).value = staff.salesCount || 0;
      worksheet.getCell(`C${row}`).value = staff.totalRevenue || 0;
      worksheet.getCell(`D${row}`).value = staff.averageOrderValue || 0;

      // Format currency
      worksheet.getCell(`C${row}`).numFmt = '$#,##0.00';
      worksheet.getCell(`D${row}`).numFmt = '$#,##0.00';
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 20 },
      { width: 12 },
      { width: 15 },
      { width: 18 }
    ];
  }

  /**
   * Add payment methods data to Excel worksheet
   * @param {ExcelJS.Worksheet} worksheet - Excel worksheet
   * @param {Array} paymentMethods - Payment methods data
   */
  static addPaymentMethodsToExcel(worksheet, paymentMethods) {
    worksheet.getCell('A1').value = 'Payment Methods';
    worksheet.getCell('A1').font = { size: 14, bold: true };

    // Headers
    const headers = ['Payment Method', 'Transaction Count', 'Total Amount'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFf3f4f6' }
      };
    });

    // Data rows
    paymentMethods.forEach((method, index) => {
      const row = index + 4;
      worksheet.getCell(`A${row}`).value = method._id || 'Unknown';
      worksheet.getCell(`B${row}`).value = method.count || 0;
      worksheet.getCell(`C${row}`).value = method.total || 0;

      // Format currency
      worksheet.getCell(`C${row}`).numFmt = '$#,##0.00';
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 18 },
      { width: 18 },
      { width: 15 }
    ];
  }

  /**
   * Add inventory summary to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Object} stockOverview - Stock overview data
   */
  static addInventorySummaryToPDF(doc, stockOverview) {
    let yPosition = 170;

    doc.fontSize(14)
       .fillColor('#1f2937')
       .text('Inventory Overview', 50, yPosition);

    yPosition += 30;

    const inventoryData = [
      ['Total Products', stockOverview.totalProducts?.toLocaleString() || '0'],
      ['Total Stock Value', `$${stockOverview.totalStockValue?.toLocaleString() || '0'}`],
      ['Low Stock Items', stockOverview.lowStockItems?.toLocaleString() || '0'],
      ['Out of Stock Items', stockOverview.outOfStockItems?.toLocaleString() || '0']
    ];

    inventoryData.forEach(([label, value]) => {
      doc.fontSize(10)
         .fillColor('#374151')
         .text(label, 50, yPosition)
         .text(value, 200, yPosition);
      yPosition += 20;
    });
  }

  /**
   * Add inventory tables to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Object} analytics - Analytics data
   */
  static addInventoryTablesToPDF(doc, analytics) {
    let yPosition = 300;

    // Low Stock Items Table
    if (analytics.lowStockItems && analytics.lowStockItems.length > 0) {
      doc.fontSize(14)
         .fillColor('#1f2937')
         .text('Low Stock Items', 50, yPosition);

      yPosition += 30;

      // Table headers
      doc.fontSize(10)
         .fillColor('#374151')
         .text('Product', 50, yPosition)
         .text('Current Stock', 200, yPosition)
         .text('Reorder Point', 300, yPosition)
         .text('Supplier', 400, yPosition);

      yPosition += 20;

      analytics.lowStockItems.slice(0, 15).forEach(item => {
        doc.text(item.name || 'Unknown', 50, yPosition)
           .text(item.stock?.toString() || '0', 200, yPosition)
           .text(item.reorderPoint?.toString() || '0', 300, yPosition)
           .text(item.supplier || 'N/A', 400, yPosition);
        yPosition += 15;

        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });
    }
  }
}

module.exports = ExportService;
