const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
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
   * Parse Excel file and return products array
   */
  static async parseExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const products = xlsx.utils.sheet_to_json(worksheet);
    
    fs.unlinkSync(filePath); // Clean up temp file
    return products;
  }

  /**
   * Validate and normalize product data
   */
  static validateProduct(row, index) {
    const errors = [];
    
    // Required fields validation
    if (!row.name || row.name.trim() === '') {
      errors.push(`Row ${index + 1}: Product name is required`);
    }
    
    if (!row.code || row.code.trim() === '') {
      errors.push(`Row ${index + 1}: Product code is required`);
    }
    
    if (!row.barcode || row.barcode.trim() === '') {
      errors.push(`Row ${index + 1}: Barcode is required`);
    }
    
    if (!row.price || isNaN(parseFloat(row.price))) {
      errors.push(`Row ${index + 1}: Valid price is required`);
    }
    
    if (!row.purchasePrice || isNaN(parseFloat(row.purchasePrice))) {
      errors.push(`Row ${index + 1}: Valid purchase price is required`);
    }
    
    if (!row.stock || isNaN(parseInt(row.stock))) {
      errors.push(`Row ${index + 1}: Valid stock quantity is required`);
    }
    
    if (!row.category || row.category.trim() === '') {
      errors.push(`Row ${index + 1}: Category is required`);
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Normalize data
    return {
      valid: true,
      product: {
        name: row.name.trim(),
        code: row.code.trim(),
        barcode: row.barcode.trim(),
        price: parseFloat(row.price),
        purchasePrice: parseFloat(row.purchasePrice),
        stock: parseInt(row.stock),
        category: row.category.trim(),
        description: row.description?.trim() || '',
        reorderPoint: row.reorderPoint ? parseInt(row.reorderPoint) : 10
      }
    };
  }

  /**
   * Import products from file
   */
  static async importProducts(filePath, fileType) {
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
        // Check if product with same code or barcode already exists
        const existingProduct = await Product.findOne({
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

        // Create new product
        const product = new Product(validation.product);
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
