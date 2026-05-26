// Delivery API tool — deliveries, orders, and drivers (default http://localhost:5000).
// Set DELIVERY_API_URL if the server runs elsewhere.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_BASE_URL = "http://localhost:5000";

function baseUrl(): string {
  const url = process.env.DELIVERY_API_URL?.trim() || DEFAULT_BASE_URL;
  return url.replace(/\/$/, "");
}

type JsonRecord = Record<string, unknown>;

function formatRecord(record: JsonRecord): string {
  return Object.entries(record)
    .map(([k, v]) => `  ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("\n");
}

function formatList(records: JsonRecord[], entityLabel: string, contextLabel: string): string {
  if (records.length === 0) return `No ${entityLabel} found${contextLabel}.`;
  const header = `${records.length} ${entityLabel}${contextLabel}:\n`;
  const body = records.map((r, i) => `--- ${i + 1} ---\n${formatRecord(r)}`).join("\n\n");
  return header + body;
}

async function fetchJson(path: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${baseUrl()}${path}`);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

function apiError(httpStatus: number): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: `Could not reach the delivery API (HTTP ${httpStatus}). Is it running at ${baseUrl()}?`,
      },
    ],
  };
}

function isMissingRecord(data: unknown): boolean {
  return data == null || (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0);
}

const server = new McpServer({ name: "delivery", version: "1.0.0" });

server.registerTool(
  "lookup_delivery",
  {
    title: "Look up deliveries and orders",
    description:
      "Look up delivery records when the user asks about an order, shipment, delays, or delivery problems. " +
      "Use order_id for Wayfair order numbers (e.g. WF-88421). Use id for a delivery record id (e.g. EX001). " +
      "Use status to filter (e.g. DELAYED, MISSED_WINDOW). " +
      "If the user asks about their order or delivery but did not provide an order_id, id, or status, do NOT call this tool — " +
      "reply with a final_answer asking them for their Wayfair order ID (e.g. WF-88421) first.",
    inputSchema: {
      order_id: z
        .string()
        .optional()
        .describe(
          "Customer order id, e.g. 'WF-88421'. Prefer this when the user asks about their order or order status.",
        ),
      id: z
        .string()
        .optional()
        .describe("Delivery record id, e.g. 'EX001'. Use for internal delivery record ids, not order numbers."),
      status: z
        .string()
        .optional()
        .describe(
          "Filter by delivery status, e.g. 'DELAYED', 'MISSED_WINDOW'. Use when the user asks about a category of problems.",
        ),
    },
  },
  async ({ order_id, id, status }) => {
    if (order_id?.trim()) {
      const orderId = order_id.trim();
      const { ok, status: httpStatus, data } = await fetchJson(
        `/delivery/order/${encodeURIComponent(orderId)}`,
      );
      if (!ok) return apiError(httpStatus);
      const list = Array.isArray(data) ? (data as JsonRecord[]) : [];
      return {
        content: [{ type: "text", text: formatList(list, "delivery record(s)", ` for order "${orderId}"`) }],
      };
    }

    if (id?.trim()) {
      const deliveryId = id.trim();
      const { ok, status: httpStatus, data } = await fetchJson(`/delivery/${encodeURIComponent(deliveryId)}`);
      if (!ok) return apiError(httpStatus);
      if (isMissingRecord(data)) {
        return { content: [{ type: "text", text: `No delivery record found for id "${deliveryId}".` }] };
      }
      return {
        content: [{ type: "text", text: `Delivery record "${deliveryId}":\n${formatRecord(data as JsonRecord)}` }],
      };
    }

    if (status?.trim()) {
      const s = status.trim();
      const { ok, status: httpStatus, data } = await fetchJson(
        `/delivery/status/${encodeURIComponent(s)}`,
      );
      if (!ok) return apiError(httpStatus);
      const list = Array.isArray(data) ? (data as JsonRecord[]) : [];
      return { content: [{ type: "text", text: formatList(list, "delivery record(s)", ` with status "${s}"`) }] };
    }

    return {
      content: [
        {
          type: "text",
          text:
            "Cannot look up delivery without an order_id, delivery record id, or status filter. " +
            "If the customer asked about their order but did not provide an order ID, ask them for their Wayfair order number (e.g. WF-88421) before calling this tool again.",
        },
      ],
    };
  },
);

server.registerTool(
  "lookup_driver",
  {
    title: "Look up drivers",
    description:
      "Look up delivery drivers when the user asks about drivers, carriers, availability, or who can cover a route. " +
      "Use driver_id for one driver, available_date (YYYY-MM-DD) for drivers free on that date, or omit both to list all drivers.",
    inputSchema: {
      driver_id: z
        .string()
        .optional()
        .describe("Driver id, e.g. 'DRV-201'. Use when the user names a specific driver."),
      available_date: z
        .string()
        .optional()
        .describe(
          "Date in YYYY-MM-DD format. Returns active drivers available on that date. Use when scheduling or asking who is free.",
        ),
    },
  },
  async ({ driver_id, available_date }) => {
    if (driver_id?.trim()) {
      const id = driver_id.trim();
      const { ok, status: httpStatus, data } = await fetchJson(`/driver/${encodeURIComponent(id)}`);
      if (!ok) return apiError(httpStatus);
      if (isMissingRecord(data)) {
        return { content: [{ type: "text", text: `No driver found for id "${id}".` }] };
      }
      return {
        content: [{ type: "text", text: `Driver "${id}":\n${formatRecord(data as JsonRecord)}` }],
      };
    }

    if (available_date?.trim()) {
      const date = available_date.trim();
      const { ok, status: httpStatus, data } = await fetchJson(
        `/drivers/available/${encodeURIComponent(date)}`,
      );
      if (!ok) return apiError(httpStatus);
      const list = Array.isArray(data) ? (data as JsonRecord[]) : [];
      return {
        content: [{ type: "text", text: formatList(list, "available driver(s)", ` on ${date}`) }],
      };
    }

    const { ok, status: httpStatus, data } = await fetchJson("/drivers");
    if (!ok) return apiError(httpStatus);
    const list = Array.isArray(data) ? (data as JsonRecord[]) : [];
    return { content: [{ type: "text", text: formatList(list, "driver(s)", "") }] };
  },
);

await server.connect(new StdioServerTransport());
