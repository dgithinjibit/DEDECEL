import { useState, useCallback } from 'react';
import { OrgNode, OrgRoleId } from './types';
import { DEMO_ORG_NODES, DEMO_HOSPITAL } from './demoOrg';

/*
  useOrgTree — an in-session org-tree store.

  Holds the seeded Demo Hospital tree and lets the wizard ADD nodes during a session (the
  "type a senior's name -> Add ‘Dr Samuel’ to the list" interaction). This is intentionally
  in-memory only for the DEMO: nothing here is persisted or trust-checked yet.

  In the SECURE build this store is swapped for backend/DB-backed queries where adding a node
  requires a ZK-verified invite (see memory: dedecel-org-tree-onboarding). The component API
  (nodes, childrenOf, addNode, seniorsForRole) is designed to stay the same so the wizard UI does
  not change when we wire the real gate.
*/

let sessionCounter = 0;
function nextNodeId(): string {
  // No Date.now()/Math.random() needed — a monotonic session counter is enough and deterministic.
  sessionCounter += 1;
  return `node-session-${sessionCounter}`;
}

export interface OrgTree {
  nodes: OrgNode[];
  /** Direct reports of a node. */
  childrenOf: (nodeId: string | null) => OrgNode[];
  /** Candidate seniors a person of `roleId` could report to (anyone not themselves, same hospital). */
  seniorsForRole: (roleId: OrgRoleId) => OrgNode[];
  /** Add a new person to the tree under a senior. Returns the created node. */
  addNode: (name: string, roleId: OrgRoleId, seniorId: string, walletId?: string | null) => OrgNode;
  /** Look a node up by id. */
  byId: (nodeId: string) => OrgNode | undefined;
}

export function useOrgTree(): OrgTree {
  const [nodes, setNodes] = useState<OrgNode[]>(() => [...DEMO_ORG_NODES]);

  const byId = useCallback(
    (nodeId: string) => nodes.find((n) => n.id === nodeId),
    [nodes]
  );

  const childrenOf = useCallback(
    (nodeId: string | null) => nodes.filter((n) => n.seniorId === nodeId),
    [nodes]
  );

  const seniorsForRole = useCallback(
    (_roleId: OrgRoleId) =>
      // Any existing node at the hospital can be picked as a senior (demo). We exclude nothing by
      // role here so the "choose your senior" list is populated; cycle-prevention lands in secure mode.
      nodes.filter((n) => n.hospitalId === DEMO_HOSPITAL.id),
    [nodes]
  );

  const addNode = useCallback(
    (name: string, roleId: OrgRoleId, seniorId: string, walletId: string | null = null): OrgNode => {
      const node: OrgNode = {
        id: nextNodeId(),
        name: name.trim(),
        roleId,
        hospitalId: DEMO_HOSPITAL.id,
        seniorId,
        walletId,
        source: 'SESSION',
      };
      setNodes((prev) => [...prev, node]);
      return node;
    },
    []
  );

  return { nodes, childrenOf, seniorsForRole, addNode, byId };
}
