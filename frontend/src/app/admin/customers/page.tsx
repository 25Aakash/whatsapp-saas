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
} from "lucide-react";
import { Input } from "@/components/ui/input";

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
            <button
              onClick={loadTenants}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
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
              <div className="flex items-center gap-4 mb-4">
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
