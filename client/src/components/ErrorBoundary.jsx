import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // In production, you might send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Send error to logging service
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // Example: Send error to logging service
    fetch('/api/logs/error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(err => {
      // If logging service fails, at least log to console
      console.error('Failed to log error to service:', err);
    });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary" role="alert" aria-live="assertive">
          <h2>Something went wrong</h2>
          <div className="error-details">
            <p>We're sorry, but something went wrong with the application.</p>
            <p>Please try refreshing the page or contact support if the problem persists.</p>
            
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details style={{ whiteSpace: 'pre-wrap' }}>
                <summary>Error Details</summary>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </details>
            )}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            aria-label="Refresh the page"
          >
            Refresh Page
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn btn-secondary"
            aria-label="Go to home page"
          >
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;