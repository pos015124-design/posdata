import { useState, useEffect } from "react"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorState from "@/components/ErrorState"
import { getSalesAnalytics } from "@/api/analytics"
import { getProducts } from "@/api/products"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/useToast"
import { Input } from "@/components/ui/input"
import { format, subDays } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { formatCurrency } from "@/lib/format"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DollarSign,
  TrendingUp,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// Define types for analytics data
interface SalesAnalytics {
  dailySales: Array<{ date: string; amount: number }>;
  popularItems: Array<{ _id: string; name: string; sales: number }>;
  revenue: { daily: number; weekly: number; monthly: number; yearly?: number; allTime?: number };
  tax?: { daily: number; weekly: number; monthly: number; yearly?: number; allTime?: number };
  netRevenue?: { daily: number; weekly: number; monthly: number; yearly?: number; allTime?: number };
  cashInHand?: {
    openingBalance: number;
    closingBalance: number;
    cashSales: number;
    cashPayments: number;
    cashDeposits: number;
    cashWithdrawals: number;
    salesByMethod?: {
      cash: { total: number; count: number };
      card: { total: number; count: number };
      mobile: { total: number; count: number };
      credit: { total: number; count: number };
    };
    transactions: Array<{
      type: string;
      amount: number;
      description: string;
      timestamp: string;
    }>;
    paymentTransactions?: Array<{
      type: string;
      amount: number;
      description: string;
      timestamp: string;
      reference: string;
    }>;
  };
  profitAndLoss: {
    revenue: { current: number; previous: number };
    expenses: { current: number; previous: number };
    costOfGoods: { current: number; previous: number };
    grossProfit: { current: number; previous: number };
    netProfit: { current: number; previous: number };
    categories: {
      revenue: Array<{ name: string; amount: number }>;
      expenses: Array<{ name: string; amount: number }>;
    };
  };
  inventoryValue?: { totalValue: number; totalItems: number; uniqueProducts: number };
  lowStockItems?: Array<{ _id: string; name: string; stock: number; reorderPoint: number; category: string }>;
}

interface InventoryAnalytics {
  inventoryValue: { totalValue: number; totalItems: number; uniqueProducts: number };
  lowStockItems: Array<{ _id: string; name: string; stock: number; reorderPoint: number; category: string }>;
  stockByCategory: Array<{ category: string; count: number; totalStock: number; value: number }>;
}

