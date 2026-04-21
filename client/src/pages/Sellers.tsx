import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Store, Search, Plus, TrendingUp, DollarSign, Package } from 'lucide-react';

export default function Sellers() {
  const [sellers] = useState([
    { id: 1, name: 'Seller A', email: 'sellerA@example.com', status: 'active', totalSales: 5250, products: 45 },
    { id: 2, name: 'Seller B', email: 'sellerB@example.com', status: 'active', totalSales: 3890, products: 32 },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sellers</h1>
          <p className="text-gray-600 mt-1">Manage your marketplace sellers</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Seller
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sellers.map((seller) => (
          <Card key={seller.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
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
                  <p className="text-lg font-bold text-green-600">${seller.totalSales}</p>
                  <p className="text-xs text-gray-600">Total Sales</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Package className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-lg font-bold text-blue-600">{seller.products}</p>
                  <p className="text-xs text-gray-600">Products</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                  <p className="text-lg font-bold text-purple-600">+15%</p>
                  <p className="text-xs text-gray-600">Growth</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">View Details</Button>
                <Button variant="outline">Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
