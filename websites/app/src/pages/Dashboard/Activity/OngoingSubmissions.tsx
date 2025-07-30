import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import { SUBGRAPH_GNOSIS_ENDPOINT } from "consts/index";
import ItemCard from "./ItemCard";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useScrollTop } from "hooks/useScrollTop";
import { StyledPagination } from "components/StyledPagination";

const QUERY = `
  query OngoingItems($userAddress: Bytes!, $first: Int!, $skip: Int!) {
    litems(
      where: {
        status_not_in: [Registered, Absent]
        requests_: { requester: $userAddress }
      }
      first: $first
      skip: $skip
      orderBy: latestRequestSubmissionTime
      orderDirection: desc
    ) {
      id
      itemID
      registryAddress
      latestRequestSubmissionTime
      status
      disputed
      data
      metadata {
        props {
          value
          label
        }
      }
      requests(first: 1, orderBy: submissionTime, orderDirection: desc) {
        requester
        deposit
        submissionTime
        disputed
      }
    }
  }
`;

interface Props {
  totalItems: number;
  address?: string;
}

const OngoingSubmissions: React.FC<Props> = ({ totalItems, address }) => {
  const [searchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const itemsPerPage = 10;
  const skip = itemsPerPage * (currentPage - 1);
  const navigate = useNavigate();
  const location = useLocation();
  const scrollTop = useScrollTop();
  const queryAddress = address?.toLowerCase();
  const { data, isLoading } = useQuery({
    queryKey: ["ongoingItems", queryAddress, skip],
    enabled: !!queryAddress,
    queryFn: async () => {
      const res = await fetch(SUBGRAPH_GNOSIS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: QUERY,
          variables: { userAddress: queryAddress, first: itemsPerPage, skip },
        }),
      });
      const json = await res.json();
      if (json.errors) return [];
      return json.data.litems as any[];
    },
  });
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / itemsPerPage)), [totalItems, itemsPerPage]);
  const handlePageChange = (newPage: number) => {
    scrollTop(true);
    const params = new URLSearchParams(location.search);
    params.set("page", String(newPage));
    navigate(`${location.pathname}?${params.toString()}`);
  };
  if (isLoading)
    return (
      <>
        <Skeleton height={100} style={{ marginBottom: 16 }} count={3} />
      </>
    );
  if (!data || data.length === 0) return <>No ongoing submissions.</>;
  return (
    <>
      {data.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
      {totalPages > 1 && (
        <StyledPagination currentPage={currentPage} numPages={totalPages} callback={handlePageChange} />
      )}
    </>
  );
};

export default OngoingSubmissions;
