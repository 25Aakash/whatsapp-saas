const Contact = require('../models/Contact');
const { ApiError } = require('../middlewares/error.middleware');
const { normalizePhone } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Create or update a contact
 */
const upsertContact = async (tenantId, contactData) => {
  const phone = normalizePhone(contactData.phone);
  if (!phone) throw new ApiError(400, 'Phone number is required');

  const contact = await Contact.findOneAndUpdate(
    { tenant: tenantId, phone },
    {
      $set: {
        name: contactData.name || '',
        email: contactData.email || '',
        notes: contactData.notes || '',
        ...(contactData.attributes && { attributes: contactData.attributes }),
      },
      $addToSet: {
        ...(contactData.tags && { tags: { $each: contactData.tags } }),
        ...(contactData.groups && { groups: { $each: contactData.groups } }),
      },
    },
    { upsert: true, new: true }
  );

  return contact;
};

/**
 * List contacts with filtering and pagination
 */
const listContacts = async (tenantId, { skip = 0, limit = 20, search, tag, group } = {}) => {
  const filter = { tenant: tenantId };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (tag) filter.tags = tag;
  if (group) filter.groups = group;

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Contact.countDocuments(filter),
  ]);

  return { contacts, total };
};

/**
 * Get contact by ID
 */
const getContactById = async (tenantId, contactId) => {
  const contact = await Contact.findOne({ _id: contactId, tenant: tenantId });
  if (!contact) throw new ApiError(404, 'Contact not found');
  return contact;
};

/**
 * Get contact by phone number
 */
const getContactByPhone = async (tenantId, phone) => {
  return Contact.findOne({ tenant: tenantId, phone: normalizePhone(phone) });
};

/**
 * Update contact
 */
const updateContact = async (tenantId, contactId, updates) => {
  const contact = await Contact.findOneAndUpdate(
    { _id: contactId, tenant: tenantId },
    { $set: updates },
    { new: true }
  );
  if (!contact) throw new ApiError(404, 'Contact not found');
  return contact;
};

/**
 * Delete contact
 */
const deleteContact = async (tenantId, contactId) => {
  const contact = await Contact.findOneAndDelete({ _id: contactId, tenant: tenantId });
  if (!contact) throw new ApiError(404, 'Contact not found');
  return contact;
};

/**
 * Bulk import contacts
 */
const bulkImport = async (tenantId, contacts) => {
  const operations = contacts.map((c) => ({
    updateOne: {
      filter: { tenant: tenantId, phone: normalizePhone(c.phone) },
      update: {
        $set: {
          name: c.name || '',
          email: c.email || '',
          notes: c.notes || '',
        },
        $addToSet: {
          ...(c.tags && { tags: { $each: c.tags } }),
          ...(c.groups && { groups: { $each: c.groups } }),
        },
      },
      upsert: true,
    },
  }));

  const result = await Contact.bulkWrite(operations);
  logger.info(`Bulk imported ${result.upsertedCount} new, ${result.modifiedCount} updated contacts for tenant ${tenantId}`);

  return {
    created: result.upsertedCount,
    updated: result.modifiedCount,
    total: contacts.length,
  };
};

/**
 * Get contacts by tags or groups (for campaign targeting)
 */
const getContactsByAudience = async (tenantId, audience) => {
  const filter = { tenant: tenantId, isBlocked: false, 'optIn.status': true };

  switch (audience.type) {
    case 'tags':
      filter.tags = { $in: audience.tags };
      break;
    case 'groups':
      filter.groups = { $in: audience.groups };
      break;
    case 'contacts':
      filter._id = { $in: audience.contactIds };
      break;
    case 'all':
    default:
      break;
  }

  return Contact.find(filter).select('phone name').lean();
};

module.exports = {
  upsertContact,
  listContacts,
  getContactById,
  getContactByPhone,
  updateContact,
  deleteContact,
  bulkImport,
  getContactsByAudience,
};
