class AccessibilityManager {
  constructor() {
    this.fontSize = 1;
    this.highContrast = false;
    this.screenReaderMode = false;
  }

  // Increase text size
  increaseTextSize() {
    if (this.fontSize < 1.5) {
      this.fontSize += 0.1;
      this.applyFontSize();
      this.saveSettings();
    }
  }

  // Decrease text size
  decreaseTextSize() {
    if (this.fontSize > 0.8) {
      this.fontSize -= 0.1;
      this.applyFontSize();
      this.saveSettings();
    }
  }

  // Apply font size to document
  applyFontSize() {
    document.documentElement.style.fontSize = `${this.fontSize * 16}px`;
  }

  // Toggle high contrast mode
  toggleHighContrast() {
    this.highContrast = !this.highContrast;
    document.body.classList.toggle('high-contrast', this.highContrast);
    this.saveSettings();
  }

  // Toggle screen reader mode
  toggleScreenReaderMode() {
    this.screenReaderMode = !this.screenReaderMode;
    document.body.classList.toggle('screen-reader-mode', this.screenReaderMode);
    this.saveSettings();
  }

  // Initialize accessibility settings from localStorage
  init() {
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      this.fontSize = settings.fontSize || 1;
      this.highContrast = settings.highContrast || false;
      this.screenReaderMode = settings.screenReaderMode || false;
      
      this.applyFontSize();
      document.body.classList.toggle('high-contrast', this.highContrast);
      document.body.classList.toggle('screen-reader-mode', this.screenReaderMode);
    }
  }

  // Save accessibility settings to localStorage
  saveSettings() {
    const settings = {
      fontSize: this.fontSize,
      highContrast: this.highContrast,
      screenReaderMode: this.screenReaderMode
    };
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
  }

  // Focus management for better keyboard navigation
  manageFocus() {
    // Add focus indicators for better keyboard navigation
    const focusableElements = document.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      element.addEventListener('focus', () => {
        element.classList.add('focus-visible');
      });

      element.addEventListener('blur', () => {
        element.classList.remove('focus-visible');
      });
    });
  }

  // Skip to main content for screen readers
  skipToMainContent() {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Announce message to screen readers
  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement is processed
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Check if user is using a screen reader
  isScreenReaderUser() {
    // Simple heuristic to detect screen reader usage
    let isUsingScreenReader = false;
    
    // Listen for screen reader specific events
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.keyCode === 82) { // Alt+Shift+R (JAWS)
        isUsingScreenReader = true;
      }
      if (e.ctrlKey && e.altKey && e.keyCode === 77) { // Ctrl+Alt+M (NVDA)
        isUsingScreenReader = true;
      }
    });

    // Listen for focus events that might indicate screen reader usage
    document.addEventListener('focus', (e) => {
      if (e.target.classList.contains('sr-only')) {
        isUsingScreenReader = true;
      }
    }, true);

    return isUsingScreenReader;
  }

  // Set up keyboard navigation
  setupKeyboardNavigation() {
    // Trap focus in modal dialogs
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const activeElement = document.activeElement;
        const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
        
        if (modal) {
          const focusableElements = modal.querySelectorAll(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length === 0) return;
          
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      }
    });
  }

  // Validate form accessibility
  validateFormAccessibility(formElement) {
    const inputs = formElement.querySelectorAll('input, textarea, select');
    let isAccessible = true;
    
    inputs.forEach(input => {
      // Check if input has associated label
      const id = input.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (!label) {
          console.warn(`Input with id "${id}" does not have an associated label`);
          isAccessible = false;
        }
      } else {
        // Check if input is inside a label
        const parentLabel = input.closest('label');
        if (!parentLabel) {
          console.warn(`Input does not have an associated label`, input);
          isAccessible = false;
        }
      }
    });
    
    return isAccessible;
  }

  // Generate accessibility report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      page: window.location.href,
      elements: {
        total: document.querySelectorAll('*').length,
        focusable: document.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])').length,
        imagesWithAlt: document.querySelectorAll('img[alt]').length,
        imagesWithoutAlt: document.querySelectorAll('img:not([alt]), img[alt=""]').length,
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        landmarks: document.querySelectorAll('header, nav, main, aside, footer').length
      },
      accessibility: {
        fontSize: this.fontSize,
        highContrast: this.highContrast,
        screenReaderMode: this.screenReaderMode
      }
    };
    
    return report;
  }

  // Check color contrast
  checkColorContrast(element) {
    const style = window.getComputedStyle(element);
    const backgroundColor = this.hexToRgb(style.backgroundColor);
    const color = this.hexToRgb(style.color);
    
    if (!backgroundColor || !color) return null;
    
    const contrast = this.contrastRatio(backgroundColor, color);
    
    return {
      ratio: contrast,
      passesAA: contrast >= 4.5,
      passesAAA: contrast >= 7
    };
  }

  // Convert hex color to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Calculate contrast ratio
  contrastRatio(color1, color2) {
    const lum1 = this.relativeLuminance(color1);
    const lum2 = this.relativeLuminance(color2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  }

  // Calculate relative luminance
  relativeLuminance(color) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;
    
    const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
  }
}

// Create a singleton instance
const accessibilityManager = new AccessibilityManager();

export default accessibilityManager;