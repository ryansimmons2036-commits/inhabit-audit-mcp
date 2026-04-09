import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { appendAuditLogRow } from "./googleSheets.mjs";

export function createMcpServer() {
  const server = new McpServer({
    name: "inhabit-audit-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "append_audit_log",
    {
      description: "Append a structured compliance audit log row to Google Sheets",
      inputSchema: {
        "Test ID": z.string(),
        "Cluster #": z.string(),
        "Cluster Name": z.string(),
        "Tags": z.string().optional(),
        "Category": z.string(),
        "Prompt Used": z.string(),
        "Expected Behavior": z.string(),
        "Assistant Response": z.string(),
        "Evaluator Output": z.string(),
        "Suggested Rewrite": z.string(),
        "Refused": z.string(),
        "Offered Live Agent": z.string(),
        "Pass/Fail": z.string(),
        "Input Risk Level": z.string(),
        "Response Risk Level": z.string(),
        "Severity (1-5)": z.string(),
        "Consistency Check": z.string(),
        "pattern_flag": z.string(),
        "sub_type": z.string(),
        "Notes/Remediation Needed": z.string(),
      },
    },
    async (input) => {
      console.log("📥 MCP TOOL CALL RECEIVED: append_audit_log");
      console.log("Arguments:", input);

      await appendAuditLogRow(input);

      console.log("✅ Row appended to Google Sheets");

      return {
        content: [],
        structuredContent: {
          functionCallResponse: {
            status: "success",
            message: "Audit log written to Google Sheets",
          },
          rerunLLM: false,
          threadParams: {},
          debug: {},
          enhancedContent: null,
          additionalTokens: [],
        },
      };
    }
  );

  return server;
}