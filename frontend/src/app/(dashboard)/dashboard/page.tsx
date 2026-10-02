"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardRoot() {
  const { user, loading, activeOrgId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (activeOrgId) {
        router.replace(`/organizations/${activeOrgId}/dashboard`);
      } else {
        router.replace("/organizations/new");
      }
    }
  }, [user, loading, activeOrgId, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
