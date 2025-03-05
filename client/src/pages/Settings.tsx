import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLanguage } from "@/contexts/LanguageContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/useToast"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Save, Store, Receipt, CreditCard, Percent, Tag, Plus, Pencil, Trash2 } from "lucide-react"
import {
  getSettings,
  updateSettings,
  BusinessSettings,
  TaxSettings,
  ReceiptSettings,
  PaymentSettings
} from "@/api/settings"
import { getCategories, addCategory, updateCategory, deleteCategory, Category } from "@/api/categories"

export function Settings() {
  const { t } = useLanguage()
  // Business information settings
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    name: "Dukani Store",
    address: "123 Main Street, Dar es Salaam",
    phone: "+255 123 456 789",
    email: "info@dukanistore.com",
    taxId: "TIN12345678",
  })

  // Tax settings
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    defaultTaxRate: "0",
    taxIncluded: false,
    enableTax: false,
  })

  // Receipt settings
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    showLogo: true,
    showTaxId: true,
    footerText: "Thank you for shopping with us!",
    receiptPrefix: "INV-",
    printAutomatically: true,
  })

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    acceptCash: true,
    acceptCard: true,
    acceptMobile: true,
    acceptCredit: true,
    defaultPaymentMethod: "cash",
  })

  // Category management
  const [categories, setCategories] = useState<Category[]>([])
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#3b82f6" // Default blue color
  })

  const { toast } = useToast()

  // Load settings and categories from server on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("Loading settings from server...")
        
        // Fetch settings from the API
        const response = await getSettings();
        
        // Update state with the fetched settings
        setBusinessSettings(response.settings.business);
        setTaxSettings(response.settings.tax);
        setReceiptSettings(response.settings.receipt);
        setPaymentSettings(response.settings.payment);
        
        console.log("Settings loaded successfully");
        
        // Fetch categories
        try {
          const categoriesResponse = await getCategories();
          setCategories(categoriesResponse.categories);
          console.log("Categories loaded successfully");
        } catch (categoryError) {
          console.error("Failed to load categories:", categoryError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load product categories",
          });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        
        // If API fails, we'll keep using the default values
        toast({
          variant: "destructive",
          title: "Error",
          description: t("settings.failedToLoad"),
        });
      }
    };
    
    loadData();
  }, [toast, t]);

  // Save all settings
  const saveSettings = async () => {
    try {
      console.log("Saving settings to server...");
      
      // Prepare the settings object
      const settings = {
        business: businessSettings,
        tax: taxSettings,
        receipt: receiptSettings,
        payment: paymentSettings
      };
      
      // Send settings to the API
      const response = await updateSettings(settings);
      
      if (response.success) {
        toast({
          title: "Success",
          description: t("settings.settingsSaved"),
        });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: t("settings.failedToSave"),
      });
    }
  };

  // Category management functions
  const handleAddCategory = async () => {
    try {
      const response = await addCategory(newCategory);
      if (response.success) {
        toast({
          title: "Success",
          description: "Category added successfully",
        });
        setIsAddingCategory(false);
        setNewCategory({
          name: "",
          description: "",
          color: "#3b82f6"
        });
        
        // Refresh categories
        const categoriesResponse = await getCategories();
        setCategories(categoriesResponse.categories);
      }
    } catch (error) {
      console.error("Failed to add category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add category",
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return;
    
    try {
      const response = await updateCategory(selectedCategory._id, {
        name: selectedCategory.name,
        description: selectedCategory.description,
        color: selectedCategory.color
      });
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
        setIsEditingCategory(false);
        setSelectedCategory(null);
        
        // Refresh categories
        const categoriesResponse = await getCategories();
        setCategories(categoriesResponse.categories);
      }
    } catch (error) {
      console.error("Failed to update category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update category",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await deleteCategory(id);
      if (response.success) {
        toast({
          title: "Success",
          description: "Category deleted successfully",
        });
        
        // Refresh categories
        const categoriesResponse = await getCategories();
        setCategories(categoriesResponse.categories);
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h2>
        <Button onClick={saveSettings}>
          <Save className="mr-2 h-4 w-4" />
          {t("settings.saveAll")}
        </Button>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business">{t("settings.businessInfo")}</TabsTrigger>
          <TabsTrigger value="tax">{t("settings.taxSettings")}</TabsTrigger>
          <TabsTrigger value="receipt">{t("settings.receiptSettings")}</TabsTrigger>
          <TabsTrigger value="payment">{t("settings.paymentMethods")}</TabsTrigger>
          <TabsTrigger value="categories">Product Categories</TabsTrigger>
        </TabsList>

        {/* Business Information Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                {t("settings.businessInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">{t("settings.businessName")}</Label>
                <Input
                  id="business-name"
                  value={businessSettings.name}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business-address">{t("settings.address")}</Label>
                <Textarea
                  id="business-address"
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business-phone">{t("settings.phoneNumber")}</Label>
                  <Input
                    id="business-phone"
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="business-email">{t("settings.emailAddress")}</Label>
                  <Input
                    id="business-email"
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business-taxid">{t("settings.taxId")}</Label>
                <Input
                  id="business-taxid"
                  value={businessSettings.taxId}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, taxId: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business-logo">{t("settings.logo")}</Label>
                <Input
                  id="business-logo"
                  value={businessSettings.logo || ""}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Settings Tab */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                {t("settings.taxSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-tax">{t("settings.enableTax")}</Label>
                <Switch
                  id="enable-tax"
                  checked={taxSettings.enableTax}
                  onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, enableTax: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default-tax-rate">{t("settings.defaultTaxRate")}</Label>
                <Input
                  id="default-tax-rate"
                  type="number"
                  value={taxSettings.defaultTaxRate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, defaultTaxRate: e.target.value })}
                  disabled={!taxSettings.enableTax}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="tax-included">{t("settings.taxIncluded")}</Label>
                <Switch
                  id="tax-included"
                  checked={taxSettings.taxIncluded}
                  onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, taxIncluded: checked })}
                  disabled={!taxSettings.enableTax}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipt Settings Tab */}
        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {t("settings.receiptSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-logo">Show Logo on Receipt</Label>
                <Switch
                  id="show-logo"
                  checked={receiptSettings.showLogo}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, showLogo: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-taxid">Show Tax ID on Receipt</Label>
                <Switch
                  id="show-taxid"
                  checked={receiptSettings.showTaxId}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, showTaxId: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="receipt-prefix">Receipt Number Prefix</Label>
                <Input
                  id="receipt-prefix"
                  value={receiptSettings.receiptPrefix}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, receiptPrefix: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="footer-text">Receipt Footer Text</Label>
                <Textarea
                  id="footer-text"
                  value={receiptSettings.footerText}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, footerText: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="print-automatically">Print Receipt Automatically</Label>
                <Switch
                  id="print-automatically"
                  checked={receiptSettings.printAutomatically}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, printAutomatically: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("settings.paymentMethods")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="accept-cash">Accept Cash Payments</Label>
                  <Switch
                    id="accept-cash"
                    checked={paymentSettings.acceptCash}
                    onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, acceptCash: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="accept-card">Accept Card Payments</Label>
                  <Switch
                    id="accept-card"
                    checked={paymentSettings.acceptCard}
                    onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, acceptCard: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="accept-mobile">Accept Mobile Money</Label>
                  <Switch
                    id="accept-mobile"
                    checked={paymentSettings.acceptMobile}
                    onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, acceptMobile: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="accept-credit">Accept Credit Accounts</Label>
                  <Switch
                    id="accept-credit"
                    checked={paymentSettings.acceptCredit}
                    onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, acceptCredit: checked })}
                  />
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <Label htmlFor="default-payment">Default Payment Method</Label>
                <Select
                  value={paymentSettings.defaultPaymentMethod}
                  onValueChange={(value) => setPaymentSettings({ ...paymentSettings, defaultPaymentMethod: value })}
                >
                  <SelectTrigger id="default-payment">
                    <SelectValue placeholder="Select default payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" disabled={!paymentSettings.acceptCash}>Cash</SelectItem>
                    <SelectItem value="card" disabled={!paymentSettings.acceptCard}>Card</SelectItem>
                    <SelectItem value="mobile" disabled={!paymentSettings.acceptMobile}>Mobile Money</SelectItem>
                    <SelectItem value="credit" disabled={!paymentSettings.acceptCredit}>Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Product Categories
                </div>
                <Button size="sm" onClick={() => setIsAddingCategory(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </CardTitle>
              <CardDescription>
                Manage product categories for your inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <TableRow key={category._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color || '#3b82f6' }}
                            />
                            {category.name}
                          </div>
                        </TableCell>
                        <TableCell>{category.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: category.color || '#3b82f6' }}
                            />
                            {category.color || '#3b82f6'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCategory(category);
                                setIsEditingCategory(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCategory(category._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No categories found. Add your first category to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Electronics, Clothing, Food"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description (Optional)</Label>
              <Textarea
                id="category-description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Brief description of this category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: newCategory.color }}
                />
                <Input
                  id="category-color"
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCategory(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditingCategory} onOpenChange={setIsEditingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">Category Name</Label>
                <Input
                  id="edit-category-name"
                  value={selectedCategory.name}
                  onChange={(e) => setSelectedCategory({ ...selectedCategory, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-description">Description (Optional)</Label>
                <Textarea
                  id="edit-category-description"
                  value={selectedCategory.description || ''}
                  onChange={(e) => setSelectedCategory({ ...selectedCategory, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-color">Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: selectedCategory.color || '#3b82f6' }}
                  />
                  <Input
                    id="edit-category-color"
                    type="color"
                    value={selectedCategory.color || '#3b82f6'}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, color: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingCategory(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory}>Update Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Settings