import { useState, useEffect } from "react"
import { getProducts, addToCart, processPayment, getProductByBarcode } from "@/api/products"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCustomers, addCustomer } from "@/api/customers"
import { getRecentSales, generateReceipt } from "@/api/sales"
import { getSettings, PaymentSettings } from "@/api/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/useToast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ShoppingCart, CreditCard, Percent, Ban, Clock, Printer, UserPlus, Barcode } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { formatDistanceToNow } from "date-fns"
import { Label } from "@/components/ui/label"

type Product = {
  _id: string
  name: string
  code: string
  price: number
  stock: number
}

type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

type Customer = {
  _id: string
  name: string
  type: "cash" | "credit"
  creditLimit?: number
}

type Sale = {
  _id: string
  items: Array<{ name: string; quantity: number; price: number }>
  subtotal: number
  tax: number
  taxRate: number
  total: number
  paymentMethod: string
  date: string
}

export function POS() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [amountPaid, setAmountPaid] = useState("")
  const [transactionNumber, setTransactionNumber] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [taxRate, setTaxRate] = useState("0") // Default to 0 (no tax)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [receiptContent, setReceiptContent] = useState("")
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState("")
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    acceptCash: true,
    acceptCard: true,
    acceptMobile: true,
    acceptCredit: true,
    defaultPaymentMethod: "cash",
  })
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    type: "cash" as "cash" | "credit",
    email: "",
    phone: "",
    creditLimit: ""
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productsData, customersData, salesData, settingsData] = await Promise.all([
          getProducts(),
          getCustomers(),
          getRecentSales(),
          getSettings()
        ])
        setProducts(productsData.products)
        setCustomers(customersData.customers)
        setRecentSales(salesData.sales)
        
        // Apply settings
        if (settingsData.settings.tax && settingsData.settings.tax.enableTax) {
          setTaxRate(settingsData.settings.tax.defaultTaxRate)
          // Store tax settings in localStorage for calculations
          localStorage.setItem('taxSettings', JSON.stringify({
            taxIncluded: settingsData.settings.tax.taxIncluded || false,
            enableTax: settingsData.settings.tax.enableTax || false,
            defaultTaxRate: settingsData.settings.tax.defaultTaxRate || 0
          }))
        }
        
        // Apply payment settings
        if (settingsData.settings.payment) {
          setPaymentSettings(settingsData.settings.payment)
          // Set default payment method if available
          if (settingsData.settings.payment.defaultPaymentMethod) {
            setPaymentMethod(settingsData.settings.payment.defaultPaymentMethod)
          }
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch initial data",
        })
      }
    }
    fetchInitialData()

    // Refresh recent sales every minute
    const interval = setInterval(async () => {
      try {
        const salesData = await getRecentSales()
        setRecentSales(salesData.sales)
      } catch (error) {
        console.error("Failed to refresh recent sales:", error)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Set amount paid to total when payment dialog opens
  useEffect(() => {
    if (showPaymentDialog) {
      setAmountPaid(calculateTotal().toString())
    }
  }, [showPaymentDialog])

  const handleSearch = async () => {
    try {
      if (searchTerm.length === 13) {
        // Assuming barcode is 13 digits
        const { product } = await getProductByBarcode(searchTerm)
        if (product) {
          handleAddToCart(product)
        }
      }
    } catch (err) {
      console.error('Product not found:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product not found",
      })
    }
  }

  const handleBarcodeSearch = async () => {
    try {
      if (scannedBarcode) {
        const { product } = await getProductByBarcode(scannedBarcode)
        if (product) {
          handleAddToCart(product)
          setScannedBarcode("")
          setShowBarcodeScanner(false)
          toast({
            title: "Product Added",
            description: `${product.name} has been added to the cart`,
          })
        }
      }
    } catch (err) {
      console.error('Product not found:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product not found with the scanned barcode",
      })
    }
  }

  const handleAddToCart = async (product: Product) => {
    try {
      const existingItem = cart.find((item) => item.productId === product._id)
      if (existingItem) {
        const updatedCart = cart.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        setCart(updatedCart)
      } else {
        const newItem = {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
        }
        setCart([...cart, newItem])
      }
      await addToCart({ productId: product._id, quantity: 1 })
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item to cart",
      })
    }
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId))
  }

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const calculateTotal = () => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    const discount = Number(discountAmount) || 0
    
    // Get tax settings from the server
    const taxRateDecimal = Number(taxRate) / 100 // Convert percentage to decimal
    const taxSettings = JSON.parse(localStorage.getItem('taxSettings') || '{"taxIncluded":false}')
    
    let tax = 0
    if (taxSettings.taxIncluded) {
      // If tax is included in price, extract it from the subtotal
      // Formula: tax = subtotal - (subtotal / (1 + taxRateDecimal))
      tax = subtotal - (subtotal / (1 + taxRateDecimal))
    } else {
      // If tax is not included, calculate it normally
      tax = subtotal * taxRateDecimal
    }
    
    // If tax is included in price, don't add it to the subtotal
    // Just subtract the discount from the subtotal
    return taxSettings.taxIncluded ? subtotal - discount : subtotal + tax - discount
  }

  const handlePrintReceipt = async (saleId: string) => {
    try {
      const { receipt } = await generateReceipt(saleId)
      setReceiptContent(receipt)
      setShowReceiptDialog(true)
    } catch (err) {
      console.error('Failed to generate receipt:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate receipt",
      })
    }
  }

  const handleProcessPayment = async () => {
    try {
      const total = calculateTotal()
      if (!selectedCustomer) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a customer",
        })
        return
      }

      // Validate cash payment
      if (paymentMethod === "cash" && Number(amountPaid) < total) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Insufficient payment amount",
        })
        return
      }

      // Validate payment method is enabled
      if ((paymentMethod === "cash" && !paymentSettings.acceptCash) ||
          (paymentMethod === "card" && !paymentSettings.acceptCard) ||
          (paymentMethod === "mobile" && !paymentSettings.acceptMobile) ||
          (paymentMethod === "credit" && !paymentSettings.acceptCredit)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Selected payment method is not enabled in settings",
        })
        return
      }

      // Validate transaction number for card and mobile payments
      if ((paymentMethod === "card" || paymentMethod === "mobile") && !transactionNumber) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Please enter a transaction number for ${paymentMethod === "card" ? "card" : "mobile money"} payment`,
        })
        return
      }

      // Validate credit payment
      if (paymentMethod === "credit") {
        const selectedCustomerData = customers.find(c => c._id === selectedCustomer)
        
        if (!selectedCustomerData) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Customer not found",
          })
          return
        }
        
        if (selectedCustomerData.type !== "credit") {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Selected customer is not a credit customer",
          })
          return
        }
      }

      // For credit payments, set amountPaid to the total
      const paymentAmount = paymentMethod === "cash"
        ? Number(amountPaid)
        : calculateTotal();

      // Get tax settings from localStorage
      const taxSettings = JSON.parse(localStorage.getItem('taxSettings') || '{"taxIncluded":false}');
      
      const response = await processPayment({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod,
        customerId: selectedCustomer,
        discounts: discountAmount
          ? [{ type: "fixed", amount: Number(discountAmount) }]
          : [],
        taxRate: Number(taxRate) / 100, // Convert percentage to decimal
        taxIncluded: taxSettings.taxIncluded, // Pass whether tax is included in price
        amountPaid: paymentAmount,
        transactionNumber: (paymentMethod === "card" || paymentMethod === "mobile") ? transactionNumber : undefined,
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Payment processed successfully",
        })

        // Generate receipt
        await handlePrintReceipt(response.orderId)

        // Reset cart and form
        setCart([])
        setDiscountAmount("")
        setAmountPaid("")
        setTransactionNumber("")
        setShowPaymentDialog(false)

        // Refresh recent sales
        const salesData = await getRecentSales()
        setRecentSales(salesData.sales)
      }
    } catch (err) {
      console.error('Failed to process payment:', err);
      
      // Extract the error message from the Axios error
      let errorMessage = 'Failed to process payment';
      
      if (err instanceof Error) {
        // Check if it's an Axios error with a response
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else {
          errorMessage = err.message;
        }
      }
      
      // Check if the error message contains information about stock
      const isStockError = errorMessage.toLowerCase().includes('not enough stock') ||
                          errorMessage.toLowerCase().includes('stock');
      
      toast({
        variant: "destructive",
        title: isStockError ? "Stock Error" : "Payment Error",
        description: errorMessage,
      })
    }
  }

  const handleAddNewCustomer = async () => {
    try {
      // Validate required fields
      if (!newCustomer.name) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Customer name is required",
        })
        return
      }

      // Convert creditLimit to number if provided
      const customerData = {
        ...newCustomer,
        creditLimit: newCustomer.creditLimit ? Number(newCustomer.creditLimit) : undefined
      }

      const response = await addCustomer(customerData)

      if (response.success) {
        toast({
          title: "Success",
          description: "Customer added successfully",
        })

        // Add the new customer to the list and select it
        setCustomers([...customers, response.customer])
        setSelectedCustomer(response.customer._id)
        
        // Reset form and close dialog
        setNewCustomer({
          name: "",
          type: "cash",
          email: "",
          phone: "",
          creditLimit: ""
        })
        setShowAddCustomerDialog(false)
      }
    } catch (err) {
      console.error('Failed to add customer:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add customer",
      })
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="flex-1 space-y-4 lg:space-y-6 order-2 lg:order-1">
        <Card>
          <CardHeader className="py-3 lg:py-6">
            <CardTitle>{t("pos.products")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 lg:mb-6">
              <div className="flex-1">
                <Input
                  placeholder={t("pos.searchProducts")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="flex-1 sm:flex-none">
                  <Search className="h-4 w-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">Search</span>
                </Button>
                <Button variant="outline" onClick={() => setShowBarcodeScanner(true)} title="Scan Barcode" className="flex-1 sm:flex-none">
                  <Barcode className="h-4 w-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">Scan</span>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {products
                .filter((product) =>
                  product.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((product) => (
                  <Card
                    key={product._id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleAddToCart(product)}
                  >
                    <CardContent className="p-3 lg:p-4">
                      <div className="font-medium text-sm sm:text-base truncate">{product.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {product.code}
                      </div>
                      <div className="mt-1 lg:mt-2 font-bold text-sm sm:text-base">{formatCurrency(product.price)}</div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hidden md:block">
          <CardHeader className="py-3 lg:py-6">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("pos.recentSales")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell>{formatDistanceToNow(new Date(sale.date), { addSuffix: true })}</TableCell>
                      <TableCell>
                        {sale.items.map((item) => (
                          <div key={item.name} className="text-sm">
                            {item.quantity}x {item.name}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        {sale.taxRate ? `${sale.taxRate}% (${formatCurrency(sale.tax || 0)})` : '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintReceipt(sale._id)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full lg:w-96 space-y-4 lg:space-y-6 order-1 lg:order-2">
        <Card>
          <CardHeader className="py-3 lg:py-6">
            <CardTitle>{t("pos.shoppingCart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 lg:space-y-6">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    onValueChange={(value) => setSelectedCustomer(value)}
                    value={selectedCustomer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("pos.selectCustomer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAddCustomerDialog(true)}
                  aria-label="Add Customer"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 lg:space-y-4 max-h-[40vh] lg:max-h-[50vh] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {t("pos.emptyCart")}
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">{item.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {formatCurrency(item.price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            handleQuantityChange(item.productId, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          -
                        </Button>
                        <span className="w-6 sm:w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            handleQuantityChange(item.productId, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                        >
                          +
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleRemoveFromCart(item.productId)}
                          aria-label="Remove item"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Discount amount"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDiscountAmount("")}
                    aria-label="Clear discount"
                  >
                    <Percent className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Tax rate (%)"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTaxRate("0")}
                    aria-label="Clear tax"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex justify-between font-bold py-2 text-base sm:text-lg">
                  <span>{t("pos.total")}:</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={cart.length === 0}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {t("pos.checkout")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("pos.addCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="name">{t("pos.customerName")} *</Label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder="Customer name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">{t("pos.customerType")}</Label>
              <Select
                value={newCustomer.type}
                onValueChange={(value: "cash" | "credit") => setNewCustomer({...newCustomer, type: value})}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">{t("pos.email")}</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                placeholder="Email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">{t("pos.phone")}</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                placeholder="Phone number"
              />
            </div>
            
            {newCustomer.type === "credit" && (
              <div className="space-y-2">
                <Label htmlFor="creditLimit">{t("pos.creditLimit")}</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={newCustomer.creditLimit}
                  onChange={(e) => setNewCustomer({...newCustomer, creditLimit: e.target.value})}
                  placeholder="Credit limit"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddCustomerDialog(false)} className="sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleAddNewCustomer} className="sm:order-2">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("pos.payment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <Select
              onValueChange={setPaymentMethod}
              defaultValue={paymentMethod}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pos.paymentMethod")} />
              </SelectTrigger>
              <SelectContent>
                {paymentSettings.acceptCash && <SelectItem value="cash">Cash</SelectItem>}
                {paymentSettings.acceptCard && <SelectItem value="card">Card</SelectItem>}
                {paymentSettings.acceptMobile && <SelectItem value="mobile">Mobile Money</SelectItem>}
                {paymentSettings.acceptCredit && <SelectItem value="credit">Credit</SelectItem>}
              </SelectContent>
            </Select>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <Label className="text-sm font-medium">{t("pos.amountPaid")}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmountPaid(calculateTotal().toString())}
                  >
                    {t("pos.payFullAmount")}
                  </Button>
                </div>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
                {Number(amountPaid) > calculateTotal() && (
                  <div className="text-sm font-medium bg-muted p-2 rounded-md">
                    {t("pos.change")}: {formatCurrency(Number(amountPaid) - calculateTotal())}
                  </div>
                )}
              </div>
            )}

            {(paymentMethod === "card" || paymentMethod === "mobile") && (
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Transaction Number</Label>
                  <Input
                    value={transactionNumber}
                    onChange={(e) => setTransactionNumber(e.target.value)}
                    placeholder={paymentMethod === "card" ? "Card transaction reference" : "Mobile money transaction ID"}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <Label className="text-sm font-medium">{t("pos.amountPaid")}</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountPaid(calculateTotal().toString())}
                    >
                      {t("pos.payFullAmount")}
                    </Button>
                  </div>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </div>
              </div>
            )}

            {paymentMethod === "credit" && (
              <div className="space-y-2">
                {selectedCustomer ? (
                  <>
                    {customers.find(c => c._id === selectedCustomer)?.type !== "credit" ? (
                      <div className="text-red-500 text-sm p-2 border border-red-200 rounded-md bg-red-50 dark:bg-red-950 dark:border-red-800">
                        Warning: Selected customer is not a credit customer. Please select a credit customer or change payment method.
                      </div>
                    ) : (
                      <div className="text-sm p-3 bg-muted rounded-md">
                        <p>This will be added to the customer's credit balance.</p>
                        <p className="font-medium mt-2">Amount to be charged: {formatCurrency(calculateTotal())}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-red-500 text-sm p-2 border border-red-200 rounded-md bg-red-50 dark:bg-red-950 dark:border-red-800">
                    Please select a customer for credit payment.
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleProcessPayment} className="sm:order-2">
              <CreditCard className="mr-2 h-4 w-4" />
              {t("pos.processPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("pos.receipt")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <pre className="font-mono text-xs sm:text-sm whitespace-pre-wrap bg-muted p-3 sm:p-4 rounded-md">
              {receiptContent}
            </pre>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)} className="sm:order-1">
              Close
            </Button>
            <Button onClick={() => window.print()} className="sm:order-2">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Barcode Scanner</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("pos.scanBarcode")}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  placeholder="Enter or scan barcode..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && handleBarcodeSearch()}
                />
                <Button variant="outline" onClick={() => {
                  toast({
                    title: "Scanner Activated",
                    description: "Camera would be activated for barcode scanning",
                  });
                }} className="sm:flex-none">
                  <Barcode className="h-4 w-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">Scan</span>
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowBarcodeScanner(false)} className="sm:order-1">
              Cancel
            </Button>
            {scannedBarcode && (
              <Button onClick={handleBarcodeSearch} className="sm:order-2">
                {t("pos.findProduct")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}