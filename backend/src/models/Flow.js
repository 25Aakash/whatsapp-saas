const mongoose = require('mongoose');

/**
 * Flow Node schema — represents a single step in a chatbot flow
 * Node types: start, sendMessage, sendTemplate, askQuestion, condition,
 *             delay, apiCall, assignAgent, addTag, setVariable, end
 */
const flowNodeSchema = new mongoose.Schema(
  {
    nodeId: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'start',
        'sendMessage',
        'sendTemplate',
        'askQuestion',
        'condition',
        'delay',
        'apiCall',
        'assignAgent',
        'addTag',
        'setVariable',
        'csatSurvey',
        'end',
      ],
    },
    label: { type: String, default: '' },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    // Data varies per node type
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    /*
      data examples per type:
      sendMessage:  { message: "Hello!" }
      sendTemplate: { templateName: "welcome", language: "en", components: [] }
      askQuestion:  { question: "What is your name?", variable: "user_name", options: ["Option1","Option2"] }
      condition:    { variable: "user_name", operator: "eq", value: "John" }
      delay:        { seconds: 5 }
      apiCall:      { url: "https://...", method: "GET", headers: {}, bodyTemplate: "", responseVariable: "api_result" }
      assignAgent:  { agentId: null } // null = round robin
      addTag:       { tag: "vip" }
      setVariable:  { variable: "score", value: "10" }
      csatSurvey:   { question: "How was your experience?", scale: 5 }
    */
  },
  { _id: false }
);

/**
 * Flow Edge schema — connection between two nodes
 */
const flowEdgeSchema = new mongoose.Schema(
  {
    edgeId: { type: String, required: true },
    source: { type: String, required: true }, // nodeId
    target: { type: String, required: true }, // nodeId
    sourceHandle: { type: String, default: 'default' }, // for condition nodes: "true" / "false"
    label: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * Flow (Chatbot) schema
 */
const flowSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Flow name is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    // Trigger condition
    trigger: {
      type: {
        type: String,
        enum: ['keyword', 'firstMessage', 'allMessages', 'manual', 'webhook'],
        default: 'keyword',
      },
      keywords: [{ type: String, trim: true }],
    },
    // Flow graph
    nodes: [flowNodeSchema],
    edges: [flowEdgeSchema],
    // Flow variables (initial context)
    variables: {
      type: Map,
      of: String,
      default: {},
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
    },
    // Stats
    stats: {
      triggered: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
    },
    // Priority for trigger matching (lower = higher priority)
    priority: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

flowSchema.index({ tenant: 1, status: 1, priority: 1 });
flowSchema.index({ tenant: 1, 'trigger.keywords': 1 });

module.exports = mongoose.model('Flow', flowSchema);
