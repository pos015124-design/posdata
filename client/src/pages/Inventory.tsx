import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Package, Search, Plus, Edit, Trash2, Scan, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as productsApi from '../api/products';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    barcode: '',
    price: 0,
    purchasePrice: 0,
    stock: 0,
    category: '',
    reorderPoint: 0
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getProducts();
      setProducts(response.products || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'code' || name === 'barcode' || name === 'category'
        ? value
        : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsApi.updateProduct(editingProduct._id, formData);
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
      } else {
        await productsApi.addProduct(formData);
        toast({
          title: 'Success',
          description: 'Product added successfully',
        });
      }
      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save product',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      code: product.code,
      barcode: product.barcode,
      price: product.price,
      purchasePrice: product.purchasePrice,
      stock: product.stock,
      category: product.category,
      reorderPoint: product.reorderPoint
    });
    setShowAddModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsApi.deleteProduct(productId);
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
      fetchProducts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      barcode: '',
      price: 0,
      purchasePrice: 0,
      stock: 0,
      category: '',
      reorderPoint: 0
    });
  };

  const handleBarcodeScan = () => {
    setIsScanning(true);
    // Simulate barcode scanner - in production, use a real barcode scanner library
    setTimeout(() => {
      const simulatedBarcode = 'BC' + Date.now();
      setFormData(prev => ({ ...prev, barcode: simulatedBarcode }));
      setIsScanning(false);
      toast({
        title: 'Scanned',
        description: 'Barcode scanned successfully',
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center md:text-left">Inventory</h1>
          <p className="text-gray-600 mt-1 text-center md:text-left">Manage your products and stock</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowAddModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by name, code, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Product</th>
                    <th className="text-left py-3 px-4 font-semibold">Code</th>
                    <th className="text-left py-3 px-4 font-semibold">Barcode</th>
                    <th className="text-left py-3 px-4 font-semibold">Category</th>
                    <th className="text-left py-3 px-4 font-semibold">Stock</th>
                    <th className="text-left py-3 px-4 font-semibold">Price</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{product.code}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-sm">{product.barcode}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {product.category || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${product.stock <= product.reorderPoint ? 'text-red-600' : 'text-green-600'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold">TZS {product.price?.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(product._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="relative">
              <CardTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</CardTitle>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product Name</Label>
                    <Input name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <Label>Product Code</Label>
                    <Input name="code" value={formData.code} onChange={handleInputChange} required />
                  </div>
                </div>

                <div>
                  <Label>Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      placeholder="Scan or enter barcode"
                    />
                    <Button
                      type="button"
                      onClick={handleBarcodeScan}
                      disabled={isScanning}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      {isScanning ? 'Scanning...' : 'Scan'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (TZS)</Label>
                    <Input name="price" type="number" value={formData.price} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <Label>Purchase Price (TZS)</Label>
                    <Input name="purchasePrice" type="number" value={formData.purchasePrice} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stock</Label>
                    <Input name="stock" type="number" value={formData.stock} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <Label>Reorder Point</Label>
                    <Input name="reorderPoint" type="number" value={formData.reorderPoint} onChange={handleInputChange} />
                  </div>
                </div>

                <div>
                  <Label>Category</Label>
                  <Input name="category" value={formData.category} onChange={handleInputChange} />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
                    {editingProduct ? 'Update Product' : 'Add Product'}
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
