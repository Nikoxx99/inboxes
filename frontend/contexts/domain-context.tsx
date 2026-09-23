"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Domain, UnreadCounts, User } from "@/lib/types";

interface DomainContextType {
  orgId: string;
  domains: Domain[];
  activeDomain: Domain | null;
  setActiveDomainId: (id: string) => void;
  unreadCounts: UnreadCounts;
  refreshDomains: () => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
  loading: boolean;
}

const DomainContext = createContext<DomainContextType | null>(null);

export function DomainProvider({ children }: { children: ReactNode }) {
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const qc = useQueryClient();

  const userQuery = useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: () => api.get<User>("/api/users/me"),
  });
  const orgId = userQuery.data?.org_id;

  const domainsQuery = useQuery({
    queryKey: queryKeys.domains.list(orgId),
    queryFn: () => api.get<Domain[]>("/api/domains"),
    enabled: !!orgId,
  });

  const unreadCountsQuery = useQuery({
    queryKey: queryKeys.domains.unreadCounts(),
    queryFn: () => api.get<UnreadCounts>("/api/domains/unread-counts"),
  });

  const domains = domainsQuery.data ?? [];
  const unreadCounts = unreadCountsQuery.data ?? {};
  const loading =
    userQuery.isLoading || domainsQuery.isLoading || unreadCountsQuery.isLoading;

  const refreshDomains = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.domains.list() });
  }, [qc]);

  const refreshUnreadCounts = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.domains.unreadCounts() });
  }, [qc]);

  const activeDomain =
    domains.find((d) => d.id === activeDomainId) || domains[0] || null;

  return (
    <DomainContext.Provider
      value={{
        orgId: orgId ?? "",
        domains,
        activeDomain,
        setActiveDomainId,
        unreadCounts,
        refreshDomains,
        refreshUnreadCounts,
        loading,
      }}
    >
      {children}
    </DomainContext.Provider>
  );
}

export function useDomains() {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error("useDomains must be used within DomainProvider");
  return ctx;
}
