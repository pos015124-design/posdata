import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { DollarSign, Plus, Edit, Trash2, X, TrendingUp } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as expensesApi from '../api/expenses';

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [dateRange, setDateRange] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchExpenses();
  }, [dateRange]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await expensesApi.getExpenses(dateRange);
      setExpenses(response.expenses || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load expenses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await expensesApi.updateExpense(editingExpense._id, formData);
        toast({
          title: 'Success',
          description: 'Expense updated successfully',
        });
      } else {
        await expensesApi.addExpense(formData);
        toast({
          title: 'Success',
          description: 'Expense added successfully',
        });
      }
      setShowAddModal(false);
      setEditingExpense(null);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save expense',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      notes: expense.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expensesApi.deleteExpense(expenseId);
      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
      fetchExpenses();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Track your business expenses</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingExpense(null);
            setShowAddModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expense Summary</CardTitle>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="h-10 px-3 border rounded-md"
            >
              <option value="all">All Time</option>
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Expenses</p>
                  <p className="text-3xl font-bold mt-2">TZS {totalExpenses.toLocaleString()}</p>
                </div>
                <DollarSign className="w-12 h-12 opacity-50" />
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Transactions</p>
                  <p className="text-3xl font-bold mt-2">{expenses.length}</p>
                </div>
                <TrendingUp className="w-12 h-12 opacity-50" />
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Average Expense</p>
                  <p className="text-3xl font-bold mt-2">
                    TZS {expenses.length > 0 ? Math.round(totalExpenses / expenses.length).toLocaleString() : 0}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 opacity-50" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p>No expenses recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold">{expense.description}</p>
                    <p className="text-sm text-gray-600">
                      {expense.category} • {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-red-600">-TZS {expense.amount?.toLocaleString()}</span>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(expense)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handleDelete(expense._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="relative">
              <CardTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Input name="description" value={formData.description} onChange={handleInputChange} required />
                </div>

                <div>
                  <Label>Amount (TZS)</Label>
                  <Input name="amount" type="number" value={formData.amount} onChange={handleInputChange} required />
                </div>

                <div>
                  <Label>Category</Label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange as any}
                    className="w-full h-10 px-3 border rounded-md"
                    required
                  >
                    <option value="">Select category</option>
                    <option value="utilities">Utilities</option>
                    <option value="rent">Rent</option>
                    <option value="supplies">Supplies</option>
                    <option value="transport">Transport</option>
                    <option value="salary">Salary</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label>Date</Label>
                  <Input name="date" type="date" value={formData.date} onChange={handleInputChange} required />
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange as any}
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
                    {editingExpense ? 'Update Expense' : 'Add Expense'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
