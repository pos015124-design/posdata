/**
 * WebSocket Service Tests
 * Tests real-time dashboard functionality and WebSocket connections
 */

const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const webSocketService = require('../services/websocketService');

describe('WebSocket Service', () => {
  let httpServer;
  let clientSocket;
  let serverSocket;
  let testToken;

  beforeAll((done) => {
    // Create test JWT token
    testToken = jwt.sign(
      { userId: 'test-user-id', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create HTTP server
    httpServer = createServer();
    
    // Initialize WebSocket service
    webSocketService.initialize(httpServer);
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      
      // Create client socket
      clientSocket = new Client(`http://localhost:${port}`, {
        auth: {
          token: testToken
        }
      });
      
      // Wait for connection
      webSocketService.io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    webSocketService.shutdown();
    httpServer.close();
    clientSocket.close();
  });

  describe('Connection Management', () => {
    it('should authenticate user on connection', (done) => {
      expect(serverSocket.userId).toBe('test-user-id');
      expect(serverSocket.userRole).toBe('admin');
      done();
    });

    it('should track connected users', () => {
      const stats = webSocketService.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThan(0);
    });

    it('should send connection established event', (done) => {
      clientSocket.on('connection-established', (data) => {
        expect(data.message).toBe('Connected to real-time dashboard');
        expect(data.timestamp).toBeDefined();
        done();
      });
    });
  });

  describe('Dashboard Events', () => {
    it('should handle join dashboard event', (done) => {
      const preferences = { theme: 'dark', refreshInterval: 30 };
      
      clientSocket.emit('join-dashboard', { preferences });
      
      clientSocket.on('dashboard-data', (data) => {
        expect(data.sales).toBeDefined();
        expect(data.inventory).toBeDefined();
        expect(data.alerts).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should handle analytics request', (done) => {
      const filters = { dateRange: 'week' };
      
      clientSocket.emit('request-analytics', filters);
      
      clientSocket.on('analytics-data', (data) => {
        expect(data.type).toBe('sales');
        expect(data.data).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should handle dashboard customization', (done) => {
      const layout = {
        widgets: [
          { id: 'sales-overview', x: 0, y: 0, w: 6, h: 4 },
          { id: 'inventory-status', x: 6, y: 0, w: 6, h: 4 }
        ]
      };
      
      clientSocket.emit('customize-dashboard', layout);
      
      clientSocket.on('dashboard-customization-saved', (data) => {
        expect(data.message).toBe('Dashboard layout saved successfully');
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should handle leave dashboard event', () => {
      clientSocket.emit('leave-dashboard');
      
      // Verify user is no longer in dashboard room
      const stats = webSocketService.getConnectionStats();
      expect(stats.dashboardUsers).toBe(0);
    });
  });

  describe('Real-time Notifications', () => {
    it('should broadcast sale event', (done) => {
      const saleData = {
        _id: 'test-sale-id',
        total: 150.00,
        paymentMethod: 'cash',
        items: [{ name: 'Test Product', quantity: 2 }]
      };

      clientSocket.emit('join-dashboard');
      
      clientSocket.on('notification', (notification) => {
        expect(notification.type).toBe('sale');
        expect(notification.title).toBe('New Sale');
        expect(notification.data.total).toBe(150.00);
        done();
      });

      // Simulate sale event
      setTimeout(() => {
        webSocketService.broadcastSaleEvent(saleData);
      }, 100);
    });

    it('should broadcast inventory alert', (done) => {
      const productData = {
        _id: 'test-product-id',
        name: 'Test Product',
        stock: 2,
        reorderPoint: 10
      };

      clientSocket.on('notification', (notification) => {
        expect(notification.type).toBe('inventory');
        expect(notification.title).toBe('Low Stock Alert');
        expect(notification.priority).toBe('high');
        done();
      });

      // Simulate inventory alert
      setTimeout(() => {
        webSocketService.broadcastInventoryAlert(productData);
      }, 100);
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent connections', async () => {
      const connections = [];
      const connectionPromises = [];

      // Create 10 concurrent connections
      for (let i = 0; i < 10; i++) {
        const client = new Client(`http://localhost:${httpServer.address().port}`, {
          auth: { token: testToken }
        });
        
        connections.push(client);
        
        connectionPromises.push(new Promise((resolve) => {
          client.on('connect', resolve);
        }));
      }

      await Promise.all(connectionPromises);

      const stats = webSocketService.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(10);

      // Clean up connections
      connections.forEach(client => client.close());
    });

    it('should update dashboard within acceptable time', (done) => {
      const startTime = Date.now();
      
      clientSocket.emit('join-dashboard');
      
      clientSocket.on('dashboard-data', () => {
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid analytics request', (done) => {
      clientSocket.emit('request-analytics', { invalidFilter: 'test' });
      
      clientSocket.on('error', (error) => {
        expect(error.message).toBeDefined();
        done();
      });
    });

    it('should reject connection without valid token', (done) => {
      const invalidClient = new Client(`http://localhost:${httpServer.address().port}`, {
        auth: { token: 'invalid-token' }
      });
      
      invalidClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        invalidClient.close();
        done();
      });
    });
  });
});
