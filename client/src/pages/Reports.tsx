import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  Package,
  AlertTriangle,
  Download,
  Calendar,
  TrendingDown,
  PieChart,
  Activity
} from 'lucide-react';
import * as analyticsApi from '../api/analytics';
import * as expensesApi from '../api/expenses';
import * as salesApi from '../api/sales';
import * as productsApi from '../api/products';

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchReportsData();
    
    // Listen for updates from other pages
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'product-updated' || e.key === 'sale-created') {
        fetchReportsData(); // Refresh reports when data changes
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Auto-refresh every 15 seconds for real-time updates
    const refreshInterval = setInterval(fetchReportsData, 15000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [selectedPeriod]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data with error handling for each API call
      const [salesAnalytics, inventoryAnalytics, expensesRes, allSalesRes, productsRes] = await Promise.allSettled([
        analyticsApi.getSalesAnalytics(selectedPeriod).catch(err => {
          console.error('Failed to fetch sales analytics:', err);
          return null;
        }),
        analyticsApi.getInventoryAnalytics(selectedPeriod).catch(err => {
          console.error('Failed to fetch inventory analytics:', err);
          return null;
        }),
        expensesApi.getExpenses('all').catch(err => {
          console.error('Failed to fetch expenses:', err);
          return { expenses: [] };
        }),
        salesApi.getAllSales().catch(err => {
          console.error('Failed to fetch sales:', err);
          return { sales: [] };
        }),
        productsApi.getProducts().catch(err => {
          console.error('Failed to fetch products:', err);
          return { products: [] };
        })
      ]);

      // Extract data from settled promises
      setSalesData(salesAnalytics.status === 'fulfilled' ? salesAnalytics.value : null);
      setInventoryData(inventoryAnalytics.status === 'fulfilled' ? inventoryAnalytics.value : null);
      
      // Handle expenses response - ensure it's an array
      const expensesList = expensesRes.status === 'fulfilled' 
        ? (Array.isArray(expensesRes.value?.expenses) 
            ? expensesRes.value.expenses 
            : Array.isArray(expensesRes.value?.data) 
              ? expensesRes.value.data 
              : Array.isArray(expensesRes.value) 
                ? expensesRes.value 
                : [])
        : [];
      setExpensesData(expensesList);
      
      // Handle all sales response - ensure it's an array
      const salesList = allSalesRes.status === 'fulfilled' 
        ? (Array.isArray(allSalesRes.value?.sales) 
            ? allSalesRes.value.sales 
            : Array.isArray(allSalesRes.value?.data) 
              ? allSalesRes.value.data 
              : Array.isArray(allSalesRes.value) 
                ? allSalesRes.value 
                : [])
        : [];
      setAllSales(salesList);
      
      // Handle products response - ensure it's an array
      const productsList = productsRes?.status === 'fulfilled' 
        ? (Array.isArray(productsRes.value?.products) 
            ? productsRes.value.products 
            : Array.isArray(productsRes.value?.data) 
              ? productsRes.value.data 
              : Array.isArray(productsRes.value) 
                ? productsRes.value 
                : [])
        : [];
      setProducts(productsList);
      
      console.log('Reports - Products fetched:', productsList.length);
      console.log('Reports - Sales fetched:', salesList.length);
      console.log('Reports - Expenses fetched:', expensesList.length);
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
      // Set empty data to prevent blank screen
      setSalesData(null);
      setInventoryData(null);
      setExpensesData([]);
      setAllSales([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTZS = (amount: number) => {
    return `TZS ${amount.toLocaleString()}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Calculate profit metrics - ensure arrays before reduce
  const expensesArray = Array.isArray(expensesData) ? expensesData : [];
  const salesArray = Array.isArray(allSales) ? allSales : [];
  
  const totalRevenue = salesData?.revenue?.monthly || 0;
  const totalExpenses = expensesArray.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Calculate payment method breakdown - ensure array before reduce
  const paymentMethodBreakdown = salesArray.reduce((acc: any, sale: any) => {
    const method = sale.paymentMethod || 'Cash';
    acc[method] = (acc[method] || 0) + (sale.total || 0);
    return acc;
  }, {});

  // Expense breakdown by category - ensure array before reduce
  const expenseByCategory = expensesArray.reduce((acc: any, exp: any) => {
    const category = exp.category || 'Other';
    acc[category] = (acc[category] || 0) + (exp.amount || 0);
    return acc;
  }, {});

  const periods = [
    { label: 'Today', value: 'day' as const },
    { label: 'This Week', value: 'week' as const },
    { label: 'This Month', value: 'month' as const },
    { label: 'This Year', value: 'year' as const },
    { label: 'All Time', value: 'all' as const },
  ];

  // Calculate real inventory metrics from actual products
  const productsArray = Array.isArray(products) ? products : [];
  const totalInventoryValue = productsArray.reduce((sum: number, p: any) => {
    return sum + ((p.price || 0) * (p.stock || 0));
  }, 0);
  const totalInventoryItems = productsArray.reduce((sum: number, p: any) => {
    return sum + (p.stock || 0);
  }, 0);
  const uniqueProducts = productsArray.length;
  
  const metricCards = [
    {
      title: 'Total Revenue',
      value: formatTZS(totalRevenue),
      change: totalRevenue > 0 ? 'Active' : 'No sales yet',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      trend: totalRevenue > 0 ? 'up' as const : 'down' as const
    },
    {
      title: 'Total Expenses',
      value: formatTZS(totalExpenses),
      change: totalExpenses > 0 ? 'Tracked' : 'No expenses',
      icon: TrendingDown,
      color: 'from-red-500 to-pink-600',
      trend: totalExpenses > 0 ? 'up' as const : 'down' as const
    },
    {
      title: 'Net Profit',
      value: formatTZS(grossProfit),
      change: `${profitMargin}% margin`,
      icon: Activity,
      color: 'from-blue-500 to-cyan-600',
      trend: grossProfit >= 0 ? 'up' as const : 'down' as const
    },
    {
      title: 'Total Orders',
      value: salesArray.length.toString(),
      change: salesArray.length > 0 ? 'Completed' : 'No orders yet',
      icon: ShoppingCart,
      color: 'from-purple-500 to-indigo-600',
      trend: salesArray.length > 0 ? 'up' as const : 'down' as const
    },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center md:text-left">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1 text-center md:text-left">Comprehensive insights into your business performance</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Period:</span>
            {periods.map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period.value)}
                className={selectedPeriod === period.value ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{metric.title}</p>
                  <p className="text-3xl font-bold mt-2">{metric.value}</p>
                  <p className={`text-sm mt-1 font-semibold ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${metric.color} shadow-lg`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesData?.dailySales && salesData.dailySales.length > 0 ? (
              <div className="space-y-3">
                {salesData.dailySales.slice(-7).map((day: any, idx: number) => {
                  const maxAmount = Math.max(...salesData.dailySales.slice(-7).map((d: any) => d.amount));
                  const percentage = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{day.date}</span>
                        <span className="text-gray-900 font-semibold">{formatTZS(day.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No sales data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(paymentMethodBreakdown).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(paymentMethodBreakdown).map(([method, amount]: [string, any]) => {
                  const values = Object.values(paymentMethodBreakdown) as number[];
                  const total = values.reduce((sum, val) => sum + val, 0);
                  const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
                  const colors = [
                    'from-blue-500 to-cyan-600',
                    'from-green-500 to-emerald-600',
                    'from-purple-500 to-pink-600',
                    'from-orange-500 to-red-600'
                  ];
                  const colorIdx = Object.keys(paymentMethodBreakdown).indexOf(method) % colors.length;
                  
                  return (
                    <div key={method} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700 capitalize">{method}</span>
                        <span className="text-gray-900 font-semibold">{formatTZS(amount)} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`bg-gradient-to-r ${colors[colorIdx]} h-3 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No payment data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Popular Items & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Popular Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesData?.popularItems && salesData.popularItems.length > 0 ? (
              <div className="space-y-3">
                {salesData.popularItems.slice(0, 8).map((item: any, idx: number) => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.sales} units sold</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No popular items data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Inventory Value (Real-Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsArray.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatTZS(totalInventoryValue)}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {totalInventoryItems}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Unique Products</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {uniqueProducts}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No products in inventory</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(expenseByCategory).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(expenseByCategory).map(([category, amount]: [string, any]) => {
                  const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0';
                  const colors = [
                    'from-red-500 to-pink-600',
                    'from-orange-500 to-yellow-600',
                    'from-blue-500 to-cyan-600',
                    'from-green-500 to-emerald-600',
                    'from-purple-500 to-indigo-600',
                    'from-pink-500 to-rose-600'
                  ];
                  const colorIdx = Object.keys(expenseByCategory).indexOf(category) % colors.length;
                  
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700 capitalize">{category}</span>
                        <span className="text-gray-900 font-semibold">{formatTZS(amount)} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`bg-gradient-to-r ${colors[colorIdx]} h-3 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No expense data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryData?.lowStockItems && inventoryData.lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {inventoryData.lowStockItems.slice(0, 8).map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-600">
                        {item.stock} / {item.reorderPoint}
                      </p>
                      <p className="text-xs text-gray-600">in stock</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center bg-green-50 rounded-lg">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 text-green-600" />
                  <p className="text-green-600 font-medium">All items well stocked!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profit & Loss Summary */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Profit & Loss Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
              <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-green-700 mt-2">{formatTZS(totalRevenue)}</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border-2 border-red-200">
              <p className="text-sm text-gray-600 font-medium">Total Expenses</p>
              <p className="text-3xl font-bold text-red-700 mt-2">{formatTZS(totalExpenses)}</p>
            </div>
            <div className={`p-6 bg-gradient-to-br ${grossProfit >= 0 ? 'from-blue-50 to-cyan-50 border-blue-200' : 'from-red-50 to-pink-50 border-red-200'} rounded-lg border-2`}>
              <p className="text-sm text-gray-600 font-medium">Net Profit</p>
              <p className={`text-3xl font-bold mt-2 ${grossProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatTZS(grossProfit)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Margin: {profitMargin}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {allSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Items</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Payment</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {allSales.slice(0, 10).map((sale: any) => (
                    <tr key={sale._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-900">{formatDate(sale.date || sale.createdAt)}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{sale.items?.length || 0} items</td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                          {sale.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                        {formatTZS(sale.total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
