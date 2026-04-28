import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Eye,
  MoreHorizontal,
  Calendar,
  Store,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

interface Business {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  category: string;
  businessType: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  isPublic: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  /** analytics may be absent on older records created before the field was added */
  analytics?: {
    views: number;
    orders: number;
    revenue: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface BusinessListResponse {
  businesses: Business[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const BusinessManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const categories = [
    'retail', 'restaurant', 'services', 'electronics', 'clothing',
    'health', 'beauty', 'automotive', 'home-garden', 'sports',
    'books', 'toys', 'jewelry', 'grocery', 'other'
  ];

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchBusinesses();
    }
  }, [user, currentPage, statusFilter, categoryFilter, searchTerm]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/business/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data: { data: BusinessListResponse } = await response.json();
        setBusinesses(data.data.businesses);
        setPagination(data.data.pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch businesses",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBusiness = async (businessId: string) => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(`/api/business/${businessId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Business approved successfully"
        });
        fetchBusinesses();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to approve business",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    }
  };

  const handleRejectBusiness = async () => {
    if (!selectedBusiness || !rejectReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive"
      });
      return;
    }

    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(`/api/business/${selectedBusiness._id}/reject`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Business rejected successfully"
        });
        setShowRejectDialog(false);
        setRejectReason('');
        setSelectedBusiness(null);
        fetchBusinesses();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to reject business",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      active: 'default',
      inactive: 'outline',
      suspended: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Access denied. Super admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Management</h1>
          <p className="text-gray-600">Manage and approve business registrations</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setCategoryFilter('all');
              setCurrentPage(1);
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Table */}
      <Card>
        <CardHeader>
          <CardTitle>Businesses ({pagination.total})</CardTitle>
          <CardDescription>
            Showing {businesses.length} of {pagination.total} businesses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => (
                    <TableRow key={business._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{business.name}</p>
                          <p className="text-sm text-gray-600">{business.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {business.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(business.status)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(business.analytics?.revenue ?? 0)}
                      </TableCell>
                      <TableCell>
                        {formatDate(business.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBusiness(business);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {business.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveBusiness(business._id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedBusiness(business);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === pagination.pages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Business Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedBusiness?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBusiness && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Business Name</Label>
                  <p className="font-medium">{selectedBusiness.name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedBusiness.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedBusiness.email}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="font-medium">{selectedBusiness.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <p className="font-medium">{selectedBusiness.category}</p>
                </div>
                <div>
                  <Label>Business Type</Label>
                  <p className="font-medium">{selectedBusiness.businessType}</p>
                </div>
              </div>

              {selectedBusiness.address && (
                <div>
                  <Label>Address</Label>
                  <p className="font-medium">
                    {[
                      selectedBusiness.address.street,
                      selectedBusiness.address.city,
                      selectedBusiness.address.state,
                      selectedBusiness.address.zipCode,
                      selectedBusiness.address.country
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Views</Label>
                  <p className="font-medium">{selectedBusiness.analytics?.views ?? 0}</p>
                </div>
                <div>
                  <Label>Orders</Label>
                  <p className="font-medium">{selectedBusiness.analytics?.orders ?? 0}</p>
                </div>
                <div>
                  <Label>Revenue</Label>
                  <p className="font-medium">{formatCurrency(selectedBusiness.analytics?.revenue ?? 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Created</Label>
                  <p className="font-medium">{formatDate(selectedBusiness.createdAt)}</p>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <p className="font-medium">{formatDate(selectedBusiness.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Business Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Business</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedBusiness?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please explain why this business is being rejected..."
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRejectBusiness}>
                Reject Business
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessManagement;
