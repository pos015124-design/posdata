/**
 * WebSocket Service Tests
 * Tests real-time dashboard functionality and WebSocket connections
 */

const { createServer } = require('http');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const webSocketService = require('../services/websocketService');

const TEST_USER_ID = new (require('mongoose').Types.ObjectId)().toString();

/** Register a one-shot listener BEFORE the event can fire, then await it. */
function waitFor(socket, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for socket event '${event}'`));
    }, timeout);
    const handler = (data) => {
      clearTimeout(timer);
      resolve(data);
    };
    socket.once(event, handler);
  });
}

describe('WebSocket Service', () => {
  let httpServer;
  let port;
  let clientSocket;
  let serverSocket;
  let testToken;

  beforeAll(async () => {
    // Create test JWT token (signed with the same secret server.js verifies)
    testToken = jwt.sign(
      { userId: TEST_USER_ID, role: 'business_admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create HTTP server + initialize WebSocket service
    httpServer = createServer();
    webSocketService.initialize(httpServer);

    // Capture the server-side socket for the main client
    webSocketService.io.on('connection', (socket) => {
      serverSocket = socket;
    });

    await new Promise((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;

    // Create client socket — listeners registered BEFORE connect so no event
    // can be missed (the server emits 'connection-established' immediately).
    clientSocket = new Client(`http://localhost:${port}`, {
      auth: { token: testToken },
      transports: ['websocket'],
      forceNew: true
    });
    const connectionEstablished = waitFor(clientSocket, 'connection-established');
    await waitFor(clientSocket, 'connect');
    await connectionEstablished;
  });

  afterAll(async () => {
    if (clientSocket) clientSocket.close();
    webSocketService.shutdown();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  describe('Connection Management', () => {
    it('should authenticate user on connection', () => {
      expect(serverSocket.userId).toBe(TEST_USER_ID);
      expect(serverSocket.userRole).toBe('business_admin');
    });

    it('should track connected users', () => {
      const stats = webSocketService.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThan(0);
    });

    it('should send connection established event', () => {
      // The event was captured in beforeAll before the connection completed
      expect(serverSocket).toBeDefined();
    });
  });

  describe('Dashboard Events', () => {
    it('should handle join dashboard event', async () => {
      const dataPromise = waitFor(clientSocket, 'dashboard-data');
      clientSocket.emit('join-dashboard', { preferences: { theme: 'dark', refreshInterval: 30 } });

      const data = await dataPromise;
      expect(data.sales).toBeDefined();
      expect(data.inventory).toBeDefined();
      expect(data.alerts).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should handle analytics request', async () => {
      const dataPromise = waitFor(clientSocket, 'analytics-data');
      clientSocket.emit('request-analytics', { dateRange: 'week' });

      const data = await dataPromise;
      expect(data.type).toBe('sales');
      expect(data.data).toBeDefined();
      expect(data.data.sales).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should respond gracefully to analytics request with no filters', async () => {
      const dataPromise = waitFor(clientSocket, 'analytics-data');
      clientSocket.emit('request-analytics');

      const data = await dataPromise;
      expect(data.type).toBe('sales');
      expect(data.data).toBeDefined();
    });

    it('should handle dashboard customization', async () => {
      const dataPromise = waitFor(clientSocket, 'dashboard-customization-saved');
      clientSocket.emit('customize-dashboard', {
        widgets: [
          { id: 'sales-overview', x: 0, y: 0, w: 6, h: 4 },
          { id: 'inventory-status', x: 6, y: 0, w: 6, h: 4 }
        ]
      });

      const data = await dataPromise;
      expect(data.message).toBe('Dashboard layout saved successfully');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle leave dashboard event', async () => {
      // Ensure the client is actually joined first
      await new Promise((resolve) => {
        const p = waitFor(clientSocket, 'dashboard-data');
        clientSocket.emit('join-dashboard');
        p.then(() => resolve());
      });

      clientSocket.emit('leave-dashboard');

      // Give the server a tick to process the leave
      await new Promise((resolve) => setTimeout(resolve, 100));
      const stats = webSocketService.getConnectionStats();
      expect(stats.dashboardUsers).toBe(0);
    });
  });

  describe('Real-time Notifications', () => {
    it('should broadcast sale event', async () => {
      // Join the dashboard room first
      await new Promise((resolve) => {
        const p = waitFor(clientSocket, 'dashboard-data');
        clientSocket.emit('join-dashboard');
        p.then(() => resolve());
      });

      const notificationPromise = waitFor(clientSocket, 'notification');
      webSocketService.broadcastSaleEvent({
        _id: 'test-sale-id',
        total: 150.00,
        paymentMethod: 'cash',
        items: [{ name: 'Test Product', quantity: 2 }]
      });

      const notification = await notificationPromise;
      expect(notification.type).toBe('sale');
      expect(notification.title).toBe('New Sale');
      expect(notification.data.total).toBe(150.00);
    });

    it('should broadcast inventory alert', async () => {
      const notificationPromise = waitFor(clientSocket, 'notification');
      webSocketService.broadcastInventoryAlert({
        _id: 'test-product-id',
        name: 'Test Product',
        stock: 2,
        reorderPoint: 10
      });

      const notification = await notificationPromise;
      expect(notification.type).toBe('inventory');
      expect(notification.title).toBe('Low Stock Alert');
      expect(notification.priority).toBe('high');
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent connections', async () => {
      const connections = [];
      const connectionPromises = [];

      // Create 10 concurrent connections
      for (let i = 0; i < 10; i++) {
        const client = new Client(`http://localhost:${port}`, {
          auth: { token: testToken },
          transports: ['websocket']
        });

        connections.push(client);
        connectionPromises.push(waitFor(client, 'connect'));
      }

      await Promise.all(connectionPromises);

      const stats = webSocketService.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(10);

      // Clean up connections
      connections.forEach(client => client.close());
    });
  });

  describe('Error Handling', () => {
    it('should reject connection without valid token', async () => {
      const invalidClient = new Client(`http://localhost:${port}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket']
      });

      const error = await waitFor(invalidClient, 'connect_error');
      expect(error.message).toContain('Authentication failed');
      invalidClient.close();
    });

    it('should reject connection with no token', async () => {
      const noTokenClient = new Client(`http://localhost:${port}`, {
        transports: ['websocket']
      });

      const error = await waitFor(noTokenClient, 'connect_error');
      expect(error.message).toContain('Authentication');
      noTokenClient.close();
    });
  });
});
