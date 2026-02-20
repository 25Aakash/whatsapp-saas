const axios = require('axios');
const { getDecryptedToken } = require('./tenant.service');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/error.middleware');

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Catalog & E-commerce Service
 * Implements WhatsApp Commerce API: product messages, catalog browsing, orders
 */

// ============ Catalog Management ============

/**
 * Get catalog products (synced from Meta Commerce Manager)
 */
const getCatalogProducts = async (tenantId, catalogId, params = {}) => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.get(`${META_GRAPH_URL}/${catalogId}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        fields: 'id,name,description,price,currency,availability,image_url,url,retailer_id,category',
        limit: params.limit || 50,
        after: params.after || undefined,
      },
    });

    return {
      products: response.data.data || [],
      paging: response.data.paging || {},
    };
  } catch (err) {
    logger.error('Get catalog products error:', err.response?.data || err.message);
    throw new ApiError(500, `Failed to fetch catalog: ${err.message}`);
  }
};

/**
 * Get a specific product from catalog
 */
const getProduct = async (tenantId, productId) => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.get(`${META_GRAPH_URL}/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        fields: 'id,name,description,price,currency,availability,image_url,url,retailer_id,category',
      },
    });

    return response.data;
  } catch (err) {
    logger.error('Get product error:', err.message);
    throw new ApiError(500, `Failed to fetch product: ${err.message}`);
  }
};

// ============ Commerce Messages ============

/**
 * Send a single product message
 * Shows a product card with image, title, price, description
 */
const sendProductMessage = async (tenantId, phoneNumberId, to, catalogId, productRetailerId) => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product',
          body: { text: 'Check out this product!' },
          action: {
            catalog_id: catalogId,
            product_retailer_id: productRetailerId,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Product message sent to ${to}, waMessageId: ${waMessageId}`);
    return { waMessageId, status: 'sent' };
  } catch (err) {
    const errorData = err.response?.data?.error;
    logger.error('Send product message error:', errorData || err.message);
    throw new ApiError(err.response?.status || 500, `Failed to send product: ${errorData?.message || err.message}`);
  }
};

/**
 * Send a product list message (multi-product message)
 * Shows a scrollable list of products from the catalog
 */
const sendProductListMessage = async (tenantId, phoneNumberId, to, catalogId, sections) => {
  const token = await getDecryptedToken(tenantId);

  /*
    sections format:
    [
      {
        title: "Featured Products",
        product_items: [
          { product_retailer_id: "SKU123" },
          { product_retailer_id: "SKU456" },
        ]
      }
    ]
  */

  try {
    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product_list',
          header: { type: 'text', text: 'Our Products' },
          body: { text: 'Browse our catalog:' },
          footer: { text: 'Tap to view details' },
          action: {
            catalog_id: catalogId,
            sections,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Product list message sent to ${to}, waMessageId: ${waMessageId}`);
    return { waMessageId, status: 'sent' };
  } catch (err) {
    const errorData = err.response?.data?.error;
    logger.error('Send product list error:', errorData || err.message);
    throw new ApiError(err.response?.status || 500, `Failed to send product list: ${errorData?.message || err.message}`);
  }
};

/**
 * Send a catalog message (opens full catalog browser)
 */
const sendCatalogMessage = async (tenantId, phoneNumberId, to, bodyText = 'Browse our full catalog!') => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'catalog_message',
          body: { text: bodyText },
          action: { name: 'catalog_message' },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Catalog message sent to ${to}, waMessageId: ${waMessageId}`);
    return { waMessageId, status: 'sent' };
  } catch (err) {
    const errorData = err.response?.data?.error;
    logger.error('Send catalog message error:', errorData || err.message);
    throw new ApiError(err.response?.status || 500, `Failed to send catalog: ${errorData?.message || err.message}`);
  }
};

/**
 * Handle an incoming order message from WhatsApp
 * (order object from webhook: message.order)
 */
const processIncomingOrder = (orderData) => {
  /*
    orderData format:
    {
      catalog_id: "123456",
      text: "Optional customer note",
      product_items: [
        { product_retailer_id: "SKU123", quantity: 2, item_price: 10.00, currency: "USD" }
      ]
    }
  */
  const products = orderData.product_items || [];
  const total = products.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
  const currency = products[0]?.currency || 'USD';

  return {
    catalogId: orderData.catalog_id,
    customerNote: orderData.text || '',
    items: products.map((item) => ({
      retailerId: item.product_retailer_id,
      quantity: item.quantity,
      price: item.item_price,
      currency: item.currency,
    })),
    totalAmount: total,
    currency,
    itemCount: products.reduce((sum, item) => sum + item.quantity, 0),
  };
};

module.exports = {
  getCatalogProducts,
  getProduct,
  sendProductMessage,
  sendProductListMessage,
  sendCatalogMessage,
  processIncomingOrder,
};
