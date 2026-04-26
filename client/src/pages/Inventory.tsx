import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Package, Search, Plus, Edit, Trash2, Scan, X, Upload, Image as ImageIcon, Download } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as productsApi from '../api/products';
import * as uploadsApi from '../api/uploads';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
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

  const [productImage, setProductImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

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
    // Use requestAnimationFrame for better performance on rapid input
    requestAnimationFrame(() => {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'name' || name === 'code' || name === 'barcode' || name === 'category'
          ? value
          : parseFloat(value) || 0
      }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Upload image if a new one was selected
      if (imageFile) {
        setUploadingImage(true);
        try {
          const uploadResponse = await uploadsApi.uploadProductImage(imageFile);
          const imageDataWithImages = {
            ...formData,
            images: [{
              url: uploadResponse.imageUrl,
              isPrimary: true,
              alt: formData.name
            }]
          };
          
          if (editingProduct) {
            await productsApi.updateProduct(editingProduct._id, imageDataWithImages);
            toast({
              title: 'Success',
              description: 'Product updated successfully',
            });
          } else {
            await productsApi.addProduct(imageDataWithImages);
            toast({
              title: 'Success',
              description: 'Product added successfully',
            });
          }
        } catch (error: any) {
          const errorMessage = error.message || error.response?.data?.message || 'Failed to upload image, but product will be saved without it';
          toast({
            title: 'Warning',
            description: errorMessage,
            variant: 'destructive',
          });
          
          // Save without image
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
        } finally {
          setUploadingImage(false);
        }
      } else {
        // No image to upload
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
      }
      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
      
      // Notify other tabs/components (like Store) about the update
      localStorage.setItem('product-updated', Date.now().toString());
    } catch (error: any) {
      let errorMessage = 'Failed to save product';
      
      // Handle duplicate product errors
      if (error.response?.data?.code === 'DUPLICATE_PRODUCT') {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    // Load existing image if any
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img: any) => img.isPrimary) || product.images[0];
      setProductImage(primaryImage.url);
    } else {
      setProductImage(null);
    }
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
      
      // Notify other tabs/components about the update
      localStorage.setItem('product-updated', Date.now().toString());
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
    setProductImage(null);
    setImageFile(null);
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

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to import',
        variant: 'destructive',
      });
      return;
    }

    try {
      setImporting(true);
      const response = await productsApi.importProducts(importFile);
      
      setImportResults(response.results);
      
      if (response.results.success > 0) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${response.results.success} products`,
        });
        fetchProducts();
      }
      
      if (response.results.failed > 0) {
        toast({
          title: 'Import Completed with Errors',
          description: `${response.results.failed} products failed to import`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.response?.data?.error || 'Failed to import products',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    productsApi.downloadImportTemplate();
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
        <Button
          onClick={() => setShowImportModal(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Import Products
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
                  {filteredProducts.map((product) => {
                    const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
                    const imageUrl = primaryImage?.url;
                    
                    return (
                    <tr key={product._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <img
                              src={imageUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || ''}${imageUrl}` : imageUrl}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
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
                  );
                  })}
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

                <div>
                  <Label>Product Image</Label>
                  <div className="flex items-center gap-4">
                    {productImage ? (
                      <div className="relative">
                        <img
                          src={productImage.startsWith('data:') || productImage.startsWith('/uploads') ? productImage : `${import.meta.env.VITE_API_URL || ''}${productImage}`}
                          alt="Product preview"
                          className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProductImage(null);
                            setImageFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="product-image-upload"
                      />
                      <Label
                        htmlFor="product-image-upload"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg cursor-pointer hover:from-blue-700 hover:to-purple-700 inline-flex"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingImage ? 'Uploading...' : productImage ? 'Change Image' : 'Upload Image'}
                      </Label>
                      <p className="text-xs text-gray-500 mt-2">Max 5MB. JPEG, PNG, GIF, WebP</p>
                    </div>
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
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? 'Uploading Image...' : (editingProduct ? 'Update Product' : 'Add Product')}
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

      {/* Import Products Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Import Products</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportResults(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">Instructions:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Download the CSV template first</li>
                  <li>Fill in your product data</li>
                  <li>Required fields: name, code, barcode, price, purchasePrice, stock, category</li>
                  <li>Upload the completed file</li>
                </ul>
              </div>

              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>

              <div>
                <Label>Upload File (CSV or Excel)</Label>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImportFileChange}
                  className="mt-2"
                />
                {importFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>

              {importResults && (
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{importResults.success}</p>
                      <p className="text-xs text-green-600">Successful</p>
                    </div>
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{importResults.failed}</p>
                      <p className="text-xs text-red-600">Failed</p>
                    </div>
                  </div>
                  
                  {importResults.errors && importResults.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-medium text-red-800 mb-2">Errors:</p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {importResults.errors.slice(0, 10).map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {importResults.errors.length > 10 && (
                          <li className="text-gray-600">... and {importResults.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {importing ? 'Importing...' : 'Import Products'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportResults(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
