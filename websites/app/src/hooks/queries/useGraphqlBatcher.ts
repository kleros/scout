import { request, RequestDocument } from 'graphql-request';

interface BatchedRequest {
  id: string;
  document: RequestDocument;
  variables?: any;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

class GraphQLBatcher {
  private queue: BatchedRequest[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly batchDelay = 10; // milliseconds

  async request(id: string, document: RequestDocument, variables?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        document,
        variables,
        resolve,
        reject,
      });

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        this.processBatch();
      }, this.batchDelay);
    });
  }

  private async processBatch() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];
    this.timeoutId = null;

    // Group requests by document and variables to avoid duplicates
    const uniqueRequests = new Map<string, BatchedRequest>();
    const requestGroups = new Map<string, BatchedRequest[]>();

    for (const request of batch) {
      const key = JSON.stringify({ document: request.document, variables: request.variables });
      if (!uniqueRequests.has(key)) {
        uniqueRequests.set(key, request);
        requestGroups.set(key, []);
      }
      requestGroups.get(key)?.push(request);
    }

    // Execute unique requests
    for (const [key, requestGroup] of requestGroups) {
      const firstRequest = requestGroup[0];
      try {
        const data = await request({
          url: import.meta.env.REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT,
          document: firstRequest.document,
          variables: firstRequest.variables,
        });

        // Resolve all requests in this group with the same data
        requestGroup.forEach(req => req.resolve(data));
      } catch (error) {
        // Reject all requests in this group with the same error
        requestGroup.forEach(req => req.reject(error));
      }
    }
  }
}

// Global batcher instance
const graphqlBatcher = new GraphQLBatcher();

export const useGraphqlBatcher = () => {
  return graphqlBatcher;
};