import { useState, useEffect, useMemo } from "react"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorState from "@/components/ErrorState"
import { getProducts, addProduct, updateProduct } from "@/api/products"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCategories, Category } from "@/api/categories"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/useToast"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  Plus,
  History,
  Search,
  AlertTriangle,
  Download,
  ArrowUpDown,
  DollarSign,
  FileText,
  ClipboardList,
  TrendingUp,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/format"
import { format, subDays } from "date-fns"
import { restockProduct, getRestockHistory, getLowStockAlerts, updateStock } from "@/api/inventory"
import { addExpense } from "@/api/expenses"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Product = {
  _id: string
  name: string
  code: string
  barcode: string
  price: number
  purchasePrice: number
  stock: number
  category: string
  supplier: string
  reorderPoint: number
  expiryDate?: string
  location?: string
  lastRestocked?: string
}

type RestockHistory = {
  _id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  totalCost: number
  supplierName: string
  invoiceNumber: string
  notes?: string
  date: string
}

type LowStockAlert = {
  _id: string;
  name: string;
  stock: number;
  threshold: number;
}

type CategorySummary = {
  name: string;
  count: number;
  value: number;
}

export function Inventory() {
  // Basic state
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [addingProduct, setAddingProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState(false)
  const [restocking, setRestocking] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [restockHistory, setRestockHistory] = useState<RestockHistory[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productCategories, setProductCategories] = useState<Category[]>([])
  
  // Enhanced state - these variables are required for TypeScript type checking
  // even though they're not directly used in event handlers
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stockStatusFilter, setStockStatusFilter] = useState<string | null>(null)
  const [showInventoryCount, setShowInventoryCount] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [productsDateRange, setProductsDateRange] = useState<"all" | "day" | "week" | "month" | "custom">("all")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [productsCustomDateRange, setProductsCustomDateRange] = useState<{ from: string, to: string }>({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd")
  })
  const [restockHistoryDateRange, setRestockHistoryDateRange] = useState<"all" | "week" | "month" | "custom">("all")
  const [customDateRange, setCustomDateRange] = useState<{ from: string, to: string }>({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd")
  })
  const [filteredRestockHistory, setFilteredRestockHistory] = useState<RestockHistory[]>([])
  
  // Form state
  const [newProduct, setNewProduct] = useState({
    name: "",
    code: "",
    barcode: "",
    price: "",
    purchasePrice: "",
    stock: "",
    category: "",
    supplier: "",
    reorderPoint: "",
    expiryDate: "",
    location: "",
  })
  
  const [restockData, setRestockData] = useState({
    quantity: "",
    unitCost: "",
    sellingPrice: "",
    invoiceNumber: "",
    notes: "",
    expiryDate: "",
    batchNumber: "",
  })
  
  const [inventoryCountData, setInventoryCountData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    products: [] as Array<{
      productId: string;
      productName: string;
      expectedCount: number;
      actualCount: number;
    }>
  })
  
  const { toast } = useToast()
  
  // Derived state
  
  const categorySummary = useMemo(() => {
    const summary: Record<string, CategorySummary> = {};
    
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!summary[category]) {
        summary[category] = { name: category, count: 0, value: 0 };
      }
      summary[category].count += 1;
      summary[category].value += product.stock * product.purchasePrice;
    });
    
    return Object.values(summary).sort((a, b) => b.value - a.value);
  }, [products]);
  
  // Pagination
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  }, [filteredProducts.length, itemsPerPage]);
  
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Enhanced filtering function
  useEffect(() => {
    let filtered = [...(products || [])];
    
    // Apply search term filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(product =>
        product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product?.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product?.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(product =>
        product?.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Apply supplier filter
    if (supplierFilter) {
      filtered = filtered.filter(product =>
        product?.supplier?.toLowerCase() === supplierFilter.toLowerCase()
      );
    }
    
    // Apply stock status filter
    if (stockStatusFilter) {
      filtered = filtered.filter(product => {
        if (stockStatusFilter === 'low') {
          return (product?.stock || 0) <= (product?.reorderPoint || 0);
        } else if (stockStatusFilter === 'normal') {
          return (product?.stock || 0) > (product?.reorderPoint || 0) && (product?.stock || 0) <= ((product?.reorderPoint || 0) * 2);
        } else if (stockStatusFilter === 'excess') {
          return (product?.stock || 0) > ((product?.reorderPoint || 0) * 2);
        }
        return true;
      });
    }
    
    // Apply date range filter for products with lastRestocked date
    if (productsDateRange !== 'all' && products.some(p => p.lastRestocked)) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (productsDateRange === 'day') {
        filtered = filtered.filter(product => {
          if (!product.lastRestocked) return false;
          const restockDate = new Date(product.lastRestocked);
          return restockDate >= today;
        });
      } else if (productsDateRange === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        filtered = filtered.filter(product => {
          if (!product.lastRestocked) return false;
          const restockDate = new Date(product.lastRestocked);
          return restockDate >= weekStart;
        });
      } else if (productsDateRange === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(product => {
          if (!product.lastRestocked) return false;
          const restockDate = new Date(product.lastRestocked);
          return restockDate >= monthStart;
        });
      } else if (productsDateRange === 'custom' && productsCustomDateRange.from && productsCustomDateRange.to) {
        const fromDate = new Date(productsCustomDateRange.from);
        const toDate = new Date(productsCustomDateRange.to);
        toDate.setHours(23, 59, 59, 999); // End of day
        filtered = filtered.filter(product => {
          if (!product.lastRestocked) return false;
          const restockDate = new Date(product.lastRestocked);
          return restockDate >= fromDate && restockDate <= toDate;
        });
      }
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Sort products
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting to filtered products
  useEffect(() => {
    if (!sortField) {
      return;
    }
    
    const sorted = [...filteredProducts].sort((a, b) => {
      const aValue = a[sortField as keyof Product];
      const bValue = b[sortField as keyof Product];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // For numbers
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    
    setFilteredProducts(sorted);
  }, [sortField, sortDirection, filteredProducts]);

  // Filter restock history based on date range
  useEffect(() => {
    if (!restockHistory.length) return;
    
    let filtered = [...restockHistory];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (restockHistoryDateRange === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      filtered = filtered.filter(record => new Date(record.date) >= weekStart);
    } else if (restockHistoryDateRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(record => new Date(record.date) >= monthStart);
    } else if (restockHistoryDateRange === 'custom' && customDateRange.from && customDateRange.to) {
      const fromDate = new Date(customDateRange.from);
      const toDate = new Date(customDateRange.to);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= fromDate && recordDate <= toDate;
      });
    }
    
    setFilteredRestockHistory(filtered);
  }, [restockHistory, restockHistoryDateRange, customDateRange]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [productsData, historyData, alertsData, categoriesData] = await Promise.all([
          getProducts(),
          getRestockHistory(),
          getLowStockAlerts(),
          getCategories()
        ]);

        setProducts(productsData?.products || []);
        setFilteredProducts(productsData?.products || []);
        setRestockHistory(historyData?.history || []);
        setFilteredRestockHistory(historyData?.history || []);
        setLowStockAlerts(alertsData?.alerts || []);
        setProductCategories(categoriesData?.categories || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load inventory data. Please try again.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch inventory data",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleAddProduct = async () => {
    // Validate required fields
    if (!newProduct.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product name is required",
      })
      return
    }
    if (!newProduct.category || newProduct.category.trim() === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product category is required",
      })
      return
    }
    if (!newProduct.price || isNaN(Number(newProduct.price)) || Number(newProduct.price) <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product price must be a positive number",
      })
      return
    }
    if (!newProduct.purchasePrice || isNaN(Number(newProduct.purchasePrice)) || Number(newProduct.purchasePrice) <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Purchase price must be a positive number",
      })
      return
    }
    if (!newProduct.stock || isNaN(Number(newProduct.stock)) || !Number.isInteger(Number(newProduct.stock)) || Number(newProduct.stock) < 0 || Number(newProduct.stock) > 999999) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Stock must be a non-negative integer less than 999,999",
      })
      return
    }
    if (!newProduct.reorderPoint || isNaN(Number(newProduct.reorderPoint)) || !Number.isInteger(Number(newProduct.reorderPoint)) || Number(newProduct.reorderPoint) < 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Reorder point must be a non-negative integer",
      })
      return
    }
    // Prepare payload: only send non-empty, valid fields
    const payload: any = {
      name: newProduct.name.trim(),
      code: newProduct.code?.trim() || undefined,
      barcode: newProduct.barcode?.trim() || undefined,
      price: Number(newProduct.price),
      purchasePrice: Number(newProduct.purchasePrice),
      stock: Number(newProduct.stock),
      category: newProduct.category && newProduct.category.trim() !== "" ? newProduct.category : undefined,
      supplier: newProduct.supplier?.trim() || undefined,
      reorderPoint: Number(newProduct.reorderPoint),
    }
    try {
      const response = await addProduct(payload)
      if (response.success) {
        toast({
          title: "Success",
          description: "Product added successfully",
        })
        setAddingProduct(false)
        setNewProduct({
          name: "",
          code: "",
          barcode: "",
          price: "",
          purchasePrice: "",
          stock: "",
          category: "",
          supplier: "",
          reorderPoint: "",
          expiryDate: "",
          location: "",
        })
        // Refresh products list
        const data = await getProducts()
        setProducts(data.products)
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add product",
      })
    }
  }

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return

    try {
      const productData = {
        name: selectedProduct.name,
        code: selectedProduct.code,
        barcode: selectedProduct.barcode,
        price: selectedProduct.price,
        purchasePrice: selectedProduct.purchasePrice,
        stock: selectedProduct.stock,
        category: selectedProduct.category,
        supplier: selectedProduct.supplier,
        reorderPoint: selectedProduct.reorderPoint,
      }

      const response = await updateProduct(selectedProduct._id, productData)
      if (response.success) {
        toast({
          title: "Success",
          description: "Product updated successfully",
        })
        setEditingProduct(false)
        setSelectedProduct(null)

        // Refresh products list
        const data = await getProducts()
        setProducts(data.products)
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update product",
      })
    }
  }

  const handleRestock = async () => {
    if (!selectedProduct) return

    try {
      // Check if selling price has changed
      const sellingPriceChanged = restockData.sellingPrice &&
        Number(restockData.sellingPrice) !== selectedProduct.price

      // Restock the product
      const response = await restockProduct({
        productId: selectedProduct._id,
        quantity: Number(restockData.quantity),
        unitCost: Number(restockData.unitCost),
        supplierId: selectedProduct.supplier,
        invoiceNumber: restockData.invoiceNumber,
        notes: restockData.notes,
        ...(restockData.sellingPrice ? { sellingPrice: Number(restockData.sellingPrice) } : {})
      })

      // If selling price has changed, update the product
      if (sellingPriceChanged && restockData.sellingPrice) {
        await updateProduct(selectedProduct._id, {
          ...selectedProduct,
          price: Number(restockData.sellingPrice)
        })
      }

      if (response.success) {
        toast({
          title: "Success",
          description: "Product restocked successfully" +
            (sellingPriceChanged ? " and selling price updated" : ""),
        })
        setRestocking(false)
        setRestockData({
          quantity: "",
          unitCost: "",
          sellingPrice: "",
          invoiceNumber: "",
          notes: "",
          expiryDate: "",
          batchNumber: "",
        })
        setSelectedProduct(null)

        // Refresh data
        const [productsData, historyData] = await Promise.all([
          getProducts(),
          getRestockHistory(),
        ])
        setProducts(productsData.products)
        setRestockHistory(historyData.history)
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restock product",
      })
    }
  }

  // Export functionality
  const handleExport = (exportFormat: 'csv' | 'pdf') => {
    setExportFormat(exportFormat);
    
    try {
      if (exportFormat === 'csv') {
        // Create CSV content
        const headers = ['Name', 'Code', 'Barcode', 'Price', 'Purchase Price', 'Stock', 'Category', 'Supplier', 'Reorder Point'];
        const csvContent = [
          headers.join(','),
          ...filteredProducts.map(product => [
            `"${product.name}"`,
            `"${product.code}"`,
            `"${product.barcode}"`,
            product.price,
            product.purchasePrice,
            product.stock,
            `"${product.category}"`,
            `"${product.supplier}"`,
            product.reorderPoint
          ].join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const today = format(new Date(), 'yyyy-MM-dd');
        link.setAttribute('download', `inventory_export_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Export Successful",
          description: "Inventory data has been exported as CSV",
        });
      } else if (exportFormat === 'pdf') {
        toast({
          title: "PDF Export",
          description: "PDF export functionality would be implemented here with a PDF generation library",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export inventory data",
      });
    }
  };

  // Inventory Count functionality
  const handleInventoryCount = () => {
    setShowInventoryCount(true);
    
    // Initialize inventory count data with current products
    setInventoryCountData({
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      products: products.map(product => ({
        productId: product._id,
        productName: product.name,
        expectedCount: product.stock,
        actualCount: product.stock, // Default to current stock
      }))
    });
  };
  
  // Handle inventory adjustments from count
  const handleInventoryAdjustment = async () => {
    try {
      // Calculate discrepancies
      const adjustments = inventoryCountData.products
        .filter(item => item.actualCount !== item.expectedCount)
        .map(item => {
          const product = products.find(p => p._id === item.productId);
          const diff = item.actualCount - item.expectedCount;
          const value = diff * (product?.purchasePrice || 0);
          
          return {
            productId: item.productId,
            productName: item.productName,
            previousCount: item.expectedCount,
            newCount: item.actualCount,
            difference: diff,
            financialImpact: value,
            date: inventoryCountData.date,
            notes: inventoryCountData.notes || "Inventory count adjustment",
            // Add transaction type for P&L reporting
            transactionType: diff < 0 ? 'INVENTORY_SHORTAGE' : 'INVENTORY_OVERAGE'
          };
        });
      
      if (adjustments.length === 0) {
        toast({
          title: "No Adjustments Needed",
          description: "All counted quantities match expected values.",
        });
        setShowInventoryCount(false);
        return;
      }
      
      // Calculate financial impact
      const totalShortage = adjustments
        .filter(a => a.difference < 0)
        .reduce((sum, a) => sum + Math.abs(a.financialImpact), 0);
        
      const totalOverage = adjustments
        .filter(a => a.difference > 0)
        .reduce((sum, a) => sum + a.financialImpact, 0);
      
      const netImpact = totalOverage - totalShortage;
      
      // Create a reference ID for this inventory count
      const countReference = `INV-COUNT-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
      
      // 1. Update product stock levels on the server
      const stockUpdatePromises = adjustments.map(adjustment =>
        updateStock({
          productId: adjustment.productId,
          stock: adjustment.newCount,
          notes: `Adjusted from ${adjustment.previousCount} to ${adjustment.newCount} during inventory count (${countReference})`
        })
      );
      
      // Wait for all stock updates to complete
      await Promise.all(stockUpdatePromises);
      
      // 2. Record financial transactions for P&L reporting
      
      // Record shortages as expenses in P&L
      if (totalShortage > 0) {
        await addExpense({
          description: `Inventory shortage from count on ${inventoryCountData.date}`,
          amount: totalShortage,
          category: 'Inventory Adjustments',
          date: inventoryCountData.date,
          notes: `Reference: ${countReference}. Affected products: ${
            adjustments
              .filter(a => a.difference < 0)
              .map(a => a.productName)
              .join(', ')
          }`
        });
      }
      
      // Record overages as a special category of expense (since the system doesn't support negative expenses)
      // This will be treated as income in financial reports
      if (totalOverage > 0) {
        await addExpense({
          description: `Inventory overage income from count on ${inventoryCountData.date}`,
          amount: totalOverage, // Positive amount (the model requires amount >= 0)
          category: 'Inventory Overage Income', // Special category to identify this as income
          date: inventoryCountData.date,
          notes: `INCOME ENTRY (not an expense). Reference: ${countReference}. Affected products: ${
            adjustments
              .filter(a => a.difference > 0)
              .map(a => a.productName)
              .join(', ')
          }`
        });
      }
      
      toast({
        title: "Inventory Adjusted",
        description: `${adjustments.length} products updated. Net financial impact: ${formatCurrency(netImpact)}. These adjustments will appear in the P&L report.`,
      });
      
      // Refresh product data from the server to ensure we have the latest stock levels
      const productsData = await getProducts();
      setProducts(productsData.products);
      
      setShowInventoryCount(false);
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      toast({
        variant: "destructive",
        title: "Adjustment Failed",
        description: "Failed to process inventory adjustments. Please try again.",
      });
    }
  };


  // Calculate inventory summary
  const inventorySummary = {
    totalProducts: products.length,
    totalItems: products.reduce((sum, product) => sum + product.stock, 0),
    totalValue: products.reduce((sum, product) => sum + (product.stock * product.purchasePrice), 0),
    lowStockCount: lowStockAlerts.length
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading inventory..." />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <ErrorState
        title="Inventory Error"
        message={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("inventory.title")}</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("action.search") + " " + t("inventory.product") + "..."}
                className="w-[250px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setAddingProduct(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("inventory.addProduct")}
            </Button>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                {t("action.export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t("action.exportOptions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className="mr-2 h-4 w-4" />
                {t("action.exportAsCsv")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                {t("action.exportAsPdf")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={handleInventoryCount}>
            <ClipboardList className="mr-2 h-4 w-4" />
            {t("inventory.count")}
          </Button>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("inventory.totalProducts")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("inventory.totalItems")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("inventory.value")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventorySummary.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("inventory.lowStock")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary.lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">{t("tabs.products")}</TabsTrigger>
          <TabsTrigger value="alerts">{t("tabs.alerts")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("tabs.products")}</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        {t("inventory.product")}
                        {sortField === 'name' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('code')}
                    >
                      <div className="flex items-center">
                        Code
                        {sortField === 'code' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center">
                        {t("inventory.price")}
                        {sortField === 'price' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('stock')}
                    >
                      <div className="flex items-center">
                        {t("inventory.quantity")}
                        {sortField === 'stock' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center">
                        {t("inventory.category")}
                        {sortField === 'category' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('supplier')}
                    >
                      <div className="flex items-center">
                        {t("inventory.supplier")}
                        {sortField === 'supplier' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.code}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.stock <= product.reorderPoint ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : product.stock <= product.reorderPoint * 2 ? (
                            <Package className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Package className="h-4 w-4 text-green-500" />
                          )}
                          {product.stock}
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.supplier}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product)
                              setEditingProduct(true)
                            }}
                          >
                            {t("action.edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product)
                              setRestocking(true)
                            }}
                          >
                            {t("action.restock")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredProducts.length, currentPage * itemsPerPage)} of {filteredProducts.length} products
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockAlerts.map((alert) => {
                    const product = products.find(p => p._id === alert._id);
                    return (
                      <TableRow key={alert._id}>
                        <TableCell className="font-medium">{alert.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-red-500 font-medium">{alert.stock}</span>
                            <Progress
                              value={(alert.stock / alert.threshold) * 100}
                              className="w-20 h-2 [&>div]:bg-red-500"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{alert.threshold}</TableCell>
                        <TableCell>
                          {product && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product)
                                setRestocking(true)
                              }}
                            >
                              Restock
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {lowStockAlerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No low stock alerts
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Restock History
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={restockHistoryDateRange}
                  onValueChange={(value: "all" | "week" | "month" | "custom") => setRestockHistoryDateRange(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {restockHistoryDateRange === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      className="w-[140px]"
                      value={customDateRange.from}
                      onChange={(e) => setCustomDateRange({...customDateRange, from: e.target.value})}
                    />
                    <span className="text-sm">to</span>
                    <Input
                      type="date"
                      className="w-[140px]"
                      value={customDateRange.to}
                      onChange={(e) => setCustomDateRange({...customDateRange, to: e.target.value})}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRestockHistory.length > 0 ? (
                    filteredRestockHistory.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          {format(new Date(record.date), "PPP")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.productName}
                        </TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{formatCurrency(record.unitCost)}</TableCell>
                        <TableCell>{formatCurrency(record.totalCost)}</TableCell>
                        <TableCell>{record.supplierName}</TableCell>
                        <TableCell>{record.invoiceNumber}</TableCell>
                        <TableCell>{record.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                        No restock history found for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Category Distribution
                </CardTitle>
                <CardDescription>
                  Inventory value by product category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categorySummary?.map((category) => (
                    <div key={category.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {category.count} products | {formatCurrency(category.value)}
                        </span>
                      </div>
                      <Progress
                        value={(category.value / inventorySummary.totalValue) * 100}
                        className={`h-2 ${
                          category.name === "Electronics" ? "[&>div]:bg-blue-500" :
                          category.name === "Clothing" ? "[&>div]:bg-green-500" :
                          category.name === "Food" ? "[&>div]:bg-amber-500" :
                          "[&>div]:bg-slate-500"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stock Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Stock Status Overview
                </CardTitle>
                <CardDescription>
                  Current inventory status breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="flex flex-col items-center p-4 border rounded-lg">
                    <Badge className="bg-red-100 text-red-800 mb-2">Low</Badge>
                    <span className="text-2xl font-bold">{lowStockAlerts.length}</span>
                    <span className="text-sm text-muted-foreground">Products</span>
                  </div>
                  <div className="flex flex-col items-center p-4 border rounded-lg">
                    <Badge className="bg-green-100 text-green-800 mb-2">Normal</Badge>
                    <span className="text-2xl font-bold">
                      {products.filter(p => p.stock > p.reorderPoint && p.stock <= p.reorderPoint * 2).length}
                    </span>
                    <span className="text-sm text-muted-foreground">Products</span>
                  </div>
                  <div className="flex flex-col items-center p-4 border rounded-lg">
                    <Badge className="bg-blue-100 text-blue-800 mb-2">Excess</Badge>
                    <span className="text-2xl font-bold">
                      {products.filter(p => p.stock > p.reorderPoint * 2).length}
                    </span>
                    <span className="text-sm text-muted-foreground">Products</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Top Products by Value</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products
                        .sort((a, b) => (b.stock * b.purchasePrice) - (a.stock * a.purchasePrice))
                        .slice(0, 5)
                        .map(product => (
                          <TableRow key={product._id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.stock * product.purchasePrice)}
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Inventory Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restockHistory.slice(0, 5).map(record => (
                      <TableRow key={record._id}>
                        <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">Restock</Badge>
                        </TableCell>
                        <TableCell>{record.productName}</TableCell>
                        <TableCell>+{record.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.totalCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addingProduct} onOpenChange={setAddingProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter the product details below to add it to inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Code</label>
                <Input
                  value={newProduct.code}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, code: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Barcode</label>
                <Input
                  value={newProduct.barcode}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, barcode: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (TSh)</label>
                <Input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Price (TSh)</label>
                <Input
                  type="number"
                  value={newProduct.purchasePrice}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, purchasePrice: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Stock</label>
                <Input
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, stock: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reorder Point</label>
                <Input
                  type="number"
                  value={newProduct.reorderPoint}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, reorderPoint: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category <span style={{color: 'red'}}>*</span></label>
              <Select
                value={newProduct.category}
                onValueChange={(value) =>
                  setNewProduct({ ...newProduct, category: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {productCategories.length > 0 ? (
                    productCategories.map((category) => (
                      <SelectItem key={category._id} value={category.name}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: category.color || '#3b82f6' }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="Other">Other</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {(!newProduct.category) && (
                <div style={{color: 'red', fontSize: '0.9em'}}>Category is required</div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Input
                value={newProduct.supplier}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, supplier: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingProduct(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingProduct} onOpenChange={setEditingProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={selectedProduct.name}
                  onChange={(e) =>
                    setSelectedProduct({ ...selectedProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code</label>
                  <Input
                    value={selectedProduct.code}
                    onChange={(e) =>
                      setSelectedProduct({ ...selectedProduct, code: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Barcode</label>
                  <Input
                    value={selectedProduct.barcode}
                    onChange={(e) =>
                      setSelectedProduct({ ...selectedProduct, barcode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (TSh)</label>
                  <Input
                    type="number"
                    value={selectedProduct.price}
                    onChange={(e) =>
                      setSelectedProduct({ ...selectedProduct, price: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purchase Price (TSh)</label>
                  <Input
                    type="number"
                    value={selectedProduct.purchasePrice}
                    onChange={(e) =>
                      setSelectedProduct({ ...selectedProduct, purchasePrice: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stock</label>
                  <Input
                    type="number"
                    value={selectedProduct.stock}
                    onChange={(e) =>
                      setSelectedProduct({ ...selectedProduct, stock: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reorder Point</label>
                  <Input
                    type="number"
                    value={selectedProduct.reorderPoint}
                    onChange={(e) =>
                      setSelectedProduct({ ...selectedProduct, reorderPoint: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={selectedProduct.category}
                  onValueChange={(value) =>
                    setSelectedProduct({ ...selectedProduct, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.length > 0 ? (
                      productCategories.map((category) => (
                        <SelectItem key={category._id} value={category.name}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: category.color || '#3b82f6' }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="Other">Other</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier</label>
                <Input
                  value={selectedProduct.supplier}
                  onChange={(e) =>
                    setSelectedProduct({ ...selectedProduct, supplier: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProduct}>Update Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restocking} onOpenChange={setRestocking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Enter restock details for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                value={restockData.quantity}
                onChange={(e) =>
                  setRestockData({ ...restockData, quantity: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Cost (TSh)</label>
              <Input
                type="number"
                value={restockData.unitCost || (selectedProduct ? selectedProduct.purchasePrice : '')}
                onChange={(e) =>
                  setRestockData({ ...restockData, unitCost: e.target.value })
                }
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground mt-1">
                  Previous buying price: {formatCurrency(selectedProduct.purchasePrice)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Selling Price (TSh)</label>
              <Input
                type="number"
                value={restockData.sellingPrice || (selectedProduct ? selectedProduct.price : '')}
                onChange={(e) =>
                  setRestockData({ ...restockData, sellingPrice: e.target.value })
                }
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current selling price: {formatCurrency(selectedProduct.price)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Number</label>
              <Input
                value={restockData.invoiceNumber}
                onChange={(e) =>
                  setRestockData({ ...restockData, invoiceNumber: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={restockData.notes}
                onChange={(e) =>
                  setRestockData({ ...restockData, notes: e.target.value })
                }
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestocking(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestock}>Restock Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory Count Dialog */}
      <Dialog open={showInventoryCount} onOpenChange={setShowInventoryCount}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Inventory Count</DialogTitle>
            <DialogDescription>
              Verify and update actual inventory quantities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Count Date</label>
                <Input
                  type="date"
                  value={inventoryCountData.date}
                  onChange={(e) =>
                    setInventoryCountData({ ...inventoryCountData, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={inventoryCountData.notes}
                  onChange={(e) =>
                    setInventoryCountData({ ...inventoryCountData, notes: e.target.value })
                  }
                  placeholder="Any notes about this count..."
                />
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Expected Count</TableHead>
                    <TableHead className="text-right">Actual Count</TableHead>
                    <TableHead className="text-right">Discrepancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryCountData.products.slice(0, 10).map((item, index) => (
                    <TableRow key={item.productId}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right">{item.expectedCount}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-20 text-right ml-auto"
                          value={item.actualCount}
                          onChange={(e) => {
                            const newProducts = [...inventoryCountData.products];
                            newProducts[index].actualCount = Number(e.target.value);
                            setInventoryCountData({
                              ...inventoryCountData,
                              products: newProducts
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          item.actualCount === item.expectedCount ? "text-green-500" :
                          item.actualCount > item.expectedCount ? "text-blue-500" : "text-red-500"
                        }>
                          {item.actualCount - item.expectedCount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {inventoryCountData.products.length > 10 && (
                <div className="text-center text-sm text-muted-foreground mt-4">
                  Showing 10 of {inventoryCountData.products.length} products
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Inventory Adjustment Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 border rounded-md p-3">
                <h5 className="text-sm font-medium">Stock Adjustments</h5>
                <p className="text-sm text-muted-foreground">
                  When you save this count, stock levels will be updated to match the actual counts.
                  This ensures your inventory records accurately reflect physical inventory.
                </p>
              </div>
              <div className="space-y-2 border rounded-md p-3">
                <h5 className="text-sm font-medium">Financial Impact</h5>
                <p className="text-sm text-muted-foreground">
                  Inventory discrepancies will be recorded as inventory adjustments:
                  <br />• Negative adjustments (shortages) will be recorded as expenses in "Inventory Adjustments" category
                  <br />• Positive adjustments (overages) will be recorded as income in "Inventory Overage Income" category
                  <br /><br />
                  <span className="font-medium">These adjustments will appear in the P&L tab under Reports</span> in their respective categories.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInventoryCount(false)}>
              Cancel
            </Button>
            <Button onClick={handleInventoryAdjustment}>
              Save Count & Adjust Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}