export function Reports() {
  const { t } = useLanguage()
  const [dateRange, setDateRange] = useState<"all" | "day" | "week" | "month" | "year" | "custom">("week")
  const [customDateRange, setCustomDateRange] = useState<{ from: string, to: string }>({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd")
  })
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryAnalytics | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      let salesParams;
      if (dateRange === 'custom') {
        salesParams = [dateRange as "custom", customDateRange.from, customDateRange.to];
      } else {
<<<<<<< HEAD
        salesParams = [dateRange as "all" | "day" | "week" | "month" | "custom"];
      }

      const [salesData, productsData] = await Promise.all([
        getSalesAnalytics(...(salesParams as [('day' | 'week' | 'month' | 'all' | 'custom'), string?, string?])),
        getProducts()
      ]);

      // Validate and set default values for analytics data
      const validatedSalesData = salesData ? {
        dailySales: salesData.dailySales || [],
        popularItems: salesData.popularItems || [],
        revenue: salesData.revenue || { daily: 0, weekly: 0, monthly: 0 },
        tax: salesData.tax || { daily: 0, weekly: 0, monthly: 0 },
        netRevenue: salesData.netRevenue || { daily: 0, weekly: 0, monthly: 0 },
        cashInHand: salesData.cashInHand || {
          openingBalance: 0,
          closingBalance: 0,
          cashSales: 0,
          cashPayments: 0,
          cashDeposits: 0,
          cashWithdrawals: 0,
          salesByMethod: {
            cash: { total: 0, count: 0 },
            card: { total: 0, count: 0 },
            mobile: { total: 0, count: 0 },
            credit: { total: 0, count: 0 }
          }
        },
        profitAndLoss: salesData.profitAndLoss || {
=======
        salesParams = [dateRange as "all" | "day" | "week" | "month" | "year" | "custom"];
        inventoryParams = [dateRange as "all" | "day" | "week" | "month" | "year" | "custom"];
      }
      
      const [salesData, inventoryData] = await Promise.all([
        getSalesAnalytics(...(salesParams as [('day' | 'week' | 'month' | 'year' | 'all' | 'custom'), string?, string?])),
        getInventoryAnalytics(...(inventoryParams as [('day' | 'week' | 'month' | 'year' | 'all' | 'custom'), string?, string?]))
      ]);
      
      // Normalize salesData to ensure all required properties exist
      const normalizedSalesData = {
        ...salesData,
        revenue: salesData?.revenue || { daily: 0, weekly: 0, monthly: 0 },
        dailySales: salesData?.dailySales || [],
        popularItems: salesData?.popularItems || [],
        profitAndLoss: salesData?.profitAndLoss || {
>>>>>>> 77ffa9ad4df0a8406dc926a295435109c208a8f0
          revenue: { current: 0, previous: 0 },
          expenses: { current: 0, previous: 0 },
          costOfGoods: { current: 0, previous: 0 },
          grossProfit: { current: 0, previous: 0 },
          netProfit: { current: 0, previous: 0 },
          categories: {
            revenue: [],
            expenses: []
          }
<<<<<<< HEAD
        }
      } : null;

      setAnalytics(validatedSalesData);
      setProducts(productsData?.products || []);

      // Calculate inventory analytics from products
      const inventoryValue = {
        totalValue: productsData?.products?.reduce((sum: number, p: any) => sum + (p.stock * p.purchasePrice), 0) || 0,
        totalItems: productsData?.products?.reduce((sum: number, p: any) => sum + (p.stock || 0), 0) || 0,
        uniqueProducts: productsData?.products?.length || 0
      };
      const lowStockItems = productsData?.products?.filter((p: any) => p.stock <= p.reorderPoint) || [];
      const stockByCategoryMap: Record<string, { category: string, count: number, totalStock: number, value: number }> = {};
      productsData?.products?.forEach((p: any) => {
        const cat = p.category || 'Uncategorized';
        if (!stockByCategoryMap[cat]) {
          stockByCategoryMap[cat] = { category: cat, count: 0, totalStock: 0, value: 0 };
        }
        stockByCategoryMap[cat].count += 1;
        stockByCategoryMap[cat].totalStock += p.stock || 0;
        stockByCategoryMap[cat].value += (p.stock * p.purchasePrice) || 0;
      });
      const stockByCategory = Object.values(stockByCategoryMap);
      setInventoryData({ inventoryValue, lowStockItems, stockByCategory });
=======
        },
        tax: salesData?.tax || { daily: 0, weekly: 0, monthly: 0 },
        netRevenue: salesData?.netRevenue || { daily: 0, weekly: 0, monthly: 0 }
      };
      
      // Normalize inventoryData to ensure all required properties exist
      const normalizedInventoryData = {
        ...inventoryData,
        inventoryValue: inventoryData?.inventoryValue || { totalValue: 0, totalItems: 0, uniqueProducts: 0 },
        lowStockItems: inventoryData?.lowStockItems || [],
        stockByCategory: inventoryData?.stockByCategory || []
      };
      
      setAnalytics(normalizedSalesData);
      setInventoryData(normalizedInventoryData);
      setLoading(false);
