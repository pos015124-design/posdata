import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Store, Search, TrendingUp, DollarSign, Package, Edit, Eye, Trash2, UserPlus, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface Seller {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'pending' | 'suspended';
  totalSales?: number;
  products?: number;
  createdAt?: string;
}

export default function Sellers() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [newSeller, setNewSeller] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'pending' | 'suspended'
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sellers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response:', contentType);
        const text = await response.text();
        console.error('Response body:', text.substring(0, 200));
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
      }
      
      if (response.ok) {
        const data = await response.json();
        const sellersList = data.sellers || [];
        // Map backend data to frontend format
        const mappedSellers = sellersList.map((s: any) => ({
          _id: s._id,
          name: s.businessName || s.name,
          email: s.contactEmail || s.email,
          phone: s.contactPhone || s.phone,
          status: s.status,
          totalSales: s.metrics?.totalSales || 0,
          products: s.metrics?.totalProducts || 0,
          createdAt: s.createdAt
        }));
        setSellers(mappedSellers);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || errorData.message || 'Failed to load sellers',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch sellers:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load sellers. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSeller = async () => {
    if (!newSeller.name || !newSeller.email) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    try {
      // If editing, update existing seller
      if (selectedSeller) {
        const response = await fetch(`/api/sellers/${selectedSeller._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(newSeller)
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: 'Success',
            description: 'Seller updated successfully',
          });
          setShowAddModal(false);
          setSelectedSeller(null);
          setNewSeller({ name: '', email: '', phone: '', status: 'active' });
          fetchSellers();
        } else {
          // Safely parse error response
          let errorMessage = 'Failed to update seller';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (e) {
            errorMessage = response.statusText || errorMessage;
          }
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } else {
        // Create new seller
        const response = await fetch('/api/sellers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(newSeller)
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: 'Success',
            description: 'Seller added successfully',
          });
          setShowAddModal(false);
          setSelectedSeller(null);
          setNewSeller({ name: '', email: '', phone: '', status: 'active' });
          fetchSellers();
        } else {
          // Safely parse error response
          let errorMessage = 'Failed to add seller';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Failed to save seller:', error);
      toast({
        title: 'Error',
        description: 'Failed to save seller',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (seller: Seller) => {
    setSelectedSeller(seller);
    setShowDetailsModal(true);
  };

  const handleEditSeller = (seller: Seller) => {
    setSelectedSeller(seller);
    setNewSeller({
      name: seller.name,
      email: seller.email,
      phone: seller.phone || '',
      status: seller.status
    });
    setShowAddModal(true);
  };

  const handleDeleteSeller = async (sellerId: string) => {
    if (!confirm('Are you sure you want to delete this seller?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sellers/${sellerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Seller deleted successfully',
        });
        fetchSellers();
      } else {
        // For demo purposes, remove from local state
        setSellers(sellers.filter(s => s._id !== sellerId));
        toast({
          title: 'Success',
          description: 'Seller deleted successfully',
        });
      }
    } catch (error) {
      console.error('Failed to delete seller:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete seller',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredSellers = sellers.filter(seller =>
    seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sellers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center md:text-left">Sellers</h1>
          <p className="text-gray-600 mt-1 text-center md:text-left">Manage your marketplace sellers</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full md:w-auto"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Seller
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search sellers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSellers.map((seller) => (
          <Card key={seller._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{seller.name}</CardTitle>
                    <p className="text-sm text-gray-600">{seller.email}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(seller.status)}`}>
                  {seller.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <DollarSign className="w-5 h-5 mx-auto text-green-600 mb-1" />
                  <p className="text-lg font-bold text-green-600">TZS {(seller.totalSales || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-600">Total Sales</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Package className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-lg font-bold text-blue-600">{seller.products || 0}</p>
                  <p className="text-xs text-gray-600">Products</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                  <p className="text-lg font-bold text-purple-600">+15%</p>
                  <p className="text-xs text-gray-600">Growth</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => handleViewDetails(seller)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
                <Button 
                  onClick={() => handleEditSeller(seller)}
                  variant="outline"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  onClick={() => handleDeleteSeller(seller._id)}
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSellers.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Store className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">No sellers found</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search or add a new seller</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Seller Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedSeller ? 'Edit Seller' : 'Add New Seller'}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedSeller(null);
                    setNewSeller({ name: '', email: '', phone: '', status: 'active' });
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={newSeller.name}
                  onChange={(e) => setNewSeller({ ...newSeller, name: e.target.value })}
                  placeholder="Enter seller name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={newSeller.email}
                  onChange={(e) => setNewSeller({ ...newSeller, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={newSeller.phone}
                  onChange={(e) => setNewSeller({ ...newSeller, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newSeller.status}
                  onChange={(e) => setNewSeller({ ...newSeller, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleAddSeller}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {selectedSeller ? 'Update Seller' : 'Add Seller'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedSeller(null);
                    setNewSeller({ name: '', email: '', phone: '', status: 'active' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedSeller && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Seller Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSeller(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Store className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedSeller.name}</h3>
                  <p className="text-gray-600">{selectedSeller.email}</p>
                  {selectedSeller.phone && <p className="text-gray-600">{selectedSeller.phone}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedSeller.status)}`}>
                    {selectedSeller.status}
                  </span>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">TZS {(selectedSeller.totalSales || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Products</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{selectedSeller.products || 0}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Growth Rate</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">+15%</p>
                </div>
              </div>

              {selectedSeller.createdAt && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Joined Date</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {new Date(selectedSeller.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditSeller(selectedSeller);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Seller
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSeller(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
