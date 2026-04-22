import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  appendConversationLogRow,
  getConversationRecordByTestId,
  updateEvaluationFieldsByTestId,
} from "./googleSheets.mjs";

export function createMcpServer() {
  const server = new McpServer({
    name: "inhabit-audit-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "log_conversation_record",
    {
      description:
        "Append a new raw conversation row to Google Sheets for the conversation logging phase",
      inputSchema: {
        "Test ID": z.string(),
        "Cluster #": z.string(),
        "Cluster Name": z.string(),
        "Tags": z.string().optional(),
        "Category": z.string(),
        "Prompt Used": z.string(),
        "Assistant Response": z.string(),
      },
    },
    async (input) => {
      console.log("📥 MCP TOOL CALL RECEIVED: log_conversation_record");
      console.log("Arguments:", input);

      const result = await appendConversationLogRow(input);
      console.log("✅ Conversation row appended to Google Sheets");

      return {
        content: [],
        structuredContent: {
          functionCallResponse: {
            status: "success",
            phase: "conversation_log",
            logged: true,
            result,
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
    "get_conversation_record",
    {
      description:
        "Retrieve a logged conversation record from Google Sheets by Test ID so the evaluator can read Prompt Used and Assistant Response",
      inputSchema: {
        "Test ID": z.string(),
      },
    },
    async (input) => {
      console.log("📥 MCP TOOL CALL RECEIVED: get_conversation_record");
      console.log("Arguments:", input);

      const record = await getConversationRecordByTestId(input["Test ID"]);
      console.log("✅ Conversation record retrieved from Google Sheets");

      return {
        content: [],
        structuredContent: {
          functionCallResponse: {
            status: "success",
            phase: "conversation_retrieval",
            found: true,
            record,
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
    "update_evaluation_record",
    {
      description:
        "Update the existing Google Sheets row for a given Test ID with evaluation fields",
      inputSchema: {
        "Test ID": z.string(),
        "Expected Behavior": z.string(),
        "Evaluator Output": z.string().optional(),
        "Suggested Rewrite": z.string(),
        "Refused": z.string(),
        "Offered Live Agent": z.string(),
        "Pass/Fail": z.string(),
        "Input Risk Level": z.string(),
        "Response Risk Level": z.string(),
        "Consistency Check": z.string(),
        "pattern_flag": z.string(),
        "sub_type": z.string(),
        "Notes/Remediation Needed": z.string(),
      },
    },
    async (input) => {
      console.log("📥 MCP TOOL CALL RECEIVED: update_evaluation_record");
      console.log("Arguments:", input);

      const result = await updateEvaluationFieldsByTestId(
        input["Test ID"],
        input
      );
      console.log("✅ Evaluation fields updated in Google Sheets");

      return {
        content: [],
        structuredContent: {
          functionCallResponse: {
            status: "success",
            phase: "evaluation_update",
            updated: true,
            result,
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