import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, HelpCircle, BookOpen, LifeBuoy, MessageCircle, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
}

// Help content organized by category and page
const helpContent: Record<string, HelpArticle[]> = {
  general: [
    {
      id: 'general-navigation',
      title: 'Navigation Help',
      content: 'Use the sidebar menu to navigate between different sections of the system. The top bar contains user settings and logout functionality.',
      category: 'navigation',
      keywords: ['menu', 'sidebar', 'navigation', 'dashboard']
    },
    {
      id: 'general-search',
      title: 'Search Functionality',
      content: 'Use the search bar at the top of most pages to quickly find products, customers, or other items in the system.',
      category: 'search',
      keywords: ['search', 'find', 'lookup', 'filter']
    },
    {
      id: 'general-shortcuts',
      title: 'Keyboard Shortcuts',
      content: 'Press Ctrl+K (or Cmd+K on Mac) to open the global search. Press Ctrl+S to save forms when available.',
      category: 'shortcuts',
      keywords: ['keyboard', 'shortcuts', 'hotkeys', 'commands']
    }
  ],
  pos: [
    {
      id: 'pos-add-product',
      title: 'Adding Products to Cart',
      content: 'Click on product cards in the products grid to add items to the cart. You can also scan barcodes using the barcode scanner.',
      category: 'pos',
      keywords: ['pos', 'product', 'cart', 'add', 'scan', 'barcode']
    },
    {
      id: 'pos-payment',
      title: 'Processing Payments',
      content: 'Select a customer, review the cart, then click checkout. Choose the payment method and enter required details.',
      category: 'pos',
      keywords: ['pos', 'payment', 'checkout', 'customer', 'cash', 'card', 'credit']
    }
  ],
  inventory: [
    {
      id: 'inventory-restock',
      title: 'Restocking Products',
      content: 'Select a product from the inventory list and click "Restock" to update stock levels and record purchases.',
      category: 'inventory',
      keywords: ['inventory', 'restock', 'stock', 'update', 'purchase']
    },
    {
      id: 'inventory-count',
      title: 'Inventory Count',
      content: 'Use the inventory count feature to verify physical stock against system records. Discrepancies will be automatically adjusted.',
      category: 'inventory',
      keywords: ['inventory', 'count', 'physical', 'adjust', 'reconcile']
    }
  ],
  reports: [
    {
      id: 'reports-sales',
      title: 'Sales Reports',
      content: 'View daily, weekly, or monthly sales reports with detailed breakdowns by product, category, or payment method.',
      category: 'reports',
      keywords: ['reports', 'sales', 'analytics', 'charts', 'graphs']
    },
    {
      id: 'reports-financial',
      title: 'Financial Reports',
      content: 'Access profit and loss statements, expense reports, and other financial summaries for your business.',
      category: 'reports',
      keywords: ['reports', 'financial', 'profit', 'loss', 'expenses', 'p&l']
    }
  ]
};

export const HelpSystem = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  // Filter help articles based on search and active tab
  const filteredArticles = (): HelpArticle[] => {
    let articles: HelpArticle[] = [];
    
    if (activeTab === 'all') {
      articles = Object.values(helpContent).flat();
    } else {
      articles = helpContent[activeTab] || [];
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      articles = articles.filter(article => 
        article.title.toLowerCase().includes(term) ||
        article.content.toLowerCase().includes(term) ||
        article.keywords.some((keyword: string) => keyword.toLowerCase().includes(term))
      );
    }
    
    return articles;
  };

  const categories = [
    { id: 'all', label: 'All Topics', icon: BookOpen },
    { id: 'general', label: 'General', icon: HelpCircle },
    { id: 'pos', label: 'POS', icon: MessageCircle },
    { id: 'inventory', label: 'Inventory', icon: BookOpen },
    { id: 'reports', label: 'Reports', icon: BookOpen },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed bottom-4 right-4 z-50"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5" />
            {t('help.title') || 'Help Center'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[60vh]">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('help.searchPlaceholder') || 'Search help articles...'}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-4 h-full">
            {/* Category Sidebar */}
            <div className="w-48 flex-shrink-0">
              <Card className="h-full">
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {categories.map((category) => {
                      const IconComponent = category.icon;
                      return (
                        <button
                          key={category.id}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                            activeTab === category.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => setActiveTab(category.id)}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span className="text-sm">{category.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Articles List */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {filteredArticles().map((article) => (
                  <Card 
                    key={article.id} 
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{article.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.content}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.keywords.slice(0, 3).map((keyword: string) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredArticles().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('help.noResults') || 'No help articles found.'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Article Detail Panel */}
            <div className="w-80 flex-shrink-0 border-l">
              {selectedArticle ? (
                <div className="h-full overflow-y-auto p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">{selectedArticle.title}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedArticle(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p>{selectedArticle.content}</p>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Keywords:</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedArticle.keywords.map((keyword: string) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground p-4">
                  {t('help.selectArticle') || 'Select an article to read more...'}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpSystem;