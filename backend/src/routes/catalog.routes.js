const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalog.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(authorize('customer', 'customer_agent', 'admin'));

// Get catalog products
router.get('/:catalogId/products', catalogController.getProducts);

// Get a specific product
router.get('/products/:productId', catalogController.getProduct);

// Send a single product to a customer
router.post('/send-product', catalogController.sendProduct);

// Send a product list (multi-product message)
router.post('/send-product-list', catalogController.sendProductList);

// Send catalog browse message
router.post('/send-catalog', catalogController.sendCatalog);

module.exports = router;
