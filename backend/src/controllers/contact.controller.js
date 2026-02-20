const contactService = require('../services/contact.service');
const { apiResponse, paginatedResponse, parsePagination } = require('../utils/helpers');

/**
 * POST /api/v1/contacts
 */
const createContact = async (req, res, next) => {
  try {
    const contact = await contactService.upsertContact(req.tenantId, req.body);
    return apiResponse(res, 201, 'Contact created', { contact });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/contacts
 */
const listContacts = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, tag, group } = req.query;
    const { contacts, total } = await contactService.listContacts(req.tenantId, {
      skip, limit, search, tag, group,
    });
    return paginatedResponse(res, contacts, total, page, limit);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/contacts/:id
 */
const getContact = async (req, res, next) => {
  try {
    const contact = await contactService.getContactById(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'Contact fetched', { contact });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/contacts/:id
 */
const updateContact = async (req, res, next) => {
  try {
    const contact = await contactService.updateContact(req.tenantId, req.params.id, req.body);
    return apiResponse(res, 200, 'Contact updated', { contact });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/contacts/:id
 */
const deleteContact = async (req, res, next) => {
  try {
    await contactService.deleteContact(req.tenantId, req.params.id);
    return apiResponse(res, 200, 'Contact deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/contacts/import
 */
const importContacts = async (req, res, next) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return apiResponse(res, 400, 'Contacts array is required');
    }
    if (contacts.length > 10000) {
      return apiResponse(res, 400, 'Maximum 10,000 contacts per import');
    }
    const result = await contactService.bulkImport(req.tenantId, contacts);
    return apiResponse(res, 200, 'Contacts imported', result);
  } catch (error) {
    next(error);
  }
};

module.exports = { createContact, listContacts, getContact, updateContact, deleteContact, importContacts };
