const Flow = require('../models/Flow');
const FlowSession = require('../models/FlowSession');
const whatsappService = require('./whatsapp.service');
const Conversation = require('../models/Conversation');
const axios = require('axios');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/error.middleware');

// ============ Flow CRUD ============

const createFlow = async (tenantId, userId, data) => {
  const flow = await Flow.create({
    tenant: tenantId,
    createdBy: userId,
    ...data,
  });
  return flow;
};

const getFlows = async (tenantId, { page = 1, limit = 20, status } = {}) => {
  const filter = { tenant: tenantId };
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  const [flows, total] = await Promise.all([
    Flow.find(filter).sort({ priority: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Flow.countDocuments(filter),
  ]);
  return { flows, total, page, pages: Math.ceil(total / limit) };
};

const getFlowById = async (tenantId, flowId) => {
  const flow = await Flow.findOne({ _id: flowId, tenant: tenantId });
  if (!flow) throw new ApiError(404, 'Flow not found');
  return flow;
};

const updateFlow = async (tenantId, flowId, data) => {
  const flow = await Flow.findOneAndUpdate(
    { _id: flowId, tenant: tenantId },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!flow) throw new ApiError(404, 'Flow not found');
  return flow;
};

const deleteFlow = async (tenantId, flowId) => {
  const flow = await Flow.findOneAndDelete({ _id: flowId, tenant: tenantId });
  if (!flow) throw new ApiError(404, 'Flow not found');
  // Cancel any active sessions for this flow
  await FlowSession.updateMany(
    { flow: flowId, status: 'active' },
    { $set: { status: 'cancelled' } }
  );
  return flow;
};

const toggleFlowStatus = async (tenantId, flowId, status) => {
  return updateFlow(tenantId, flowId, { status });
};

// ============ Flow Engine ============

/**
 * Find matching flow based on inbound message
 */
const findMatchingFlow = async (tenantId, messageText) => {
  const text = (messageText || '').toLowerCase().trim();

  // 1. Check keyword triggers (highest priority first)
  const keywordFlows = await Flow.find({
    tenant: tenantId,
    status: 'active',
    'trigger.type': 'keyword',
  }).sort({ priority: 1 }).lean();

  for (const flow of keywordFlows) {
    const keywords = (flow.trigger.keywords || []).map((k) => k.toLowerCase());
    if (keywords.some((kw) => text.includes(kw) || text === kw)) {
      return flow;
    }
  }

  // 2. Check firstMessage trigger
  const firstMsgFlow = await Flow.findOne({
    tenant: tenantId,
    status: 'active',
    'trigger.type': 'firstMessage',
  }).sort({ priority: 1 }).lean();

  if (firstMsgFlow) return firstMsgFlow;

  // 3. Check allMessages trigger (catch-all)
  const catchAllFlow = await Flow.findOne({
    tenant: tenantId,
    status: 'active',
    'trigger.type': 'allMessages',
  }).sort({ priority: 1 }).lean();

  return catchAllFlow || null;
};

/**
 * Start or resume a flow session for a conversation
 */
const handleInboundForFlow = async (tenantId, conversationId, customerPhone, phoneNumberId, messageText) => {
  // Check if there's an active session waiting for input
  let session = await FlowSession.findOne({
    tenant: tenantId,
    conversation: conversationId,
    status: 'active',
    waitingForInput: true,
  });

  if (session) {
    return processUserInput(session, messageText, phoneNumberId);
  }

  // Check if there's already an active (non-waiting) session — skip
  const activeSession = await FlowSession.findOne({
    tenant: tenantId,
    conversation: conversationId,
    status: 'active',
    waitingForInput: false,
  });
  if (activeSession) return null; // Flow is already running

  // Find matching flow
  const flow = await findMatchingFlow(tenantId, messageText);
  if (!flow) return null;

  // Find start node
  const startNode = flow.nodes.find((n) => n.type === 'start');
  if (!startNode) {
    logger.warn(`Flow ${flow._id} has no start node`);
    return null;
  }

  // Create session
  session = await FlowSession.create({
    tenant: tenantId,
    flow: flow._id,
    conversation: conversationId,
    customerPhone,
    currentNodeId: startNode.nodeId,
    variables: new Map([
      ['customer_phone', customerPhone],
      ['customer_message', messageText],
      ...(flow.variables ? flow.variables.entries() : []),
    ]),
  });

  // Increment flow trigger count
  Flow.updateOne({ _id: flow._id }, { $inc: { 'stats.triggered': 1 } }).catch(() => {});

  // Execute from start
  return executeFlow(session, flow, phoneNumberId);
};

/**
 * Process user input for a waiting session
 */
const processUserInput = async (session, userInput, phoneNumberId) => {
  const flow = await Flow.findById(session.flow).lean();
  if (!flow) {
    session.status = 'error';
    session.errorInfo = 'Flow not found';
    await session.save();
    return null;
  }

  const currentNode = flow.nodes.find((n) => n.nodeId === session.currentNodeId);
  if (!currentNode) {
    session.status = 'error';
    session.errorInfo = 'Current node not found';
    await session.save();
    return null;
  }

  // Store the user's answer in the variable
  if (currentNode.type === 'askQuestion' && currentNode.data?.variable) {
    session.variables.set(currentNode.data.variable, userInput);
  }

  session.waitingForInput = false;
  session.history.push({
    nodeId: currentNode.nodeId,
    type: 'userInput',
    result: { input: userInput },
  });
  await session.save();

  // Move to the next node
  const nextNodeId = getNextNode(flow, currentNode.nodeId, userInput, session);
  if (!nextNodeId) {
    session.status = 'completed';
    await session.save();
    Flow.updateOne({ _id: flow._id }, { $inc: { 'stats.completed': 1 } }).catch(() => {});
    return null;
  }

  session.currentNodeId = nextNodeId;
  await session.save();

  return executeFlow(session, flow, phoneNumberId);
};

/**
 * Execute flow from the current node forward
 */
const executeFlow = async (session, flow, phoneNumberId, maxSteps = 50) => {
  let steps = 0;

  while (steps < maxSteps) {
    steps++;

    const currentNode = flow.nodes.find((n) => n.nodeId === session.currentNodeId);
    if (!currentNode) {
      session.status = 'error';
      session.errorInfo = `Node ${session.currentNodeId} not found`;
      await session.save();
      Flow.updateOne({ _id: flow._id }, { $inc: { 'stats.errors': 1 } }).catch(() => {});
      return null;
    }

    try {
      const result = await executeNode(session, currentNode, phoneNumberId);

      session.history.push({
        nodeId: currentNode.nodeId,
        type: currentNode.type,
        result,
      });

      // If node requires user input, pause execution
      if (result?.waitForInput) {
        session.waitingForInput = true;
        await session.save();
        return { paused: true, nodeId: currentNode.nodeId };
      }

      // If delay node, schedule resume
      if (result?.delay) {
        await session.save();
        // In production, use BullMQ delayed job. For now, inline setTimeout.
        setTimeout(async () => {
          try {
            const freshSession = await FlowSession.findById(session._id);
            if (freshSession && freshSession.status === 'active') {
              const nextId = getNextNode(flow, currentNode.nodeId, null, freshSession);
              if (nextId) {
                freshSession.currentNodeId = nextId;
                await freshSession.save();
                await executeFlow(freshSession, flow, phoneNumberId);
              } else {
                freshSession.status = 'completed';
                await freshSession.save();
              }
            }
          } catch (err) {
            logger.error('Delayed flow resume error:', err.message);
          }
        }, (result.delay || 1) * 1000);
        return { delayed: true, seconds: result.delay };
      }

      // End node
      if (currentNode.type === 'end') {
        session.status = 'completed';
        await session.save();
        Flow.updateOne({ _id: flow._id }, { $inc: { 'stats.completed': 1 } }).catch(() => {});
        return { completed: true };
      }

      // Move to next node
      const nextNodeId = getNextNode(flow, currentNode.nodeId, result?.branchValue, session);
      if (!nextNodeId) {
        session.status = 'completed';
        await session.save();
        Flow.updateOne({ _id: flow._id }, { $inc: { 'stats.completed': 1 } }).catch(() => {});
        return { completed: true };
      }

      session.currentNodeId = nextNodeId;
      await session.save();
    } catch (err) {
      logger.error(`Flow execution error at node ${currentNode.nodeId}:`, err.message);
      session.status = 'error';
      session.errorInfo = err.message;
      await session.save();
      Flow.updateOne({ _id: flow._id }, { $inc: { 'stats.errors': 1 } }).catch(() => {});
      return { error: err.message };
    }
  }

  logger.warn(`Flow ${flow._id} exceeded max steps (${maxSteps})`);
  session.status = 'error';
  session.errorInfo = 'Max steps exceeded';
  await session.save();
  return { error: 'Max steps exceeded' };
};

/**
 * Execute a single node
 */
const executeNode = async (session, node, phoneNumberId) => {
  const tenantId = session.tenant;
  const phone = session.customerPhone;

  switch (node.type) {
    case 'start':
      return { ok: true };

    case 'sendMessage': {
      const message = interpolateVariables(node.data?.message || '', session.variables);
      await whatsappService.sendTextMessage(tenantId, phoneNumberId, phone, message);
      return { sent: true, message };
    }

    case 'sendTemplate': {
      const { templateName, language, components } = node.data || {};
      await whatsappService.sendTemplateMessage(tenantId, phoneNumberId, phone, templateName, language || 'en', components || []);
      return { sent: true, templateName };
    }

    case 'askQuestion': {
      const question = interpolateVariables(node.data?.question || '', session.variables);
      const options = node.data?.options || [];

      if (options.length > 0) {
        // Send as interactive list/buttons
        const buttons = options.slice(0, 3).map((opt, i) => ({
          type: 'reply',
          reply: { id: `opt_${i}`, title: opt.substring(0, 20) },
        }));
        await whatsappService.sendInteractiveMessage(tenantId, phoneNumberId, phone, {
          type: 'button',
          body: { text: question },
          action: { buttons },
        });
      } else {
        await whatsappService.sendTextMessage(tenantId, phoneNumberId, phone, question);
      }
      return { waitForInput: true };
    }

    case 'condition': {
      const { variable, operator, value } = node.data || {};
      const actual = session.variables.get(variable) || '';
      let matches = false;

      switch (operator) {
        case 'eq': matches = actual === value; break;
        case 'neq': matches = actual !== value; break;
        case 'contains': matches = actual.includes(value); break;
        case 'startsWith': matches = actual.startsWith(value); break;
        case 'gt': matches = parseFloat(actual) > parseFloat(value); break;
        case 'lt': matches = parseFloat(actual) < parseFloat(value); break;
        case 'exists': matches = !!actual; break;
        default: matches = actual === value;
      }

      return { branchValue: matches ? 'true' : 'false' };
    }

    case 'delay': {
      return { delay: node.data?.seconds || 5 };
    }

    case 'apiCall': {
      const { url, method, headers, bodyTemplate, responseVariable } = node.data || {};
      const interpolatedUrl = interpolateVariables(url || '', session.variables);
      const interpolatedBody = bodyTemplate ? interpolateVariables(bodyTemplate, session.variables) : undefined;

      try {
        const resp = await axios({
          method: method || 'GET',
          url: interpolatedUrl,
          headers: headers || {},
          data: interpolatedBody ? JSON.parse(interpolatedBody) : undefined,
          timeout: 10000,
        });

        if (responseVariable) {
          session.variables.set(responseVariable, JSON.stringify(resp.data));
        }
        return { status: resp.status, data: resp.data };
      } catch (err) {
        if (responseVariable) {
          session.variables.set(responseVariable, JSON.stringify({ error: err.message }));
        }
        return { error: err.message };
      }
    }

    case 'assignAgent': {
      const agentId = node.data?.agentId || null;
      await Conversation.findByIdAndUpdate(session.conversation, {
        $set: { assignedAgent: agentId },
      });
      return { assigned: agentId || 'round-robin' };
    }

    case 'addTag': {
      const tag = node.data?.tag;
      if (tag) {
        await Conversation.findByIdAndUpdate(session.conversation, {
          $addToSet: { tags: tag },
        });
      }
      return { tag };
    }

    case 'setVariable': {
      const { variable, value } = node.data || {};
      if (variable) {
        session.variables.set(variable, interpolateVariables(value || '', session.variables));
      }
      return { variable, value: session.variables.get(variable) };
    }

    case 'csatSurvey': {
      const question = node.data?.question || 'How would you rate your experience? (1-5)';
      await whatsappService.sendTextMessage(tenantId, phoneNumberId, phone, question);
      session.variables.set('_csat_pending', 'true');
      return { waitForInput: true };
    }

    case 'end':
      return { end: true };

    default:
      logger.warn(`Unknown flow node type: ${node.type}`);
      return { skipped: true };
  }
};

/**
 * Get the next node ID based on edges
 */
const getNextNode = (flow, currentNodeId, branchValue, session) => {
  const edges = flow.edges.filter((e) => e.source === currentNodeId);
  if (edges.length === 0) return null;

  if (branchValue) {
    // For condition nodes, follow the matching branch
    const matchedEdge = edges.find((e) => e.sourceHandle === branchValue);
    return matchedEdge ? matchedEdge.target : edges[0].target;
  }

  // Default: follow first edge
  return edges[0].target;
};

/**
 * Interpolate {{variable}} placeholders
 */
const interpolateVariables = (text, variables) => {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables.get(key) || match;
  });
};

/**
 * Cancel all active sessions for a conversation
 */
const cancelFlowSessions = async (tenantId, conversationId) => {
  await FlowSession.updateMany(
    { tenant: tenantId, conversation: conversationId, status: 'active' },
    { $set: { status: 'cancelled' } }
  );
};

/**
 * Get flow sessions for analytics
 */
const getFlowSessions = async (tenantId, flowId, { page = 1, limit = 20 } = {}) => {
  const filter = { tenant: tenantId };
  if (flowId) filter.flow = flowId;
  const skip = (page - 1) * limit;
  const [sessions, total] = await Promise.all([
    FlowSession.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FlowSession.countDocuments(filter),
  ]);
  return { sessions, total, page, pages: Math.ceil(total / limit) };
};

module.exports = {
  createFlow,
  getFlows,
  getFlowById,
  updateFlow,
  deleteFlow,
  toggleFlowStatus,
  findMatchingFlow,
  handleInboundForFlow,
  cancelFlowSessions,
  getFlowSessions,
};
