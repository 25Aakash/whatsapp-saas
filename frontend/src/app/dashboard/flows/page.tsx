"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { flowAPI } from "@/lib/api";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  BarChart3,
  Bot,
  ArrowRight,
  Search,
  GitBranch,
} from "lucide-react";

interface FlowNode {
  nodeId: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface FlowEdge {
  edgeId: string;
  source: string;
  target: string;
  sourceHandle: string;
  label: string;
}

interface Flow {
  _id: string;
  name: string;
  description: string;
  trigger: { type: string; keywords: string[] };
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: Record<string, string>;
  status: string;
  stats: { triggered: number; completed: number; errors: number };
  priority: number;
  createdAt: string;
  updatedAt: string;
}

const NODE_TYPES = [
  { type: "start", label: "Start", color: "bg-green-500" },
  { type: "sendMessage", label: "Send Message", color: "bg-blue-500" },
  { type: "sendTemplate", label: "Send Template", color: "bg-indigo-500" },
  { type: "askQuestion", label: "Ask Question", color: "bg-purple-500" },
  { type: "condition", label: "Condition", color: "bg-yellow-500" },
  { type: "delay", label: "Delay", color: "bg-gray-500" },
  { type: "apiCall", label: "API Call", color: "bg-orange-500" },
  { type: "assignAgent", label: "Assign Agent", color: "bg-teal-500" },
  { type: "addTag", label: "Add Tag", color: "bg-pink-500" },
  { type: "setVariable", label: "Set Variable", color: "bg-cyan-500" },
  { type: "csatSurvey", label: "CSAT Survey", color: "bg-amber-500" },
  { type: "end", label: "End", color: "bg-red-500" },
];

const TRIGGER_TYPES = [
  { value: "keyword", label: "Keyword Match" },
  { value: "firstMessage", label: "First Message" },
  { value: "allMessages", label: "All Messages (Catch-all)" },
  { value: "manual", label: "Manual Trigger" },
  { value: "webhook", label: "Webhook Trigger" },
];

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editFlow, setEditFlow] = useState<Flow | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderFlow, setBuilderFlow] = useState<Flow | null>(null);

  const fetchFlows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await flowAPI.list();
      setFlows(res.data.flows || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const handleToggleStatus = async (flow: Flow) => {
    try {
      if (flow.status === "active") {
        await flowAPI.pause(flow._id);
      } else {
        await flowAPI.activate(flow._id);
      }
      fetchFlows();
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this flow?")) return;
    try {
      await flowAPI.delete(id);
      fetchFlows();
    } catch {
      /* ignore */
    }
  };

  const filteredFlows = flows.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (showBuilder && builderFlow) {
    return (
      <FlowBuilderView
        flow={builderFlow}
        onBack={() => {
          setShowBuilder(false);
          setBuilderFlow(null);
          fetchFlows();
        }}
      />
    );
  }

  if (showCreate || editFlow) {
    return (
      <FlowCreateEdit
        flow={editFlow}
        onDone={() => {
          setShowCreate(false);
          setEditFlow(null);
          fetchFlows();
        }}
        onCancel={() => {
          setShowCreate(false);
          setEditFlow(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-emerald-600" />
            Chatbot Flows
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Build automated conversation flows and chatbots
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Flow
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search flows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No flows yet</p>
          <p className="text-sm mt-1">Create your first chatbot flow</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFlows.map((flow) => (
            <div
              key={flow._id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {flow.name}
                  </h3>
                  {flow.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {flow.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    flow.status === "active"
                      ? "default"
                      : flow.status === "paused"
                      ? "secondary"
                      : "outline"
                  }
                  className={
                    flow.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : ""
                  }
                >
                  {flow.status}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {flow.nodes?.length || 0} nodes
                </span>
                <span>Trigger: {flow.trigger?.type}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-1.5">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {flow.stats?.triggered || 0}
                  </div>
                  <div className="text-gray-500">Triggered</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-1.5">
                  <div className="font-semibold text-emerald-600">
                    {flow.stats?.completed || 0}
                  </div>
                  <div className="text-gray-500">Completed</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-1.5">
                  <div className="font-semibold text-red-600">
                    {flow.stats?.errors || 0}
                  </div>
                  <div className="text-gray-500">Errors</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setBuilderFlow(flow);
                    setShowBuilder(true);
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Builder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(flow)}
                >
                  {flow.status === "active" ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditFlow(flow)}
                >
                  <BarChart3 className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(flow._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Create/Edit Flow ============
function FlowCreateEdit({
  flow,
  onDone,
  onCancel,
}: {
  flow?: Flow | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(flow?.name || "");
  const [description, setDescription] = useState(flow?.description || "");
  const [triggerType, setTriggerType] = useState(flow?.trigger?.type || "keyword");
  const [keywords, setKeywords] = useState(flow?.trigger?.keywords?.join(", ") || "");
  const [priority, setPriority] = useState(flow?.priority || 10);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name,
        description,
        trigger: {
          type: triggerType,
          keywords: triggerType === "keyword" ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
        },
        priority,
        ...(flow
          ? {}
          : {
              nodes: [
                { nodeId: "start_1", type: "start", label: "Start", position: { x: 250, y: 50 }, data: {} },
                { nodeId: "end_1", type: "end", label: "End", position: { x: 250, y: 400 }, data: {} },
              ],
              edges: [],
            }),
      };

      if (flow) {
        await flowAPI.update(flow._id, data);
      } else {
        await flowAPI.create(data);
      }
      onDone();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
        {flow ? "Edit Flow" : "Create Flow"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Welcome Bot" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this flow do?" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Trigger Type</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            {TRIGGER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {triggerType === "keyword" && (
          <div>
            <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="hi, hello, start" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Priority (lower = higher)</label>
          <Input type="number" value={priority} onChange={(e) => setPriority(+e.target.value)} min={1} max={100} />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving || !name}>
            {saving ? <Spinner className="h-4 w-4" /> : flow ? "Update" : "Create"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

// ============ Visual Flow Builder ============
function FlowBuilderView({ flow, onBack }: { flow: Flow; onBack: () => void }) {
  const [nodes, setNodes] = useState<FlowNode[]>(flow.nodes || []);
  const [edges, setEdges] = useState<FlowEdge[]>(flow.edges || []);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const addNode = (type: string) => {
    const id = `${type}_${Date.now()}`;
    const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const newNode: FlowNode = {
      nodeId: id,
      type,
      label: NODE_TYPES.find((t) => t.type === type)?.label || type,
      position: { x: 250, y: maxY + 100 },
      data: getDefaultData(type),
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
  };

  const updateNodeData = (nodeId: string, data: Record<string, unknown>) => {
    setNodes(nodes.map((n) => (n.nodeId === nodeId ? { ...n, data: { ...n.data, ...data } } : n)));
    if (selectedNode?.nodeId === nodeId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } });
    }
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.nodeId !== nodeId));
    setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.nodeId === nodeId) setSelectedNode(null);
  };

  const handleNodeClick = (node: FlowNode) => {
    if (connectingFrom) {
      if (connectingFrom !== node.nodeId) {
        const edgeId = `e_${Date.now()}`;
        setEdges([...edges, { edgeId, source: connectingFrom, target: node.nodeId, sourceHandle: "default", label: "" }]);
      }
      setConnectingFrom(null);
    } else {
      setSelectedNode(node);
    }
  };

  const removeEdge = (edgeId: string) => {
    setEdges(edges.filter((e) => e.edgeId !== edgeId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await flowAPI.update(flow._id, { nodes, edges });
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const getNodeColor = (type: string) => {
    return NODE_TYPES.find((t) => t.type === type)?.color || "bg-gray-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            &larr; Back
          </Button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{flow.name}</h2>
          <Badge variant="outline">{flow.status}</Badge>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : "Save Flow"}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Node Palette */}
        <div className="col-span-2 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Nodes</h3>
          <div className="space-y-1">
            {NODE_TYPES.map((nt) => (
              <button
                key={nt.type}
                onClick={() => addNode(nt.type)}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <span className={`h-2 w-2 rounded-full ${nt.color}`} />
                {nt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flow Canvas */}
        <div className="col-span-7 rounded-xl border bg-gray-50 dark:bg-gray-950 dark:border-gray-700 p-4 min-h-[600px] relative overflow-auto">
          {connectingFrom && (
            <div className="absolute top-2 left-2 bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-medium z-10">
              Click a node to connect from{" "}
              <strong>{nodes.find((n) => n.nodeId === connectingFrom)?.label}</strong>
              <button className="ml-2 underline" onClick={() => setConnectingFrom(null)}>
                Cancel
              </button>
            </div>
          )}

          {nodes.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Add nodes from the palette on the left
            </div>
          )}

          <div className="space-y-2">
            {nodes.map((node, idx) => {
              const outEdges = edges.filter((e) => e.source === node.nodeId);
              return (
                <div key={node.nodeId}>
                  <div
                    onClick={() => handleNodeClick(node)}
                    className={`
                      relative cursor-pointer rounded-lg border-2 p-3 transition-all
                      ${
                        selectedNode?.nodeId === node.nodeId
                          ? "border-emerald-500 shadow-lg"
                          : connectingFrom
                          ? "border-blue-300 hover:border-blue-500"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-400"
                      }
                      bg-white dark:bg-gray-900
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${getNodeColor(node.type)}`} />
                      <span className="text-sm font-medium">{node.label || node.type}</span>
                      <span className="text-xs text-gray-400 ml-auto">#{idx + 1}</span>
                    </div>
                    {node.data && Object.keys(node.data).length > 0 && (
                      <div className="mt-1 text-xs text-gray-500 truncate max-w-xs">
                        {node.type === "sendMessage" && (node.data as { message?: string }).message}
                        {node.type === "askQuestion" && (node.data as { question?: string }).question}
                        {node.type === "condition" && `if {{${(node.data as { variable?: string }).variable}}} ${(node.data as { operator?: string }).operator} "${(node.data as { value?: string }).value}"`}
                        {node.type === "delay" && `Wait ${(node.data as { seconds?: number }).seconds}s`}
                        {node.type === "sendTemplate" && (node.data as { templateName?: string }).templateName}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectingFrom(node.nodeId);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Connect &rarr;
                      </button>
                    </div>
                  </div>
                  {/* Edges from this node */}
                  {outEdges.map((edge) => {
                    const targetNode = nodes.find((n) => n.nodeId === edge.target);
                    return (
                      <div key={edge.edgeId} className="flex items-center gap-2 ml-6 my-1 text-xs text-gray-500">
                        <ArrowRight className="h-3 w-3" />
                        <span>
                          {edge.sourceHandle !== "default" && (
                            <Badge variant="outline" className="mr-1 text-[10px]">
                              {edge.sourceHandle}
                            </Badge>
                          )}
                          {targetNode?.label || edge.target}
                        </span>
                        <button onClick={() => removeEdge(edge.edgeId)} className="text-red-400 hover:text-red-600">
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Properties Panel */}
        <div className="col-span-3 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-4">
          {selectedNode ? (
            <NodePropertiesPanel
              node={selectedNode}
              onUpdate={(data) => updateNodeData(selectedNode.nodeId, data)}
              onRemove={() => removeNode(selectedNode.nodeId)}
              edges={edges}
              onUpdateEdge={(edgeId, handle) => {
                setEdges(edges.map((e) => (e.edgeId === edgeId ? { ...e, sourceHandle: handle } : e)));
              }}
            />
          ) : (
            <div className="text-center text-gray-400 text-sm py-10">
              <Bot className="h-8 w-8 mx-auto mb-2" />
              Select a node to view properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Node Properties Panel ============
function NodePropertiesPanel({
  node,
  onUpdate,
  onRemove,
  edges,
  onUpdateEdge,
}: {
  node: FlowNode;
  onUpdate: (data: Record<string, unknown>) => void;
  onRemove: () => void;
  edges: FlowEdge[];
  onUpdateEdge: (edgeId: string, handle: string) => void;
}) {
  const nodeEdges = edges.filter((e) => e.source === node.nodeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{node.label}</h3>
        {node.type !== "start" && (
          <Button variant="outline" size="sm" className="text-red-600" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="text-xs text-gray-500 uppercase">{node.type}</div>

      {/* Type-specific fields */}
      {node.type === "sendMessage" && (
        <div>
          <label className="block text-xs font-medium mb-1">Message</label>
          <textarea
            value={(node.data as { message?: string }).message || ""}
            onChange={(e) => onUpdate({ message: e.target.value })}
            className="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
            rows={3}
            placeholder="Hello {{customer_name}}!"
          />
          <p className="text-[10px] text-gray-400 mt-1">Use {"{{variable}}"} for dynamic values</p>
        </div>
      )}

      {node.type === "sendTemplate" && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">Template Name</label>
            <Input
              value={(node.data as { templateName?: string }).templateName || ""}
              onChange={(e) => onUpdate({ templateName: e.target.value })}
              className="text-sm"
              placeholder="welcome_message"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Language</label>
            <Input
              value={(node.data as { language?: string }).language || "en"}
              onChange={(e) => onUpdate({ language: e.target.value })}
              className="text-sm"
            />
          </div>
        </>
      )}

      {node.type === "askQuestion" && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">Question</label>
            <textarea
              value={(node.data as { question?: string }).question || ""}
              onChange={(e) => onUpdate({ question: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
              rows={2}
              placeholder="What is your name?"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Save to Variable</label>
            <Input
              value={(node.data as { variable?: string }).variable || ""}
              onChange={(e) => onUpdate({ variable: e.target.value })}
              className="text-sm"
              placeholder="user_name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Quick Reply Options (comma-separated)</label>
            <Input
              value={((node.data as { options?: string[] }).options || []).join(", ")}
              onChange={(e) =>
                onUpdate({
                  options: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="text-sm"
              placeholder="Yes, No, Maybe"
            />
          </div>
        </>
      )}

      {node.type === "condition" && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">Variable</label>
            <Input
              value={(node.data as { variable?: string }).variable || ""}
              onChange={(e) => onUpdate({ variable: e.target.value })}
              className="text-sm"
              placeholder="user_response"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Operator</label>
            <select
              value={(node.data as { operator?: string }).operator || "eq"}
              onChange={(e) => onUpdate({ operator: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="eq">Equals</option>
              <option value="neq">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts With</option>
              <option value="gt">Greater Than</option>
              <option value="lt">Less Than</option>
              <option value="exists">Exists</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Value</label>
            <Input
              value={(node.data as { value?: string }).value || ""}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="text-sm"
            />
          </div>
          {/* Edge handle labels for condition */}
          {nodeEdges.length > 0 && (
            <div className="mt-2">
              <label className="block text-xs font-medium mb-1">Edge Branches</label>
              {nodeEdges.map((edge) => (
                <div key={edge.edgeId} className="flex items-center gap-2 mb-1">
                  <select
                    value={edge.sourceHandle}
                    onChange={(e) => onUpdateEdge(edge.edgeId, e.target.value)}
                    className="rounded border px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                    <option value="default">Default</option>
                  </select>
                  <span className="text-xs text-gray-500">&rarr; ...</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {node.type === "delay" && (
        <div>
          <label className="block text-xs font-medium mb-1">Delay (seconds)</label>
          <Input
            type="number"
            value={(node.data as { seconds?: number }).seconds || 5}
            onChange={(e) => onUpdate({ seconds: +e.target.value })}
            className="text-sm"
            min={1}
            max={86400}
          />
        </div>
      )}

      {node.type === "apiCall" && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">URL</label>
            <Input
              value={(node.data as { url?: string }).url || ""}
              onChange={(e) => onUpdate({ url: e.target.value })}
              className="text-sm"
              placeholder="https://api.example.com/data"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Method</label>
            <select
              value={(node.data as { method?: string }).method || "GET"}
              onChange={(e) => onUpdate({ method: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Response Variable</label>
            <Input
              value={(node.data as { responseVariable?: string }).responseVariable || ""}
              onChange={(e) => onUpdate({ responseVariable: e.target.value })}
              className="text-sm"
              placeholder="api_result"
            />
          </div>
        </>
      )}

      {node.type === "addTag" && (
        <div>
          <label className="block text-xs font-medium mb-1">Tag</label>
          <Input
            value={(node.data as { tag?: string }).tag || ""}
            onChange={(e) => onUpdate({ tag: e.target.value })}
            className="text-sm"
            placeholder="vip"
          />
        </div>
      )}

      {node.type === "setVariable" && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">Variable Name</label>
            <Input
              value={(node.data as { variable?: string }).variable || ""}
              onChange={(e) => onUpdate({ variable: e.target.value })}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Value</label>
            <Input
              value={(node.data as { value?: string }).value || ""}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="text-sm"
            />
          </div>
        </>
      )}

      {node.type === "csatSurvey" && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">Survey Question</label>
            <textarea
              value={(node.data as { question?: string }).question || ""}
              onChange={(e) => onUpdate({ question: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
              rows={2}
              placeholder="How would you rate your experience? (1-5)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Scale (max rating)</label>
            <Input
              type="number"
              value={(node.data as { scale?: number }).scale || 5}
              onChange={(e) => onUpdate({ scale: +e.target.value })}
              className="text-sm"
              min={3}
              max={10}
            />
          </div>
        </>
      )}
    </div>
  );
}

function getDefaultData(type: string): Record<string, unknown> {
  switch (type) {
    case "sendMessage": return { message: "" };
    case "sendTemplate": return { templateName: "", language: "en", components: [] };
    case "askQuestion": return { question: "", variable: "", options: [] };
    case "condition": return { variable: "", operator: "eq", value: "" };
    case "delay": return { seconds: 5 };
    case "apiCall": return { url: "", method: "GET", headers: {}, bodyTemplate: "", responseVariable: "" };
    case "assignAgent": return { agentId: null };
    case "addTag": return { tag: "" };
    case "setVariable": return { variable: "", value: "" };
    case "csatSurvey": return { question: "How would you rate your experience? (1-5)", scale: 5 };
    default: return {};
  }
}
