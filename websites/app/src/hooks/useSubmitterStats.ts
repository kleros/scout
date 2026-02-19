import { useQuery } from "@tanstack/react-query";
import { fetchSubgraph } from "utils/fetchSubgraph";

const SUBMITTER_STATS_QUERY = `
  query SubmitterStats($userAddress: String!) {
    pending: LItem(
      where: {
        status: {_in: [RegistrationRequested, ClearingRequested]}
        requests: {requester: {_eq: $userAddress}}
      }
      limit: 10000
    ) {
      id
    }
    resolved: LItem(
      where: {
        status: {_in: [Registered, Absent]}
        requests: {requester: {_eq: $userAddress}}
      }
      limit: 10000
    ) {
      id
    }
  }
`;

export const useSubmitterStats = (address?: string) => {
  const userAddress = address?.toLowerCase();
  return useQuery({
    queryKey: ["refetchOnBlock", "useSubmitterStats", userAddress],
    enabled: !!userAddress,
    queryFn: async () => {
      const json = await fetchSubgraph(SUBMITTER_STATS_QUERY, { userAddress });

      const pendingCount = json.data?.pending?.length || 0;
      const resolvedCount = json.data?.resolved?.length || 0;

      return {
        submitter: {
          totalSubmissions: pendingCount + resolvedCount,
          pendingSubmissions: pendingCount,
          resolvedSubmissions: resolvedCount
        }
      };
    },
  });
};
