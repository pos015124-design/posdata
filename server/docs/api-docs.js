/**
 * API Documentation Generator
 * Creates comprehensive API documentation for the Dukani system
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dukani E-commerce API',
      version: '1.0.0',
      description: 'Comprehensive API for the Dukani multi-tenant e-commerce platform',
      contact: {
        name: 'Dukani Support',
        email: 'support@dukani.com',
        url: 'https://dukani.com/support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.dukani.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['super_admin', 'business_admin', 'staff', 'customer'],
              description: 'User role'
            },
            tenantId: {
              type: 'string',
              description: 'Tenant identifier'
            },
            permissions: {
              type: 'object',
              description: 'User permissions object',
              properties: {
                dashboard: { type: 'boolean' },
                analytics: { type: 'boolean' },
                pos: { type: 'boolean' },
                sales: { type: 'boolean' },
                orders: { type: 'boolean' },
                inventory: { type: 'boolean' },
                products: { type: 'boolean' },
                customers: { type: 'boolean' },
                staff: { type: 'boolean' },
                business: { type: 'boolean' },
                reports: { type: 'boolean' },
              }
            }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'price', 'category'],
          properties: {
            name: {
              type: 'string',
              description: 'Product name'
            },
            description: {
              type: 'string',
              description: 'Product description'
            },
            price: {
              type: 'number',
              format: 'float',
              minimum: 0,
              description: 'Product price'
            },
            category: {
              type: 'string',
              description: 'Product category'
            },
            stock: {
              type: 'number',
              minimum: 0,
              description: 'Available stock quantity'
            },
            businessId: {
              type: 'string',
              description: 'Business identifier'
            },
            tenantId: {
              type: 'string',
              description: 'Tenant identifier'
            }
          }
        },
        Order: {
          type: 'object',
          required: ['items', 'customerEmail', 'businessId'],
          properties: {
            orderNumber: {
              type: 'string',
              description: 'Unique order number'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  productName: { type: 'string' },
                  price: { type: 'number' },
                  quantity: { type: 'number' },
                  subtotal: { type: 'number' }
                }
              }
            },
            subtotal: { type: 'number' },
            taxAmount: { type: 'number' },
            shippingAmount: { type: 'number' },
            total: { type: 'number' },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded']
            },
            paymentMethod: {
              type: 'string',
              enum: ['cash', 'card', 'mobile', 'online', 'bank_transfer']
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded']
            },
            businessId: { type: 'string' },
            tenantId: { type: 'string' }
          }
        }
      }
    }
  },
  apis: [
    './server/routes/*.js',
    './server/docs/*.js'
  ],
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info hgroup.main { margin: 0 0 20px 0; }
    `,
    customSiteTitle: 'Dukani API Documentation',
    customfavIcon: '/favicon.ico'
  }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });
};

module.exports = { setupSwagger, specs };