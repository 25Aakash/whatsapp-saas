const catalogService = require('../services/catalog.service');
const { catchAsync } = require('../middlewares/error.middleware');

/**
 * Get catalog products
 */
const getProducts = catchAsync(async (req, res) => {
  const { catalogId } = req.params;
  const tenant = req.user.tenant;
  const tenantId = typeof tenant === 'object' ? tenant._id : tenant;

  const result = await catalogService.getCatalogProducts(tenantId, catalogId, req.query);
  res.json({ success: true, ...result });
});

/**
 * Get a single product
 */
const getProduct = catchAsync(async (req, res) => {
  const tenant = req.user.tenant;
  const tenantId = typeof tenant === 'object' ? tenant._id : tenant;

  const product = await catalogService.getProduct(tenantId, req.params.productId);
  res.json({ success: true, data: product });
});

/**
 * Send a single product message
 */
const sendProduct = catchAsync(async (req, res) => {
  const { to, catalogId, productRetailerId, phoneNumberId } = req.body;
  const tenant = req.user.tenant;
  const tenantId = typeof tenant === 'object' ? tenant._id : tenant;
  const pnId = phoneNumberId || tenant?.phoneNumberId;

  const result = await catalogService.sendProductMessage(tenantId, pnId, to, catalogId, productRetailerId);
  res.json({ success: true, data: result });
});

/**
 * Send a product list message
 */
const sendProductList = catchAsync(async (req, res) => {
  const { to, catalogId, sections, phoneNumberId } = req.body;
  const tenant = req.user.tenant;
  const tenantId = typeof tenant === 'object' ? tenant._id : tenant;
  const pnId = phoneNumberId || tenant?.phoneNumberId;

  const result = await catalogService.sendProductListMessage(tenantId, pnId, to, catalogId, sections);
  res.json({ success: true, data: result });
});

/**
 * Send catalog browse message
 */
const sendCatalog = catchAsync(async (req, res) => {
  const { to, bodyText, phoneNumberId } = req.body;
  const tenant = req.user.tenant;
  const tenantId = typeof tenant === 'object' ? tenant._id : tenant;
  const pnId = phoneNumberId || tenant?.phoneNumberId;

  const result = await catalogService.sendCatalogMessage(tenantId, pnId, to, bodyText);
  res.json({ success: true, data: result });
});

module.exports = { getProducts, getProduct, sendProduct, sendProductList, sendCatalog };
