const CannedResponse = require('../models/CannedResponse');
const { ApiError } = require('../middlewares/error.middleware');

/**
 * Create a canned response
 */
const createCannedResponse = async (tenantId, userId, data) => {
  return CannedResponse.create({
    tenant: tenantId,
    createdBy: userId,
    shortcode: data.shortcode,
    title: data.title,
    body: data.body,
    category: data.category || 'general',
    variables: data.variables || [],
  });
};

/**
 * List canned responses for a tenant
 */
const listCannedResponses = async (tenantId, { category, search } = {}) => {
  const filter = { tenant: tenantId, isActive: true };
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { shortcode: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { body: { $regex: search, $options: 'i' } },
    ];
  }

  return CannedResponse.find(filter).sort({ shortcode: 1 }).lean();
};

/**
 * Get canned response by shortcode
 */
const getByShortcode = async (tenantId, shortcode) => {
  return CannedResponse.findOne({ tenant: tenantId, shortcode, isActive: true });
};

/**
 * Update a canned response
 */
const updateCannedResponse = async (tenantId, responseId, updates) => {
  const response = await CannedResponse.findOneAndUpdate(
    { _id: responseId, tenant: tenantId },
    { $set: updates },
    { new: true }
  );
  if (!response) throw new ApiError(404, 'Canned response not found');
  return response;
};

/**
 * Delete a canned response
 */
const deleteCannedResponse = async (tenantId, responseId) => {
  const response = await CannedResponse.findOneAndDelete({ _id: responseId, tenant: tenantId });
  if (!response) throw new ApiError(404, 'Canned response not found');
  return response;
};

/**
 * Resolve a shortcode in message text (e.g. /greeting → "Hello! How can we help you?")
 */
const resolveShortcode = async (tenantId, text) => {
  if (!text.startsWith('/')) return null;
  const shortcode = text.split(' ')[0]; // extract /shortcode
  const response = await getByShortcode(tenantId, shortcode);
  if (!response) return null;
  return response.body;
};

module.exports = {
  createCannedResponse,
  listCannedResponses,
  getByShortcode,
  updateCannedResponse,
  deleteCannedResponse,
  resolveShortcode,
};
