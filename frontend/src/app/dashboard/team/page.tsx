"use client";

import { useState, useEffect } from "react";
import { authAPI } from "@/lib/api";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Trash2, RefreshCw, Shield, User } from "lucide-react";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt?: string;
  createdAt: string;
}

export default function TeamPage() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setIsLoading(true);
      const res = await authAPI.getTeam();
      setMembers(res.data.data.members || []);
    } catch (err) {
      console.error("Failed to load team:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsInviting(true);

    try {
      await authAPI.register({
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: "customer_agent",
      });
      setSuccess(`${inviteName} has been added to your team!`);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setShowInvite(false);
      await loadTeam();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to invite team member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      await authAPI.removeTeamMember(id);
      await loadTeam();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const isOwner = user?.role === "customer";

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your team members and their access
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTeam}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          {isOwner && (
            <Button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      {success && (
        <div className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-600 border border-emerald-200">
          {success}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add Team Member
          </h2>
          <form onSubmit={handleInvite} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <Input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="john@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Temporary Password
                </label>
                <Input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isInviting}>
                {isInviting ? "Adding..." : "Add Member"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Team Members List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="h-12 w-12 mb-3 text-gray-200" />
          <p className="text-lg font-medium">No team members yet</p>
          <p className="text-sm mt-1">Add team members to help manage conversations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </p>
                    {member.role === "customer" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Shield className="h-3 w-3" />
                        Owner
                      </span>
                    )}
                    {member.role === "customer_agent" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium dark:bg-blue-900/30 dark:text-blue-400">
                        <User className="h-3 w-3" />
                        Team Member
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {member.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  Joined {new Date(member.createdAt).toLocaleDateString()}
                </span>
                {isOwner && member._id !== user?.id && member.role !== "customer" && (
                  <button
                    onClick={() => handleRemove(member._id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
