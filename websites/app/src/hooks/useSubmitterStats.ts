import { useQuery } from "@tanstack/react-query";
import { SUBGRAPH_GNOSIS_ENDPOINT } from "consts/index";

const SUBMITTER_STATS_QUERY = `
  query SubmitterStats($id: ID!) {
    submitter(id: $id) {
      totalSubmissions
      ongoingSubmissions
      pastSubmissions
    }
  }
`;

export const useSubmitterStats = (address?: string) => {
  const id = address?.toLowerCase();
  return useQuery({
    queryKey: ["refetchOnBlock", "useSubmitterStats", id],
    enabled: !!id,
    queryFn: async () => {
      const response = await fetch(SUBGRAPH_GNOSIS_ENDPOINT as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: SUBMITTER_STATS_QUERY,
          variables: { id },
        }),
      });
      const json = await response.json();
      return json.data;
    },
  });
};
