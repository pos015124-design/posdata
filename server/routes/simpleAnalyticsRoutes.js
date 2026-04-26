const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { requireUser } = require('./middleware/auth');

// Get sales analytics for dashboard - SCOPED TO CURRENT USER
router.get('/sales', requireUser, async (req, res) => {
  try {
    // CRITICAL: Filter by userId for data isolation
    const userId = req.user.userId;
    
    // Get sales data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sales = await Sale.find({
      userId: userId,  // CRITICAL: Only current user's sales
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    // Calculate daily revenue
    const dailyRevenue = {};
    let totalRevenue = 0;

    sales.forEach(sale => {
      const date = sale.createdAt.toISOString().split('T')[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += sale.total;
      totalRevenue += sale.total;
    });

    // Convert to array format for charts
    const dailySales = Object.entries(dailyRevenue).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: Math.round(amount * 100) / 100
    }));

    // Calculate revenue metrics
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const todayRevenue = sales
      .filter(sale => sale.createdAt.toDateString() === today.toDateString())
      .reduce((sum, sale) => sum + sale.total, 0);

    const weeklyRevenue = sales
      .filter(sale => sale.createdAt >= weekAgo)
      .reduce((sum, sale) => sum + sale.total, 0);

    const monthlyRevenue = sales
      .filter(sale => sale.createdAt >= monthAgo)
      .reduce((sum, sale) => sum + sale.total, 0);

    // Get popular items from sales
    const popularItemsMap = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!popularItemsMap[item.productId]) {
          popularItemsMap[item.productId] = {
            _id: item.productId,
            name: item.name,
            sales: 0
          };
        }
        popularItemsMap[item.productId].sales += item.quantity;
      });
    });

    const popularItems = Object.values(popularItemsMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    res.json({
      dailySales: dailySales.slice(-14), // Last 14 days for chart
      popularItems: popularItems,
      revenue: {
        daily: Math.round(todayRevenue * 100) / 100,
        weekly: Math.round(weeklyRevenue * 100) / 100,
        monthly: Math.round(monthlyRevenue * 100) / 100
      },
      profitAndLoss: {
        revenue: { current: monthlyRevenue, previous: 0 },
        expenses: { current: 0, previous: 0 },
        costOfGoods: { current: 0, previous: 0 },
        grossProfit: { current: monthlyRevenue, previous: 0 },
        netProfit: { current: monthlyRevenue, previous: 0 },
        categories: {
          revenue: [{ name: 'Sales', amount: monthlyRevenue }],
          expenses: []
        }
      },
      totalSales: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100
    });

  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({ message: 'Failed to fetch sales analytics' });
  }
});

// Get inventory analytics for reports - SCOPED TO CURRENT USER
router.get('/inventory', requireUser, async (req, res) => {
  try {
    // CRITICAL: Filter by userId for data isolation
    const userId = req.user.userId;
    
    // Get inventory data - ONLY current user's products
    const products = await Product.find({ userId: userId }).select('name stock reorderPoint price purchasePrice category');

    // Calculate inventory metrics
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stock <= p.reorderPoint);
    const outOfStockProducts = products.filter(p => p.stock === 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const totalCostValue = products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);

    // Category breakdown
    const categoryBreakdown = {};
    products.forEach(product => {
      if (!categoryBreakdown[product.category]) {
        categoryBreakdown[product.category] = {
          count: 0,
          value: 0,
          lowStock: 0
        };
      }
      categoryBreakdown[product.category].count++;
      categoryBreakdown[product.category].value += product.stock * product.price;
      if (product.stock <= product.reorderPoint) {
        categoryBreakdown[product.category].lowStock++;
      }
    });

    // Top products by value
    const topProductsByValue = products
      .map(p => ({
        name: p.name,
        value: p.stock * p.price,
        stock: p.stock
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    res.json({
      inventoryValue: {
        totalValue: Math.round(totalInventoryValue * 100) / 100,
        totalItems: products.reduce((sum, p) => sum + p.stock, 0),
        uniqueProducts: totalProducts
      },
      lowStockItems: lowStockProducts.map(p => ({
        _id: p._id,
        name: p.name,
        stock: p.stock,
        reorderPoint: p.reorderPoint,
        category: p.category
      })),
      stockByCategory: Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        count: data.count,
        totalStock: data.count, // Using count as totalStock for simplicity
        value: Math.round(data.value * 100) / 100
      }))
    });

  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ message: 'Failed to fetch inventory analytics' });
  }
});

module.exports = router;
