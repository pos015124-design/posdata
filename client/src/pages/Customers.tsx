import { useState, useEffect } from "react"
import { getCustomers, updateCustomer, deleteCustomer, addCustomer } from "@/api/customers"
import { getCustomerPayments, addPayment, deletePayment } from "@/api/customerPayments"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRecentSales } from "@/api/sales"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Edit,
  Trash2,
  CreditCard,
  UserPlus,
  RefreshCw,
  Eye
} from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { formatDistanceToNow } from "date-fns"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type Customer = {
  _id: string
  name: string
  type: "cash" | "credit"
  email?: string
  phone?: string
  creditLimit: number
  currentCredit: number
  createdAt: string
  updatedAt: string
}

type Sale = {
  _id: string
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
  paymentMethod: string
  date: string
  customer?: {
    _id: string
    name: string
  }
}

type Payment = {
  _id: string
  customer: string
  amount: number
  paymentMethod: string
  reference?: string
  notes?: string
  date: string
  createdAt: string
}

export function Customers() {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "credit" | "cash">("all")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSales, setCustomerSales] = useState<Sale[]>([])
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [editCustomer, setEditCustomer] = useState<Partial<Customer>>({
    name: "",
    type: "cash",
    email: "",
    phone: "",
    creditLimit: 0
  })
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    type: "cash" as "cash" | "credit",
    email: "",
    phone: "",
    creditLimit: ""
  })
  const [newPayment, setNewPayment] = useState({
    amount: "",
    paymentMethod: "cash" as "cash" | "bank" | "mobile_money" | "other",
    reference: "",
    notes: ""
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerSales(selectedCustomer._id)
      fetchCustomerPayments(selectedCustomer._id)
    }
  }, [selectedCustomer])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchTerm, filterType])

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers()
      setCustomers(response.customers || [])
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      setCustomers([])
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch customers"
      })
    }
  }

  const fetchCustomerSales = async (customerId: string) => {
    try {
      const response = await getRecentSales()
      // Filter sales for this customer
      const customerSales = (response.sales || []).filter(
        (sale: Sale) => sale.customer && sale.customer._id === customerId
      )
      setCustomerSales(customerSales)
    } catch (error) {
      console.error('Failed to fetch customer sales:', error)
      setCustomerSales([])
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch customer sales"
      })
    }
  }

  const fetchCustomerPayments = async (customerId: string) => {
    try {
      const response = await getCustomerPayments(customerId)
      setCustomerPayments(response.payments || [])
    } catch (error) {
      console.error('Failed to fetch customer payments:', error)
      setCustomerPayments([])
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch customer payments"
      })
    }
  }

  const filterCustomers = () => {
    let filtered = customers

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(customer => customer.type === filterType)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        customer =>
          customer.name.toLowerCase().includes(term) ||
          (customer.email && customer.email.toLowerCase().includes(term)) ||
          (customer.phone && customer.phone.toLowerCase().includes(term))
      )
    }

    setFilteredCustomers(filtered)
  }

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return

    try {
      const response = await updateCustomer(selectedCustomer._id, editCustomer)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Customer updated successfully"
        })
        
        // Update the customers list
        setCustomers(customers.map(c => 
          c._id === selectedCustomer._id ? response.customer : c
        ))
        
        setShowEditDialog(false)
      }
    } catch (error) {
      console.error('Failed to update customer:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update customer"
      })
    }
  }

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return

    try {
      const response = await deleteCustomer(selectedCustomer._id)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Customer deleted successfully"
        })
        
        // Remove from the customers list
        setCustomers(customers.filter(c => c._id !== selectedCustomer._id))
        setSelectedCustomer(null)
        setShowDeleteDialog(false)
      }
    } catch (error) {
      console.error('Failed to delete customer:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete customer"
      })
    }
  }


  const handleAddPayment = async () => {
    if (!selectedCustomer) return

    try {
      const amount = parseFloat(newPayment.amount)
      
      if (isNaN(amount) || amount <= 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter a valid positive amount"
        })
        return
      }
      
      const paymentData = {
        customer: selectedCustomer._id,
        amount,
        paymentMethod: newPayment.paymentMethod,
        reference: newPayment.reference || undefined,
        notes: newPayment.notes || undefined
      }
      
      const response = await addPayment(paymentData)
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Payment of ${formatCurrency(amount)} recorded successfully`
        })
        
        // Refresh customer payments
        fetchCustomerPayments(selectedCustomer._id)
        
        // Also refresh the customer to get updated credit
        const updatedCustomers = await getCustomers()
        setCustomers(updatedCustomers.customers)
        
        // Update selected customer
        const updatedCustomer = updatedCustomers.customers.find((c: Customer) => c._id === selectedCustomer._id)
        if (updatedCustomer) {
          setSelectedCustomer(updatedCustomer)
        }
        
        // Reset form and close dialog
        setNewPayment({
          amount: "",
          paymentMethod: "cash",
          reference: "",
          notes: ""
        })
        setShowAddPaymentDialog(false)
      }
    } catch (error) {
      console.error('Failed to add payment:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add payment"
      })
    }
  }

  const handleDeletePayment = async () => {
    if (!selectedPayment) return

    try {
      const response = await deletePayment(selectedPayment._id)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Payment deleted successfully"
        })
        
        // Refresh customer payments
        if (selectedCustomer) {
          fetchCustomerPayments(selectedCustomer._id)
          
          // Also refresh the customer to get updated credit
          const updatedCustomers = await getCustomers()
          setCustomers(updatedCustomers.customers)
          
          // Update selected customer
          const updatedCustomer = updatedCustomers.customers.find((c: Customer) => c._id === selectedCustomer._id)
          if (updatedCustomer) {
            setSelectedCustomer(updatedCustomer)
          }
        }
        
        setSelectedPayment(null)
        setShowDeletePaymentDialog(false)
      }
    } catch (error) {
      console.error('Failed to delete payment:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete payment"
      })
    }
  }

  const handleAddCustomer = async () => {
    try {
      // Validate required fields
      if (!newCustomer.name) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Customer name is required"
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
          description: "Customer added successfully"
        })

        // Add the new customer to the list
        setCustomers([...customers, response.customer])
        
        // Reset form and close dialog
        setNewCustomer({
          name: "",
          type: "cash",
          email: "",
          phone: "",
          creditLimit: ""
        })
        setShowAddDialog(false)
      }
    } catch (error) {
      console.error('Failed to add customer:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add customer"
      })
    }
  }

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditCustomer({
      name: customer.name,
      type: customer.type,
      email: customer.email || "",
      phone: customer.phone || "",
      creditLimit: customer.creditLimit
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDeleteDialog(true)
  }

  // Remove unused function

  const openDetailsDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailsDialog(true)
  }

  const openAddPaymentDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    setNewPayment({
      amount: "",
      paymentMethod: "cash",
      reference: "",
      notes: ""
    })
    setShowAddPaymentDialog(true)
  }

  const openDeletePaymentDialog = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowDeletePaymentDialog(true)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{t("customers.title")}</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t("customers.addCustomer")}
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3 sm:py-6">
          <CardTitle>{t("customers.management")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <Input
                placeholder={t("customers.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 sm:flex-none sm:w-[180px]">
                <Select
                  value={filterType}
                  onValueChange={(value: "all" | "credit" | "cash") => setFilterType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("customers.filterByType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("customers.allCustomers")}</SelectItem>
                    <SelectItem value="credit">{t("customers.creditCustomers")}</SelectItem>
                    <SelectItem value="cash">{t("customers.cashCustomers")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={fetchCustomers} className="flex-none">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customers.name")}</TableHead>
                  <TableHead>{t("customers.type")}</TableHead>
                  <TableHead>{t("customers.contact")}</TableHead>
                  <TableHead>{t("customers.creditLimit")}</TableHead>
                  <TableHead>{t("customers.currentCredit")}</TableHead>
                  <TableHead>{t("customers.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      {t("customers.noCustomersFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer._id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <Badge variant={customer.type === "credit" ? "default" : "outline"}>
                          {customer.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.email && <div>{customer.email}</div>}
                          {customer.phone && <div>{customer.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.type === "credit"
                          ? formatCurrency(customer.creditLimit)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {customer.type === "credit"
                          ? formatCurrency(customer.currentCredit)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetailsDialog(customer)}
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(customer)}
                            aria-label="Edit customer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {customer.type === "credit" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openAddPaymentDialog(customer)}
                              aria-label="Add payment"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(customer)}
                            aria-label="Delete customer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View - Shown only on mobile */}
          <div className="md:hidden space-y-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {t("customers.noCustomersFound")}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer._id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium truncate mr-2">{customer.name}</div>
                      <Badge variant={customer.type === "credit" ? "default" : "outline"}>
                        {customer.type}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      {customer.email && (
                        <div className="col-span-2 truncate text-muted-foreground">
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="col-span-2 truncate text-muted-foreground">
                          {customer.phone}
                        </div>
                      )}
                      
                      {customer.type === "credit" && (
                        <>
                          <div className="text-muted-foreground">Credit Limit:</div>
                          <div className="font-medium text-right">
                            {formatCurrency(customer.creditLimit)}
                          </div>
                          <div className="text-muted-foreground">Current Credit:</div>
                          <div className="font-medium text-right">
                            {formatCurrency(customer.currentCredit)}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-1 border-t pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailsDialog(customer)}
                        aria-label="View details"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span className="text-xs">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(customer)}
                        aria-label="Edit customer"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        <span className="text-xs">Edit</span>
                      </Button>
                      {customer.type === "credit" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddPaymentDialog(customer)}
                          aria-label="Add payment"
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          <span className="text-xs">Pay</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(customer)}
                        aria-label="Delete customer"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        <span className="text-xs">Delete</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <div className="font-medium">{selectedCustomer.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Type</Label>
                    <div className="font-medium capitalize">{selectedCustomer.type}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <div className="font-medium">{selectedCustomer.email || "-"}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Phone</Label>
                    <div className="font-medium">{selectedCustomer.phone || "-"}</div>
                  </div>
                  {selectedCustomer.type === "credit" && (
                    <>
                      <div>
                        <Label className="text-sm text-muted-foreground">Credit Limit</Label>
                        <div className="font-medium">{formatCurrency(selectedCustomer.creditLimit)}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Current Credit</Label>
                        <div className="font-medium">{formatCurrency(selectedCustomer.currentCredit)}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Available Credit</Label>
                        <div className="font-medium">
                          {formatCurrency(selectedCustomer.creditLimit - selectedCustomer.currentCredit)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Credit Usage</Label>
                        <div className="font-medium">
                          {selectedCustomer.creditLimit > 0 
                            ? `${Math.round((selectedCustomer.currentCredit / selectedCustomer.creditLimit) * 100)}%` 
                            : "N/A"}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-sm text-muted-foreground">Created At</Label>
                    <div className="font-medium">
                      {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Last Updated</Label>
                    <div className="font-medium">
                      {new Date(selectedCustomer.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {selectedCustomer.type === "credit" && (
                  <div className="mt-6">
                    <Button onClick={() => openAddPaymentDialog(selectedCustomer)}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Record New Payment
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="transactions">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recent Transactions</h3>
                  {customerSales.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No transactions found for this customer
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Payment Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSales.map((sale) => (
                          <TableRow key={sale._id}>
                            <TableCell>{formatDistanceToNow(new Date(sale.date), { addSuffix: true })}</TableCell>
                            <TableCell>
                              {sale.items.map((item) => (
                                <div key={item.name} className="text-sm">
                                  {item.quantity}x {item.name}
                                </div>
                              ))}
                            </TableCell>
                            <TableCell>{formatCurrency(sale.total)}</TableCell>
                            <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="payments">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Payment History</h3>
                    {selectedCustomer.type === "credit" && (
                      <Button onClick={() => openAddPaymentDialog(selectedCustomer)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Record New Payment
                      </Button>
                    )}
                  </div>
                  {customerPayments.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No payment records found for this customer
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerPayments.map((payment) => (
                          <TableRow key={payment._id}>
                            <TableCell>{formatDistanceToNow(new Date(payment.date), { addSuffix: true })}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell className="capitalize">{payment.paymentMethod.replace('_', ' ')}</TableCell>
                            <TableCell>{payment.reference || "-"}</TableCell>
                            <TableCell>{payment.notes || "-"}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeletePaymentDialog(payment)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editCustomer.name}
                onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})}
                placeholder="Customer name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-type">Customer Type</Label>
              <Select
                value={editCustomer.type}
                onValueChange={(value: "cash" | "credit") => setEditCustomer({...editCustomer, type: value})}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editCustomer.email}
                onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
                placeholder="Email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editCustomer.phone}
                onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
                placeholder="Phone number"
              />
            </div>
            
            {editCustomer.type === "credit" && (
              <div className="space-y-2">
                <Label htmlFor="edit-creditLimit">Credit Limit</Label>
                <Input
                  id="edit-creditLimit"
                  type="number"
                  value={editCustomer.creditLimit}
                  onChange={(e) => setEditCustomer({...editCustomer, creditLimit: Number(e.target.value)})}
                  placeholder="Credit limit"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleEditCustomer} className="sm:order-2">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this customer?</p>
            {selectedCustomer && (
              <div className="font-medium">{selectedCustomer.name}</div>
            )}
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. All customer data will be permanently removed.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="sm:order-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCustomer} className="sm:order-2">
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
          </DialogHeader>
          {selectedCustomer && selectedCustomer.type === "credit" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Customer</Label>
                  <div className="font-medium">{selectedCustomer.name}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Current Credit</Label>
                  <div className="font-medium">{formatCurrency(selectedCustomer.currentCredit)}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Payment Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                  placeholder="Amount"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select
                  value={newPayment.paymentMethod}
                  onValueChange={(value: "cash" | "bank" | "mobile_money" | "other") =>
                    setNewPayment({...newPayment, paymentMethod: value})
                  }
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-reference">Reference (Optional)</Label>
                <Input
                  id="payment-reference"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment({...newPayment, reference: e.target.value})}
                  placeholder="Receipt number, transaction ID, etc."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notes (Optional)</Label>
                <Input
                  id="payment-notes"
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                  placeholder="Additional information"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddPaymentDialog(false)} className="sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleAddPayment} className="sm:order-2">
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Dialog */}
      <Dialog open={showDeletePaymentDialog} onOpenChange={setShowDeletePaymentDialog}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Payment Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this payment record?</p>
            {selectedPayment && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <div className="font-medium">{formatCurrency(selectedPayment.amount)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Date</Label>
                  <div className="font-medium">
                    {new Date(selectedPayment.date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Payment Method</Label>
                  <div className="font-medium capitalize">{selectedPayment.paymentMethod.replace('_', ' ')}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Reference</Label>
                  <div className="font-medium">{selectedPayment.reference || "-"}</div>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The payment record will be permanently removed and the customer's credit will be adjusted.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeletePaymentDialog(false)} className="sm:order-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePayment} className="sm:order-2">
              Delete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder="Customer name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Customer Type</Label>
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                placeholder="Email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                placeholder="Phone number"
              />
            </div>
            
            {newCustomer.type === "credit" && (
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Credit Limit</Label>
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
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} className="sm:order-2">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}