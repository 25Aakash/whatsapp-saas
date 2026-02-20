const mongoose = require('mongoose');

/**
 * Tracks an active flow session for a conversation
 */
const flowSessionSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    flow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flow',
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    // Current position in the flow
    currentNodeId: {
      type: String,
      required: true,
    },
    // Session variables (accumulated during flow execution)
    variables: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Waiting for user input (askQuestion node)
    waitingForInput: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'error', 'cancelled'],
      default: 'active',
    },
    // Execution history for debugging
    history: [
      {
        nodeId: String,
        type: String,
        timestamp: { type: Date, default: Date.now },
        result: mongoose.Schema.Types.Mixed,
      },
    ],
    errorInfo: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

flowSessionSchema.index({ tenant: 1, conversation: 1, status: 1 });
flowSessionSchema.index({ status: 1, updatedAt: 1 }); // Cleanup stale sessions

module.exports = mongoose.model('FlowSession', flowSessionSchema);
