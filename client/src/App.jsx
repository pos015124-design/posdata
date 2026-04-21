import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Import components
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import Products from './components/Products';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Profile from './components/Profile';
import NotFound from './components/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

// Import context
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';

// Import accessibility utilities
import AccessibilityManager from './utils/AccessibilityManager';

// Import styles
import './styles/App.css';
import './styles/Accessibility.css';

// Accessibility helper component
const AccessibilityToolbar = () => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [fontSize, setFontSize] = useState('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);

  useEffect(() => {
    // Apply accessibility settings to document
    document.documentElement.style.setProperty('--font-scale', fontSize === 'large' ? '1.2' : fontSize === 'small' ? '0.8' : '1');
    document.body.classList.toggle('high-contrast', highContrast);
    document.body.classList.toggle('screen-reader-mode', screenReaderMode);
  }, [fontSize, highContrast, screenReaderMode]);

  const toggleToolbar = () => {
    setShowToolbar(!showToolbar);
  };

  return (
    <div className={`accessibility-toolbar ${showToolbar ? 'visible' : ''}`}>
      <button 
        className="accessibility-toggle-btn"
        onClick={toggleToolbar}
        aria-label={showToolbar ? "Hide accessibility options" : "Show accessibility options"}
        aria-expanded={showToolbar}
      >
        <span className="sr-only">Accessibility</span>
        <span className="accessibility-icon" aria-hidden="true">♿</span>
      </button>
      
      {showToolbar && (
        <div className="accessibility-options" role="region" aria-label="Accessibility options">
          <div className="accessibility-option">
            <label htmlFor="font-size">Font Size:</label>
            <select 
              id="font-size"
              value={fontSize} 
              onChange={(e) => setFontSize(e.target.value)}
              aria-label="Adjust font size"
            >
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
            </select>
          </div>
          
          <div className="accessibility-option">
            <label>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                aria-label="Enable high contrast mode"
              />
              High Contrast
            </label>
          </div>
          
          <div className="accessibility-option">
            <label>
              <input
                type="checkbox"
                checked={screenReaderMode}
                onChange={(e) => setScreenReaderMode(e.target.checked)}
                aria-label="Enable screen reader mode"
              />
              Screen Reader Mode
            </label>
          </div>
          
          <button 
            onClick={() => AccessibilityManager.increaseTextSize()}
            aria-label="Increase text size"
          >
            A+
          </button>
          <button 
            onClick={() => AccessibilityManager.decreaseTextSize()}
            aria-label="Decrease text size"
          >
            A-
          </button>
        </div>
      )}
    </div>
  );
};

// Help and support component
const HelpSystem = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [activeHelp, setActiveHelp] = useState(null);

  const helpTopics = [
    { id: 'login', title: 'How to Login', content: 'To login, enter your email and password in the login form. If you don\'t have an account, click on "Register" to create one.' },
    { id: 'products', title: 'Browsing Products', content: 'Use the navigation menu to browse different product categories. Click on any product to view detailed information and add it to your cart.' },
    { id: 'cart', title: 'Using the Cart', content: 'Add products to your cart by clicking the "Add to Cart" button. View your cart by clicking the cart icon in the header.' },
    { id: 'checkout', title: 'Checkout Process', content: 'Review your cart items, enter shipping information, select a payment method, and confirm your order.' }
  ];

  return (
    <div className="help-system">
      <button 
        className="help-toggle"
        onClick={() => setShowHelp(!showHelp)}
        aria-label={showHelp ? "Close help" : "Open help"}
        aria-expanded={showHelp}
      >
        <span aria-hidden="true">?</span>
        <span className="sr-only">Help</span>
      </button>
      
      {showHelp && (
        <div className="help-panel" role="dialog" aria-modal="true" aria-label="Help and support">
          <div className="help-header">
            <h2>Help & Support</h2>
            <button 
              onClick={() => setShowHelp(false)}
              aria-label="Close help"
            >
              ×
            </button>
          </div>
          
          <div className="help-content">
            <div className="help-navigation">
              <ul>
                {helpTopics.map(topic => (
                  <li key={topic.id}>
                    <button 
                      onClick={() => setActiveHelp(topic.id)}
                      className={activeHelp === topic.id ? 'active' : ''}
                      aria-current={activeHelp === topic.id ? 'true' : 'false'}
                    >
                      {topic.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="help-details">
              {activeHelp ? (
                <div>
                  <h3>{helpTopics.find(t => t.id === activeHelp)?.title}</h3>
                  <p>{helpTopics.find(t => t.id === activeHelp)?.content}</p>
                </div>
              ) : (
                <p>Select a topic from the menu for help.</p>
              )}
            </div>
          </div>
          
          <div className="help-footer">
            <p>Need more help? Contact support at support@dukani.com</p>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check user preference for dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
    
    // Listen for changes in user preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <HelmetProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <ErrorBoundary>
              <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
                <AccessibilityToolbar />
                <Header />
                <main>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <HelpSystem />
                <Footer />
              </div>
            </ErrorBoundary>
          </Router>
        </CartProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;