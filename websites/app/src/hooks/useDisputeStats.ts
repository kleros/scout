import { useQuery } from "@tanstack/react-query";
import { registryMap } from "utils/items";
import { fetchSubgraph } from "utils/fetchSubgraph";

// Only query disputes from our 4 registries
const REGISTRY_ADDRESSES = Object.values(registryMap);

// Query to fetch disputes where user is involved (as requester or challenger)
const DISPUTE_STATS_QUERY = `
  query DisputeStats($userAddress: String!, $registryAddresses: [String!]!) {
    # Active disputes where user is the requester
    activeAsRequester: LItem(
      where: {
        registryAddress: {_in: $registryAddresses}
        disputed: {_eq: true}
        status: {_in: [RegistrationRequested, ClearingRequested]}
        requests: {
          disputed: {_eq: true}
          requester: {_eq: $userAddress}
        }
      }
      limit: 1000
    ) {
      id
      status
      requests(where: {disputed: {_eq: true}}, order_by: {submissionTime: desc}, limit: 1) {
        disputeOutcome
        resolved
      }
    }
    # Active disputes where user is the challenger
    activeAsChallenger: LItem(
      where: {
        registryAddress: {_in: $registryAddresses}
        disputed: {_eq: true}
        status: {_in: [RegistrationRequested, ClearingRequested]}
        requests: {
          disputed: {_eq: true}
          challenger: {_eq: $userAddress}
        }
      }
      limit: 1000
    ) {
      id
      status
      requests(where: {disputed: {_eq: true}}, order_by: {submissionTime: desc}, limit: 1) {
        disputeOutcome
        resolved
      }
    }
    # Resolved disputes where user was the requester
    resolvedAsRequester: LItem(
      where: {
        registryAddress: {_in: $registryAddresses}
        requests: {
          disputed: {_eq: true}
          resolved: {_eq: true}
          requester: {_eq: $userAddress}
        }
      }
      limit: 1000
    ) {
      id
      status
      requests(where: {disputed: {_eq: true}, resolved: {_eq: true}, requester: {_eq: $userAddress}}, order_by: {submissionTime: desc}, limit: 100) {
        disputeOutcome
      }
    }
    # Resolved disputes where user was the challenger
    resolvedAsChallenger: LItem(
      where: {
        registryAddress: {_in: $registryAddresses}
        requests: {
          disputed: {_eq: true}
          resolved: {_eq: true}
          challenger: {_eq: $userAddress}
        }
      }
      limit: 1000
    ) {
      id
      status
      requests(where: {disputed: {_eq: true}, resolved: {_eq: true}, challenger: {_eq: $userAddress}}, order_by: {submissionTime: desc}, limit: 100) {
        disputeOutcome
        deposit
      }
    }
  }
`;

export interface DisputeStats {
  activeDisputes: number;
  activeAsRequester: number;
  activeAsChallenger: number;
  resolvedDisputes: number;
  // Win/loss as requester (defending submissions)
  winsAsRequester: number;
  lossesAsRequester: number;
  // Win/loss as challenger
  winsAsChallenger: number;
  lossesAsChallenger: number;
  // Sum of the requesters' base deposits collected by winning challenges (xDAI wei).
  // The winning challenger pockets the pot minus their own stake, which nets out
  // to the requester's base deposit; appeal-round fee rewards are not included.
  bountiesWonWei: bigint;
  // Totals
  totalWins: number;
  totalLosses: number;
}

/**
 * Determines if the requester won based on:
 * - For RegistrationRequested: "Accept" = requester wins (item gets registered)
 * - For ClearingRequested: "Accept" = requester wins (item gets removed)
 * - "Reject" = challenger wins
 */
function didRequesterWin(disputeOutcome: string): boolean | null {
  if (disputeOutcome === 'Accept') return true;
  if (disputeOutcome === 'Reject') return false;
  return null; // None/Refuse - no clear winner
}

export const useDisputeStats = (address?: string) => {
  const userAddress = address?.toLowerCase();

  return useQuery({
    queryKey: ["refetchOnBlock", "useDisputeStats", userAddress],
    enabled: !!userAddress,
    queryFn: async (): Promise<{ disputeStats: DisputeStats }> => {
      const json = await fetchSubgraph(DISPUTE_STATS_QUERY, { userAddress, registryAddresses: REGISTRY_ADDRESSES });

      const activeAsRequester = json.data?.activeAsRequester || [];
      const activeAsChallenger = json.data?.activeAsChallenger || [];
      const resolvedAsRequester = json.data?.resolvedAsRequester || [];
      const resolvedAsChallenger = json.data?.resolvedAsChallenger || [];

      // Dedupe active disputes (user could theoretically be both, though rare)
      const activeRequesterIds = new Set(activeAsRequester.map((i: any) => i.id));
      const activeChallengerIds = new Set(activeAsChallenger.map((i: any) => i.id));
      const allActiveIds = new Set([...activeRequesterIds, ...activeChallengerIds]);

      // Calculate wins/losses for requester role, counting every disputed
      // request the user was a party to (an item can have several)
      let winsAsRequester = 0;
      let lossesAsRequester = 0;
      for (const item of resolvedAsRequester) {
        for (const request of item.requests ?? []) {
          const won = didRequesterWin(request.disputeOutcome);
          if (won === true) winsAsRequester++;
          else if (won === false) lossesAsRequester++;
        }
      }

      // Calculate wins/losses for challenger role
      let winsAsChallenger = 0;
      let lossesAsChallenger = 0;
      let bountiesWonWei = 0n;
      for (const item of resolvedAsChallenger) {
        for (const request of item.requests ?? []) {
          const won = didRequesterWin(request.disputeOutcome);
          // Challenger wins when requester loses
          if (won === false) {
            winsAsChallenger++;
            try {
              bountiesWonWei += BigInt(request.deposit ?? 0);
            } catch {
              // skip malformed deposits
            }
          } else if (won === true) lossesAsChallenger++;
        }
      }

      // Dedupe resolved disputes
      const resolvedRequesterIds = new Set(resolvedAsRequester.map((i: any) => i.id));
      const resolvedChallengerIds = new Set(resolvedAsChallenger.map((i: any) => i.id));
      const allResolvedIds = new Set([...resolvedRequesterIds, ...resolvedChallengerIds]);

      return {
        disputeStats: {
          activeDisputes: allActiveIds.size,
          activeAsRequester: activeRequesterIds.size,
          activeAsChallenger: activeChallengerIds.size,
          resolvedDisputes: allResolvedIds.size,
          winsAsRequester,
          lossesAsRequester,
          winsAsChallenger,
          lossesAsChallenger,
          bountiesWonWei,
          totalWins: winsAsRequester + winsAsChallenger,
          totalLosses: lossesAsRequester + lossesAsChallenger,
        },
      };
    },
  });
};
