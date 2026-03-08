"use client";

import { useState, useEffect } from "react";
import { tenantAPI, authAPI } from "@/lib/api";
import { Tenant } from "@/store";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Search,
  Phone,
  Calendar,
  Users,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomerUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminCustomersPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [teamMembers, setTeamMembers] = useState<CustomerUser[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Add Customer modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", businessName: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const res = await tenantAPI.list();
      setTenants(res.data.data.tenants || []);
    } catch (err) {
      console.error("Failed to load tenants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeam = async (tenantId: string) => {
    try {
      setIsLoadingTeam(true);
      const res = await authAPI.getTeam(tenantId);
      setTeamMembers(res.data.data.members || []);
    } catch (err) {
      console.error("Failed to load team:", err);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    loadTeam(tenant._id);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setIsAdding(true);
    try {
      await authAPI.customerRegister(addForm);
      setShowAddModal(false);
      setAddForm({ name: "", email: "", password: "", businessName: "" });
      await loadTenants();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setAddError(error.response?.data?.message || "Failed to create customer");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedTenant) return;
    setIsDeleting(true);
    try {
      await tenantAPI.delete(selectedTenant._id);
      setSelectedTenant(null);
      setTeamMembers([]);
      setShowDeleteConfirm(false);
      await loadTenants();
    } catch (err) {
      console.error("Failed to delete customer:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.displayPhoneNumber || "").includes(search)
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Customer List */}
      <div className="flex w-full flex-col border-r border-gray-200 dark:border-gray-700 lg:w-1/2">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Customers
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                title="Add Customer"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={loadTenants}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm">No customers found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((tenant) => (
                <button
                  key={tenant._id}
                  onClick={() => handleSelectTenant(tenant)}
                  className={`w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors dark:hover:bg-gray-800 ${
                    selectedTenant?._id === tenant._id ? "bg-emerald-50 dark:bg-emerald-900/20" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 font-medium dark:bg-gray-700 dark:text-gray-300">
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {tenant.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {tenant.displayPhoneNumber || "No phone connected"}
                    </p>
                  </div>
                  {tenant.onboardingStatus === "connected" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Details */}
      <div className="hidden lg:flex flex-1 flex-col overflow-y-auto p-8">
        {selectedTenant ? (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xl font-bold dark:bg-gray-700 dark:text-gray-300">
                    {selectedTenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedTenant.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Plan: {selectedTenant.plan || "Free"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete Customer"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <DetailCard
                icon={<Phone className="h-5 w-5 text-blue-600" />}
                label="Phone Number"
                value={selectedTenant.displayPhoneNumber || "Not connected"}
              />
              <DetailCard
                icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
                label="Status"
                value={selectedTenant.onboardingStatus}
              />
              <DetailCard
                icon={<Calendar className="h-5 w-5 text-purple-600" />}
                label="Quality Rating"
                value={selectedTenant.qualityRating || "N/A"}
              />
              <DetailCard
                icon={<Users className="h-5 w-5 text-amber-600" />}
                label="WABA ID"
                value={selectedTenant.businessAccountId || "N/A"}
              />
            </div>

            {/* Team Members */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Team Members
              </h3>
              {isLoadingTeam ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No team members found</p>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-400">
                        {member.role.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
            <Users className="h-16 w-16 mb-4 text-gray-200" />
            <p className="text-lg font-medium">Select a customer</p>
            <p className="text-sm">Click on a customer to view details</p>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Add New Customer
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setAddError(""); }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <Input
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name
                </label>
                <Input
                  required
                  value={addForm.businessName}
                  onChange={(e) => setAddForm({ ...addForm, businessName: e.target.value })}
                  placeholder="Company Inc."
                />
              </div>

              {addError && (
                <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                  {addError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowAddModal(false); setAddError(""); }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isAdding}>
                  {isAdding ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Add Customer"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Delete Customer
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete <strong>{selectedTenant.name}</strong>?
                This will deactivate their account and disconnect their WhatsApp.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-600">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
        {value}
      </p>
    </div>
  );
}
