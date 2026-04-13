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
        "Flagged Risk": z.string(),
        "Input Risk Level": z.string(),
        "Response Risk Level": z.string(),
        "Consistency Check": z.string(),
        "pattern_flag": z.string(),
        "sub_type": z.string(),
        "Notes/Remediation Needed": z.string(),
      },
    },
    async (input) => {
      console.log("📥 MCP TOOL CALL RECEIVED: append_audit_log");
      console.log("Arguments:", input);

      const flaggedRisk = (input["Flagged Risk"] || "").trim();
      const passFail = (input["Pass/Fail"] || "").trim();
      const responseRiskLevel = (input["Response Risk Level"] || "").trim();

      const shouldLog =
        flaggedRisk === "Yes" ||
        passFail === "Fail" ||
        responseRiskLevel === "Medium" ||
        responseRiskLevel === "High";

      console.log("📊 Logging decision:", {
        flaggedRisk,
        passFail,
        responseRiskLevel,
        shouldLog,
      });

      if (shouldLog) {
        await appendAuditLogRow(input);
        console.log("✅ Row appended to Google Sheets");
      } else {
        console.log("⏭️ Skipped Google Sheets logging");
      }

      return {
        content: [],
        structuredContent: {
          functionCallResponse: {
            status: "success",
            message: "Audit log processed",
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

  server.registerTool(
    "process_risk_result",
    {
      description:
        "Evaluate logging eligibility for a completed risk result and log to Google Sheets only if the case meets the threshold",
      inputSchema: {
        "Test ID": z.string(),
        "Cluster #": z.string(),
        "Cluster Name": z.string(),
        "Tags": z.string().optional(),
        "Category": z.string(),
        "Prompt Used": z.string(),
        "Expected Behavior": z.string(),
        "Assistant Response": z.string(),
        "Evaluator Output": z.string().optional(),
        "Suggested Rewrite": z.string(),
        "Refused": z.string(),
        "Offered Live Agent": z.string(),
        "Pass/Fail": z.string(),
        "Flagged Risk": z.string(),
        "Input Risk Level": z.string(),
        "Response Risk Level": z.string(),
        "Consistency Check": z.string(),
        "pattern_flag": z.string(),
        "sub_type": z.string(),
        "Notes/Remediation Needed": z.string(),
      },
    },
    async (input) => {
      console.log("📥 MCP TOOL CALL RECEIVED: process_risk_result");
      console.log("Arguments:", input);

      const flaggedRisk = (input["Flagged Risk"] || "").trim();
      const passFail = (input["Pass/Fail"] || "").trim();
      const responseRiskLevel = (input["Response Risk Level"] || "").trim();

      const shouldLog =
        flaggedRisk === "Yes" ||
        passFail === "Fail" ||
        responseRiskLevel === "Medium" ||
        responseRiskLevel === "High";

      let reason = "Safe pass case";

      if (flaggedRisk === "Yes") {
        reason = 'Flagged Risk = "Yes"';
      } else if (passFail === "Fail") {
        reason = 'Pass/Fail = "Fail"';
      } else if (responseRiskLevel === "Medium") {
        reason = 'Response Risk Level = "Medium"';
      } else if (responseRiskLevel === "High") {
        reason = 'Response Risk Level = "High"';
      }

      console.log("📊 Orchestration decision:", {
        flaggedRisk,
        passFail,
        responseRiskLevel,
        shouldLog,
        reason,
      });

      let logged = false;

      if (shouldLog) {
        await appendAuditLogRow(input);
        logged = true;
        console.log("✅ Row appended to Google Sheets from process_risk_result");
      } else {
        console.log("⏭️ Skipped Google Sheets logging from process_risk_result");
      }

      return {
        content: [],
        structuredContent: {
          functionCallResponse: {
            status: "success",
            shouldLog,
            logged,
            reason,
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