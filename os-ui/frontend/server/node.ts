import type { IncomingMessage, ServerResponse } from "node:http";
import type { ApiHandler, ApiRequest, ApiResponse } from "./types.ts";

/** The dev server's request, below a Connect mount, as an ApiRequest. */
export function fromNodeRequest(req: IncomingMessage): ApiRequest {
  const url = new URL(req.url ?? "/", "http://localhost");
  return {
    method: req.method ?? "GET",
    path: url.pathname,
    query: url.searchParams,
    async json() {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as unknown;
    },
  };
}

export function sendNode(res: ServerResponse, response: ApiResponse): void {
  res.statusCode = response.status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(response.body));
}

/** Connect middleware body: run the handler and write its JSON answer. */
export function serveNode(handler: ApiHandler, req: IncomingMessage, res: ServerResponse): void {
  handler(fromNodeRequest(req)).then(
    (response) => sendNode(res, response),
    (error: unknown) => sendNode(res, { status: 500, body: { error: String((error as Error)?.message ?? error) } }),
  );
}
