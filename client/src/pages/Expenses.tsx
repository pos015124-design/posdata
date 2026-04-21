import { useState, useEffect } from "react"
import { getExpenses, addExpense, getExpensesByDateRange } from "@/api/expenses"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/useToast"
import { useLanguage } from "@/contexts/LanguageContext"
import { format, subDays } from "date-fns"
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
import { DollarSign, Plus, RefreshCw, Filter } from "lucide-react"
import { formatCurrency } from "@/lib/format"

type Expense = {
  _id: string
  description: string
  amount: number
  category: string
  date: string
}

export function Expenses() {
  const { t } = useLanguage()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [addingExpense, setAddingExpense] = useState(false)
  const [dateRange, setDateRange] = useState<"all" | "day" | "week" | "month" | "custom">("all")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [customDateRange, setCustomDateRange] = useState<{ from: string, to: string }>({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd")
  })
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split('T')[0],
  })
  const { toast } = useToast()

  const fetchExpenses = async () => {
    try {
      let data;
      if (dateRange === 'custom') {
        data = await getExpensesByDateRange(customDateRange.from, customDateRange.to);
      } else {
        data = await getExpenses(dateRange);
      }
      setExpenses(data.expenses)
      setFilteredExpenses(data.expenses)
    } catch (err) {
      console.error("Error fetching expenses:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: t("expenses.failedToFetch"),
      })
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [dateRange, customDateRange])
  
  // Apply category filter
  useEffect(() => {
    let filtered = [...expenses];
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(expense =>
        expense.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    
    setFilteredExpenses(filtered);
  }, [categoryFilter, expenses]);

  const handleAddExpense = async () => {
    // Validate required fields
    if (!newExpense.description.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: t("expenses.descriptionRequired"),
      })
      return
    }
    if (!newExpense.category) {
      toast({
        variant: "destructive",
        title: "Error",
        description: t("expenses.categoryRequired"),
      })
      return
    }
    if (!newExpense.amount || isNaN(Number(newExpense.amount)) || Number(newExpense.amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: t("expenses.amountPositive"),
      })
      return
    }
    // Prepare payload: only send valid fields
    const payload: any = {
      description: newExpense.description.trim(),
      amount: Number(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date || new Date().toISOString().split('T')[0],
    }
    try {
      const response = await addExpense(payload)
      if (response.success) {
        toast({
          title: "Success",
          description: t("expenses.expenseAdded"),
        })
        setAddingExpense(false)
        setNewExpense({
          description: "",
          amount: "",
          category: "",
          date: new Date().toISOString().split('T')[0],
        })
        // Refresh expenses list with current date range
        await fetchExpenses()
      }
    } catch (err) {
      console.error("Error adding expense:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: t("expenses.failedToAdd"),
      })
    }
  }

  // Calculate total expenses, excluding inventory overages (which are actually income)
  const totalExpenses = filteredExpenses.reduce((sum, expense) => {
    // Exclude "Inventory Overage Income" category from expenses total
    if (expense.category === 'Inventory Overage Income') {
      return sum; // Don't add to expenses
    }
    return sum + expense.amount;
  }, 0);
  
  // Calculate total income from inventory overages
  const totalOverageIncome = filteredExpenses.reduce((sum, expense) => {
    if (expense.category === 'Inventory Overage Income') {
      return sum + expense.amount;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("expenses.title")}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchExpenses}
            title={t("expenses.refreshData")}
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Select
            value={dateRange}
            onValueChange={(value: "all" | "day" | "week" | "month" | "custom") => setDateRange(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("expenses.selectDateRange")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("expenses.allTime")}</SelectItem>
              <SelectItem value="day">{t("expenses.today")}</SelectItem>
              <SelectItem value="week">{t("expenses.thisWeek")}</SelectItem>
              <SelectItem value="month">{t("expenses.thisMonth")}</SelectItem>
              <SelectItem value="custom">{t("expenses.customRange")}</SelectItem>
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
              <span className="text-sm">{t("expenses.to")}</span>
              <Input
                type="date"
                className="w-[140px]"
                value={customDateRange.to}
                onChange={(e) => setCustomDateRange({...customDateRange, to: e.target.value})}
              />
            </div>
          )}
          <Button onClick={() => setAddingExpense(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("expenses.addExpense")}
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-3 items-center mt-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("expenses.filters")}:</span>
        </div>
        
        <Select value={categoryFilter || "all"} onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue placeholder={t("expenses.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("expenses.allCategories")}</SelectItem>
            <SelectItem value="Utilities">{t("expenses.utilities")}</SelectItem>
            <SelectItem value="Rent">{t("expenses.rent")}</SelectItem>
            <SelectItem value="Salary">{t("expenses.salary")}</SelectItem>
            <SelectItem value="Supplies">{t("expenses.supplies")}</SelectItem>
            <SelectItem value="Maintenance">{t("expenses.maintenance")}</SelectItem>
            <SelectItem value="Inventory Adjustments">{t("expenses.inventoryAdjustments")}</SelectItem>
            <SelectItem value="Inventory Overage Income">{t("expenses.inventoryOverageIncome")}</SelectItem>
            <SelectItem value="Other">{t("expenses.other")}</SelectItem>
          </SelectContent>
        </Select>
        
        {categoryFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoryFilter(null)}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            {t("expenses.resetFilter")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("expenses.totalExpenses")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        
        {totalOverageIncome > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{t("expenses.inventoryOverageIncome")}</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalOverageIncome)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("expenses.expenseHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("expenses.date")}</TableHead>
                <TableHead>{t("expenses.description")}</TableHead>
                <TableHead>{t("expenses.category")}</TableHead>
                <TableHead>{t("expenses.amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      {expense.category === 'Inventory Overage Income' ? (
                        <span className="text-green-600 font-medium">{expense.category} ({t("expenses.income")})</span>
                      ) : (
                        expense.category
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.category === 'Inventory Overage Income' ? (
                        <span className="text-green-600 font-medium">+{formatCurrency(expense.amount)}</span>
                      ) : (
                        formatCurrency(expense.amount)
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {t("expenses.noExpensesFound")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addingExpense} onOpenChange={setAddingExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("expenses.addExpense")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("expenses.description")}</label>
              <Input
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                placeholder={t("expenses.enterDescription")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("expenses.amount")} (TSh)</label>
              <Input
                type="number"
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, amount: e.target.value })
                }
                placeholder={t("expenses.enterAmount")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("expenses.category")}</label>
              <Select
                onValueChange={(value) =>
                  setNewExpense({ ...newExpense, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("expenses.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Utilities">{t("expenses.utilities")}</SelectItem>
                  <SelectItem value="Rent">{t("expenses.rent")}</SelectItem>
                  <SelectItem value="Salary">{t("expenses.salary")}</SelectItem>
                  <SelectItem value="Supplies">{t("expenses.supplies")}</SelectItem>
                  <SelectItem value="Maintenance">{t("expenses.maintenance")}</SelectItem>
                  <SelectItem value="Other">{t("expenses.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("expenses.date")}</label>
              <Input
                type="date"
                value={newExpense.date}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, date: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingExpense(false)}>
              {t("expenses.cancel")}
            </Button>
            <Button onClick={handleAddExpense}>{t("expenses.addExpense")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}