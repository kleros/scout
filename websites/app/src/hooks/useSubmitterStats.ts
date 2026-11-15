import { useQuery } from "@tanstack/react-query";
import { fetchAllRows } from "utils/profileFilters";

// The indexer has no count: an address's items are read 1,000 at a time and counted. Each row
// asks for one boolean only (2,122 rows weigh about 40 KB), ordered by id so pages do not overlap.
const COUNT_QUERY = `
  query SubmitterItemCount($userAddress: String!, $status: [status!]!, $first: Int!, $skip: Int!) {
    litems: LItem(
      where: {
        status: {_in: $status}
        requests: {requester: {_eq: $userAddress}}
      }
      limit: $first
      offset: $skip
      order_by: {id: asc}
    ) {
      disputed
    }
  }
`;

export interface SubmitterCount {
  count: number;
  /** The count stopped at the read limit: there are at least `count`. */
  capped: boolean;
}

export const useSubmitterStats = (address?: string) => {
  const userAddress = address?.toLowerCase();
  return useQuery({
    queryKey: ["refetchOnBlock", "useSubmitterStats", userAddress],
    enabled: !!userAddress,
    queryFn: async () => {
      // Both first pages leave in one request (the reads are batched).
      const [pending, resolved] = await Promise.all([
        fetchAllRows(COUNT_QUERY, { userAddress, status: ["RegistrationRequested", "ClearingRequested"] }),
        fetchAllRows(COUNT_QUERY, { userAddress, status: ["Registered", "Absent"] }),
      ]);

      const pendingSubmissions: SubmitterCount = { count: pending.rows.length, capped: pending.capped };
      const resolvedSubmissions: SubmitterCount = { count: resolved.rows.length, capped: resolved.capped };

      return {
        submitter: {
          totalSubmissions: {
            count: pendingSubmissions.count + resolvedSubmissions.count,
            capped: pendingSubmissions.capped || resolvedSubmissions.capped,
          },
          pendingSubmissions,
          resolvedSubmissions,
        },
      };
    },
  });
};
