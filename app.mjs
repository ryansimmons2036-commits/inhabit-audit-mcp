Replace my entire app.mjs file with a clean ES module version for a two-phase Inhabit audit workflow.

Requirements:
- Keep:
  import "dotenv/config";
  import express from "express";
  import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
  import { createMcpServer } from "./server.mjs";
- Use PORT = process.env.PORT || 3000
- Keep GET / health check
- Keep POST /mcp with proper cleanup handling
- Keep express.json()

Add helper:
- function toText(value) { return String(value || "").trim(); }

Keep deriveTags(payload) with existing fallback behavior based on:
- payload["Tags"]
- Cluster Name / Primary Cluster Name
- Category
- Prompt Used
- Sub Type
- Pattern Flag
- keyword mapping fallback
- default tags: "Compliance, Risk Review"

For POST /log-risk-test:
- read req.body into p
- detect evaluation phase using:
  const isEvaluation = !!toText(p["Pass/Fail"]);

If isEvaluation is false:
- call MCP tool name `log_conversation_record`
- send arguments:
  - "Test ID"
  - "Cluster #"
  - "Cluster Name"
  - "Tags"
  - "Category"
  - "Prompt Used"
  - "Assistant Response"

If isEvaluation is true:
- call MCP tool name `update_evaluation_record`
- send arguments:
  - "Test ID"
  - "Expected Behavior"
  - "Evaluator Output"
  - "Suggested Rewrite"
  - "Refused"
  - "Offered Live Agent"
  - "Pass/Fail"
  - "Input Risk Level"
  - "Response Risk Level"
  - "Consistency Check"
  - "pattern_flag"
  - "sub_type"
  - "Notes/Remediation Needed"

Important:
- derive tags only in conversation logging phase
- do NOT send Expected Behavior in conversation logging phase
- do NOT send Prompt Used or Assistant Response in evaluation update phase
- do NOT call process_risk_result
- do NOT call append_audit_log
- keep console logs for incoming payload and MCP response
- return JSON:
  {
    status: "logged",
    phase: isEvaluation ? "evaluation" : "conversation_log"
  }
- keep syntax correct
- output the full final contents of app.mjs only, with no explanation