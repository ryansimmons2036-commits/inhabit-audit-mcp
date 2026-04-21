Replace my entire server.mjs file with a clean ES module version for a two-phase Inhabit audit workflow.

Requirements:
- Use:
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { z } from "zod";
- Import these functions from ./googleSheets.mjs:
  - appendConversationLogRow
  - updateEvaluationFieldsByTestId

Create and export:
- `createMcpServer()`

Inside createMcpServer():
- instantiate McpServer with:
  - name: "inhabit-audit-mcp"
  - version: "1.0.0"

Register exactly two MCP tools:

1. `log_conversation_record`
Description:
- Append a new raw conversation row to Google Sheets for the conversation logging phase

Input schema:
- "Test ID": z.string()
- "Cluster #": z.string()
- "Cluster Name": z.string()
- "Tags": z.string().optional()
- "Category": z.string()
- "Prompt Used": z.string()
- "Assistant Response": z.string()

Behavior:
- console log that log_conversation_record was called
- call `appendConversationLogRow(input)`
- return structuredContent showing:
  - status: "success"
  - phase: "conversation_log"
  - logged: true

2. `update_evaluation_record`
Description:
- Update the existing Google Sheets row for a given Test ID with evaluation fields only

Input schema:
- "Test ID": z.string()
- "Expected Behavior": z.string()
- "Evaluator Output": z.string().optional()
- "Suggested Rewrite": z.string()
- "Refused": z.string()
- "Offered Live Agent": z.string()
- "Pass/Fail": z.string()
- "Input Risk Level": z.string()
- "Response Risk Level": z.string()
- "Consistency Check": z.string()
- "pattern_flag": z.string()
- "sub_type": z.string()
- "Notes/Remediation Needed": z.string()

Behavior:
- console log that update_evaluation_record was called
- call `updateEvaluationFieldsByTestId(input["Test ID"], input)`
- return structuredContent showing:
  - status: "success"
  - phase: "evaluation_update"
  - updated: true

Important:
- remove old tools append_audit_log and process_risk_result
- do not call appendAuditLogRow anymore
- conversation logging and evaluation updating must be separate
- code must be syntactically correct and runnable
- output the full final contents of server.mjs only, with no explanation