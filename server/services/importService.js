const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');
const Product = require('../models/Product');

class ImportService {
  /**
   * Parse CSV file and return products array
   */
  static async parseCSV(filePath) {
    const products = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          products.push(row);
        })
        .on('end', () => {
          fs.unlinkSync(filePath); // Clean up temp file
          resolve(products);
        })
        .on('error', (error) => {
          fs.unlinkSync(filePath);
          reject(error);
        });
    });
  }

  /**
   * Parse Excel file and return products array.
   * Uses the header row to map columns (robust to column order), matching the
   * CSV template: name, code, barcode, price, purchasePrice, stock, category,
   * description, reorderPoint.
   */
  static async parseExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel file has no worksheets');
    }

    // Build header → column index map from the first row
    const headers = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const name = String(cell.value ?? '').trim().toLowerCase();
      if (name) headers[name] = colNumber;
    });

    const products = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header row
      // Skip fully-empty rows
      if (!row.getCell(1).value && !row.getCell(2).value) return;

      const product = {};
      for (const [key, colNumber] of Object.entries(headers)) {
        const value = row.getCell(colNumber).value;
        product[key] = value == null ? undefined : value;
      }
      products.push(product);
    });

    fs.unlinkSync(filePath); // Clean up temp file
    return products;
  }

  /**
   * Validate and normalize product data
   */
  static validateProduct(row, index) {
    const errors = [];
    const str = (v) => (v == null ? '' : String(v).trim());
    
    // Required fields validation (Excel cells can be numbers — coerce to string)
    if (!str(row.name)) {
      errors.push(`Row ${index + 1}: Product name is required`);
    }
    
    if (!str(row.code)) {
      errors.push(`Row ${index + 1}: Product code is required`);
    }
    
    if (!str(row.barcode)) {
      errors.push(`Row ${index + 1}: Barcode is required`);
    }
    
    if (row.price == null || isNaN(parseFloat(row.price))) {
      errors.push(`Row ${index + 1}: Valid price is required`);
    }
    
    if (row.purchasePrice == null || isNaN(parseFloat(row.purchasePrice))) {
      errors.push(`Row ${index + 1}: Valid purchase price is required`);
    }
    
    if (row.stock == null || isNaN(parseInt(row.stock))) {
      errors.push(`Row ${index + 1}: Valid stock quantity is required`);
    }
    
    if (!str(row.category)) {
      errors.push(`Row ${index + 1}: Category is required`);
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Normalize data
    return {
      valid: true,
      product: {
        name: str(row.name),
        code: str(row.code),
        barcode: str(row.barcode),
        price: parseFloat(row.price),
        purchasePrice: parseFloat(row.purchasePrice),
        stock: parseInt(row.stock),
        category: str(row.category),
        description: str(row.description),
        reorderPoint: row.reorderPoint ? parseInt(row.reorderPoint) : 10
      }
    };
  }

  /**
   * Import products from file, owned by the given user (data isolation).
   * @param {string} filePath - Path to the uploaded file
   * @param {string} fileType - 'csv' | 'excel'
   * @param {string} userId - Owner user id (required by the Product model)
   */
  static async importProducts(filePath, fileType, userId) {
    if (!userId) {
      throw new Error('User ID is required to import products');
    }
    let rawData;
    
    // Parse file based on type
    if (fileType === 'csv') {
      rawData = await this.parseCSV(filePath);
    } else if (fileType === 'excel') {
      rawData = await this.parseExcel(filePath);
    } else {
      throw new Error('Unsupported file type. Use CSV or Excel.');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      products: []
    };

    // Validate and process each row
    for (let i = 0; i < rawData.length; i++) {
      const validation = this.validateProduct(rawData[i], i);
      
      if (!validation.valid) {
        results.failed++;
        results.errors.push(...validation.errors);
        continue;
      }

      try {
        // Check if product with same code or barcode already exists for THIS user
        const existingProduct = await Product.findOne({
          userId,
          $or: [
            { code: validation.product.code },
            { barcode: validation.product.barcode }
          ]
        });

        if (existingProduct) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Product with code "${validation.product.code}" or barcode "${validation.product.barcode}" already exists`);
          continue;
        }

        // Create new product owned by the requesting user
        const product = new Product({ ...validation.product, userId });
        await product.save();
        
        results.success++;
        results.products.push(product);
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Generate CSV template
   */
  static generateCSVTemplate() {
    const headers = 'name,code,barcode,price,purchasePrice,stock,category,description,reorderPoint';
    const example = 'Sample Product,PRD001,123456789,5000,3000,100,Electronics,Product description here,10';
    
    return `${headers}\n${example}`;
  }
}

module.exports = ImportService;