>>>>>>> 77ffa9ad4df0a8406dc926a295435109c208a8f0
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
      setError("Failed to load reports data. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch analytics data",
      })
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading reports..." />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <ErrorState
        title="Reports Error"
        message={error}
        onRetry={fetchAnalytics}
      />
    )
  }

  // Show error if no data
  if (!analytics || !inventoryData) {
    return (
      <ErrorState
        title="No Data Available"
        message="Unable to load reports data. Please try again."
        onRetry={fetchAnalytics}
      />
    )
  }

  const renderPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return <div className="text-muted-foreground">N/A</div>;
    
    const percentageChange = ((current - previous) / previous) * 100
    const isPositive = percentageChange >= 0
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight
    const colorClass = isPositive ? "text-green-500" : "text-red-500"

    return (
      <div className={`flex items-center ${colorClass}`}>
        <Icon className="h-4 w-4 mr-1" />
        {Math.abs(percentageChange).toFixed(1)}%
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("reports.title")}</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchAnalytics}
            title={t("reports.refresh")}
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Select
              value={dateRange}
              onValueChange={(value: "all" | "day" | "week" | "month" | "custom") => setDateRange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("reports.dateRange")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("reports.allTime")}</SelectItem>
                <SelectItem value="day">{t("reports.today")}</SelectItem>
                <SelectItem value="week">{t("reports.thisWeek")}</SelectItem>
                <SelectItem value="month">{t("reports.thisMonth")}</SelectItem>
                <SelectItem value="year">{t("reports.thisYear")}</SelectItem>
                <SelectItem value="custom">{t("reports.customRange")}</SelectItem>
              </SelectContent>
            </Select>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-[140px]"
                  value={customDateRange.from}
                  onChange={(e) => setCustomDateRange({...customDateRange, from: e.target.value})}
                />
                <span className="text-sm">{t("reports.to")}</span>
                <Input
                  type="date"
                  className="w-[140px]"
                  value={customDateRange.to}
                  onChange={(e) => setCustomDateRange({...customDateRange, to: e.target.value})}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="overview">{t("reports.overview")}</TabsTrigger>
          <TabsTrigger value="pl">{t("reports.profitLoss")}</TabsTrigger>
          <TabsTrigger value="tax">{t("reports.taxReports")}</TabsTrigger>
          <TabsTrigger value="inventory">{t("reports.inventory")}</TabsTrigger>
          <TabsTrigger value="cash">Sales Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("reports.dailyRevenue")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.revenue?.daily || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("reports.weeklyRevenue")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.revenue?.weekly || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("reports.monthlyRevenue")}</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.revenue?.monthly || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("reports.salesTrend")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.dailySales || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("reports.popularItems")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.product")}</TableHead>
                    <TableHead className="text-right">{t("reports.sales")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analytics.popularItems || []).map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.sales}</TableCell>
                    </TableRow>
                  ))}
                  {(analytics?.popularItems?.length || 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">
                        {t("reports.noSalesData")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Tax Collected</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.tax?.daily || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Tax Collected</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.tax?.weekly || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Tax Collected</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.tax?.monthly || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tax Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                    <TableHead className="text-right">Tax Collected</TableHead>
                    <TableHead className="text-right">Tax Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Today</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.revenue.daily)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.netRevenue?.daily || analytics.revenue.daily)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.tax?.daily || 0)}</TableCell>
                    <TableCell className="text-right">
                      {analytics.revenue.daily > 0
                        ? `${((analytics.tax?.daily || 0) / analytics.revenue.daily * 100).toFixed(1)}%`
                        : '0%'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">This Week</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.revenue.weekly)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.netRevenue?.weekly || analytics.revenue.weekly)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.tax?.weekly || 0)}</TableCell>
                    <TableCell className="text-right">
                      {analytics.revenue.weekly > 0
                        ? `${((analytics.tax?.weekly || 0) / analytics.revenue.weekly * 100).toFixed(1)}%`
                        : '0%'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">This Month</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.revenue.monthly)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.netRevenue?.monthly || analytics.revenue.monthly)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.tax?.monthly || 0)}</TableCell>
                    <TableCell className="text-right">
                      {analytics.revenue.monthly > 0
                        ? `${((analytics.tax?.monthly || 0) / analytics.revenue.monthly * 100).toFixed(1)}%`
                        : '0%'}
                    </TableCell>
                  </TableRow>
                  {/* All Time row - always show this */}
                  <TableRow>
                    <TableCell className="font-medium">All Time</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.revenue.allTime || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.netRevenue?.allTime || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.tax?.allTime || 0)}</TableCell>
                    <TableCell className="text-right">
                      {(analytics.revenue.allTime || 0) > 0
                        ? `${((analytics.tax?.allTime || 0) / (analytics.revenue.allTime || 1) * 100).toFixed(1)}%`
                        : '0%'}
                    </TableCell>
                  </TableRow>
                  {/* This Year row - always show this */}
                  <TableRow>
                    <TableCell className="font-medium">This Year</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.revenue.yearly || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.netRevenue?.yearly || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(analytics.tax?.yearly || 0)}</TableCell>
                    <TableCell className="text-right">
                      {(analytics.revenue.yearly || 0) > 0
                        ? `${((analytics.tax?.yearly || 0) / (analytics.revenue.yearly || 1) * 100).toFixed(1)}%`
                        : '0%'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(inventoryData.inventoryValue.totalValue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items in Stock</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventoryData.inventoryValue.totalItems}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Products</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventoryData.inventoryValue.uniqueProducts}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(inventoryData.lowStockItems || []).map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">{item.stock}</TableCell>
                      <TableCell className="text-right">{item.reorderPoint}</TableCell>
                    </TableRow>
                  ))}
                  {inventoryData.lowStockItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No low stock items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Stock Value by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryData.stockByCategory}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => entry.category}
                    >
                      {(inventoryData.stockByCategory || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock by Category</CardTitle>
              </CardHeader>
              <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">Total Stock</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(inventoryData.stockByCategory || []).map((category) => (
                    <TableRow key={category.category}>
                      <TableCell className="font-medium">{category.category}</TableCell>
                      <TableCell className="text-right">{category.count}</TableCell>
                      <TableCell className="text-right">{category.totalStock}</TableCell>
                      <TableCell className="text-right">{formatCurrency(category.value)}</TableCell>
                    </TableRow>
                  ))}
                  {inventoryData.stockByCategory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No category data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="pl" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.profitAndLoss.revenue.current)}
                </div>
                {renderPercentageChange(
                  analytics.profitAndLoss.revenue.current,
                  analytics.profitAndLoss.revenue.previous
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.profitAndLoss.grossProfit.current)}
                </div>
                {renderPercentageChange(
                  analytics.profitAndLoss.grossProfit.current,
                  analytics.profitAndLoss.grossProfit.previous
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.profitAndLoss.netProfit.current)}
                </div>
                {renderPercentageChange(
                  analytics.profitAndLoss.netProfit.current,
                  analytics.profitAndLoss.netProfit.previous
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.profitAndLoss?.categories?.revenue || []}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => entry.name}
                    >
                      {(analytics?.profitAndLoss?.categories?.revenue || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.profitAndLoss?.categories?.expenses || []}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => entry.name}
                    >
                      {(analytics?.profitAndLoss?.categories?.expenses || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Current Period</TableHead>
                    <TableHead className="text-right">Previous Period</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Revenue</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.revenue.current)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.revenue.previous)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderPercentageChange(
                        analytics.profitAndLoss.revenue.current,
                        analytics.profitAndLoss.revenue.previous
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Cost of Goods</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.costOfGoods.current)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.costOfGoods.previous)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderPercentageChange(
                        analytics.profitAndLoss.costOfGoods.current,
                        analytics.profitAndLoss.costOfGoods.previous
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Gross Profit</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.grossProfit.current)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.grossProfit.previous)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderPercentageChange(
                        analytics.profitAndLoss.grossProfit.current,
                        analytics.profitAndLoss.grossProfit.previous
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Expenses</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.expenses.current)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.expenses.previous)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderPercentageChange(
                        analytics.profitAndLoss.expenses.current,
                        analytics.profitAndLoss.expenses.previous
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell>Net Profit</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.netProfit.current)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(analytics.profitAndLoss.netProfit.previous)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderPercentageChange(
                        analytics.profitAndLoss.netProfit.current,
                        analytics.profitAndLoss.netProfit.previous
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    (analytics.cashInHand?.salesByMethod?.cash?.total || 0) +
                    (analytics.cashInHand?.salesByMethod?.card?.total || 0) +
                    (analytics.cashInHand?.salesByMethod?.mobile?.total || 0) +
                    (analytics.cashInHand?.salesByMethod?.credit?.total || 0)
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics.cashInHand?.salesByMethod?.cash?.count || 0) +
                   (analytics.cashInHand?.salesByMethod?.card?.count || 0) +
                   (analytics.cashInHand?.salesByMethod?.mobile?.count || 0) +
                   (analytics.cashInHand?.salesByMethod?.credit?.count || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    ((analytics.cashInHand?.salesByMethod?.cash?.total || 0) +
                    (analytics.cashInHand?.salesByMethod?.card?.total || 0) +
                    (analytics.cashInHand?.salesByMethod?.mobile?.total || 0) +
                    (analytics.cashInHand?.salesByMethod?.credit?.total || 0)) /
                    Math.max(1, (analytics.cashInHand?.salesByMethod?.cash?.count || 0) +
                    (analytics.cashInHand?.salesByMethod?.card?.count || 0) +
                    (analytics.cashInHand?.salesByMethod?.mobile?.count || 0) +
                    (analytics.cashInHand?.salesByMethod?.credit?.count || 0))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Cash', value: analytics.cashInHand?.salesByMethod?.cash?.total || 0 },
                          { name: 'Card', value: analytics.cashInHand?.salesByMethod?.card?.total || 0 },
                          { name: 'Mobile Money', value: analytics.cashInHand?.salesByMethod?.mobile?.total || 0 },
                          { name: 'Credit', value: analytics.cashInHand?.salesByMethod?.credit?.total || 0 }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => entry.name}
                      >
                        {[0, 1, 2, 3].map((index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Cash</TableCell>
                      <TableCell className="text-right">
                        {analytics.cashInHand?.salesByMethod?.cash?.count || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(analytics.cashInHand?.salesByMethod?.cash?.total || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Card</TableCell>
                      <TableCell className="text-right">
                        {analytics.cashInHand?.salesByMethod?.card?.count || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(analytics.cashInHand?.salesByMethod?.card?.total || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Mobile Money</TableCell>
                      <TableCell className="text-right">
                        {analytics.cashInHand?.salesByMethod?.mobile?.count || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(analytics.cashInHand?.salesByMethod?.mobile?.total || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Credit</TableCell>
                      <TableCell className="text-right">
                        {analytics.cashInHand?.salesByMethod?.credit?.count || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(analytics.cashInHand?.salesByMethod?.credit?.total || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {(analytics.cashInHand?.salesByMethod?.cash?.count || 0) +
                         (analytics.cashInHand?.salesByMethod?.card?.count || 0) +
                         (analytics.cashInHand?.salesByMethod?.mobile?.count || 0) +
                         (analytics.cashInHand?.salesByMethod?.credit?.count || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          (analytics.cashInHand?.salesByMethod?.cash?.total || 0) +
                          (analytics.cashInHand?.salesByMethod?.card?.total || 0) +
                          (analytics.cashInHand?.salesByMethod?.mobile?.total || 0) +
                          (analytics.cashInHand?.salesByMethod?.credit?.total || 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Summary section removed */}

          <Card>
            <CardHeader>
              <CardTitle>Card & Mobile Money Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Transaction Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.cashInHand?.paymentTransactions && analytics.cashInHand.paymentTransactions.length > 0 ? (
                    analytics.cashInHand.paymentTransactions.map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(new Date(transaction.timestamp), 'MMM dd, HH:mm')}</TableCell>
                        <TableCell className="capitalize">{transaction.type}</TableCell>
                        <TableCell>{transaction.reference}</TableCell>
                        <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No card or mobile money transactions recorded for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}