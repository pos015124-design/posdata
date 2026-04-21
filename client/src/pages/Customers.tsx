import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Users, Search, Plus, Mail, Phone, Edit, Trash2, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as customersApi from '../api/customers';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as 'cash' | 'credit',
    email: '',
    phone: '',
    creditLimit: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersApi.getCustomers();
      setCustomers(response.customers || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'creditLimit' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customersApi.updateCustomer(editingCustomer._id, formData);
        toast({
          title: 'Success',
          description: 'Customer updated successfully',
        });
      } else {
        await customersApi.addCustomer(formData);
        toast({
          title: 'Success',
          description: 'Customer added successfully',
        });
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save customer',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      type: customer.type,
      email: customer.email || '',
      phone: customer.phone || '',
      creditLimit: customer.creditLimit || 0
    });
    setShowAddModal(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customersApi.deleteCustomer(customerId);
      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
      });
      fetchCustomers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cash',
      email: '',
      phone: '',
      creditLimit: 0
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer base</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingCustomer(null);
            setShowAddModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading customers...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map((customer) => (
                <Card key={customer._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                          {customer.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{customer.name}</h3>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                            customer.type === 'credit' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {customer.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(customer)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => handleDelete(customer._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 mt-4 text-sm text-gray-600">
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.type === 'credit' && customer.creditLimit && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between">
                            <span>Credit Limit</span>
                            <span className="font-bold text-green-600">TZS {customer.creditLimit.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="relative">
              <CardTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
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
                  <Label>Customer Name</Label>
                  <Input name="name" value={formData.name} onChange={handleInputChange} required />
                </div>

                <div>
                  <Label>Customer Type</Label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange as any}
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="cash">Cash Customer</option>
                    <option value="credit">Credit Customer</option>
                  </select>
                </div>

                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleInputChange} />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>

                {formData.type === 'credit' && (
                  <div>
                    <Label>Credit Limit (TZS)</Label>
                    <Input name="creditLimit" type="number" value={formData.creditLimit} onChange={handleInputChange} />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
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
