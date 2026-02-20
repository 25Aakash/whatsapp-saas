"use client";

import { useState, useEffect, useCallback } from "react";
import { csatAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface Survey {
  _id: string;
  question: string;
  followUpQuestion?: string;
  scale: number;
  trigger: string;
  cooldownHours: number;
  thankYouMessage: string;
  isActive: boolean;
  stats: { totalResponses: number; avgRating: number; npsScore: number };
  createdAt: string;
}

interface Analytics {
  totalResponses: number;
  avgRating: number;
  nps: number;
  distribution: Record<string, number>;
  categories: { promoters: number; passives: number; detractors: number };
  perAgent: Array<{ agentId: string; agentName: string; avgRating: number; count: number }>;
}

type View = "surveys" | "analytics" | "create";

export default function CSATPage() {
  const [view, setView] = useState<View>("surveys");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [question, setQuestion] = useState("How would you rate your experience?");
  const [followUp, setFollowUp] = useState("Any feedback for us?");
  const [scale, setScale] = useState(5);
  const [trigger, setTrigger] = useState("conversation_close");
  const [cooldown, setCooldown] = useState(24);
  const [thankYou, setThankYou] = useState("Thank you for your feedback!");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await csatAPI.listSurveys();
      setSurveys(res.data.data || []);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await csatAPI.getAnalytics();
      setAnalytics(res.data.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "surveys") loadSurveys();
    if (view === "analytics") loadAnalytics();
  }, [view, loadSurveys, loadAnalytics]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { question, followUpQuestion: followUp, scale, trigger, cooldownHours: cooldown, thankYouMessage: thankYou };
      if (editingId) {
        await csatAPI.updateSurvey(editingId, data);
      } else {
        await csatAPI.createSurvey(data);
      }
      setView("surveys");
      setEditingId(null);
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: Survey) => {
    setQuestion(s.question);
    setFollowUp(s.followUpQuestion || "");
    setScale(s.scale);
    setTrigger(s.trigger);
    setCooldown(s.cooldownHours);
    setThankYou(s.thankYouMessage);
    setEditingId(s._id);
    setView("create");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this survey?")) return;
    await csatAPI.deleteSurvey(id);
    loadSurveys();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CSAT Surveys</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Measure customer satisfaction</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "surveys" ? "default" : "outline"} onClick={() => setView("surveys")}>Surveys</Button>
          <Button variant={view === "analytics" ? "default" : "outline"} onClick={() => setView("analytics")}>Analytics</Button>
          <Button onClick={() => { setEditingId(null); setQuestion("How would you rate your experience?"); setView("create"); }}>New Survey</Button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {/* Surveys List */}
      {!loading && view === "surveys" && (
        <div className="space-y-4">
          {surveys.length === 0 && <p className="text-center text-gray-500 py-12">No surveys yet. Create one to start collecting feedback.</p>}
          {surveys.map((s) => (
            <div key={s._id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{s.question}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                  <Badge variant="outline">Scale: 1-{s.scale}</Badge>
                  <Badge variant="outline">Trigger: {s.trigger.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>{s.stats.totalResponses} responses</span>
                  <span>Avg: {s.stats.avgRating?.toFixed(1) || "N/A"}</span>
                  <span>NPS: {s.stats.npsScore ?? "N/A"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(s)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(s._id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics */}
      {!loading && view === "analytics" && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 dark:border-gray-700">
              <p className="text-sm text-gray-500">Total Responses</p>
              <p className="text-2xl font-bold">{analytics.totalResponses}</p>
            </div>
            <div className="rounded-lg border p-4 dark:border-gray-700">
              <p className="text-sm text-gray-500">Avg Rating</p>
              <p className="text-2xl font-bold">{analytics.avgRating?.toFixed(2) || "N/A"}</p>
            </div>
            <div className="rounded-lg border p-4 dark:border-gray-700">
              <p className="text-sm text-gray-500">NPS Score</p>
              <p className="text-2xl font-bold">{analytics.nps ?? "N/A"}</p>
            </div>
            <div className="rounded-lg border p-4 dark:border-gray-700">
              <p className="text-sm text-gray-500">Categories</p>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-green-600">Promoters: {analytics.categories.promoters}</span>
                <span className="text-yellow-600">Passives: {analytics.categories.passives}</span>
                <span className="text-red-600">Detractors: {analytics.categories.detractors}</span>
              </div>
            </div>
          </div>

          {analytics.perAgent.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">By Agent</h3>
              <div className="rounded-lg border dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left">Agent</th>
                      <th className="px-4 py-2 text-left">Avg Rating</th>
                      <th className="px-4 py-2 text-left">Responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.perAgent.map((a) => (
                      <tr key={a.agentId} className="border-t dark:border-gray-700">
                        <td className="px-4 py-2">{a.agentName || a.agentId}</td>
                        <td className="px-4 py-2">{a.avgRating?.toFixed(2)}</td>
                        <td className="px-4 py-2">{a.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Form */}
      {view === "create" && (
        <div className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold dark:text-white">{editingId ? "Edit Survey" : "Create Survey"}</h2>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Question</label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Follow-up Question</label>
            <Input value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Rating Scale (1-N)</label>
              <Input type="number" min={3} max={10} value={scale} onChange={(e) => setScale(+e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Cooldown (hours)</label>
              <Input type="number" min={0} value={cooldown} onChange={(e) => setCooldown(+e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Trigger</label>
            <select
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
            >
              <option value="conversation_close">Conversation Close</option>
              <option value="manual">Manual</option>
              <option value="after_resolution">After Resolution</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Thank You Message</label>
            <Input value={thankYou} onChange={(e) => setThankYou(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Survey"}</Button>
            <Button variant="outline" onClick={() => setView("surveys")}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
