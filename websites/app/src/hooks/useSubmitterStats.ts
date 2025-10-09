import { useQuery } from "@tanstack/react-query";
import { SUBGRAPH_GNOSIS_ENDPOINT } from "consts";

const SUBMITTER_STATS_QUERY = `
  query SubmitterStats($userAddress: String!) {
    ongoing: LItem(
      where: {
        status: {_in: [RegistrationRequested, ClearingRequested]}
        requests: {requester: {_eq: $userAddress}}
      }
      limit: 10000
    ) {
      id
    }
    past: LItem(
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
      const response = await fetch(SUBGRAPH_GNOSIS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: SUBMITTER_STATS_QUERY,
          variables: { userAddress },
        }),
      });
      const json = await response.json();

      const ongoingCount = json.data?.ongoing?.length || 0;
      const pastCount = json.data?.past?.length || 0;

      return {
        submitter: {
          totalSubmissions: ongoingCount + pastCount,
          ongoingSubmissions: ongoingCount,
          pastSubmissions: pastCount
        }
      };
    },
  });
};
