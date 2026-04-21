import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.mjs";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Inhabit audit MCP server is running",
  });
});

// MCP route
app.post("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  let cleaned = false;

  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;

    try {
      await transport.close();
    } catch {}

    try {
      await server.close();
    } catch {}
  };

  res.on("finish", cleanup);
  res.on("error", cleanup);
  res.on("close", cleanup);

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("❌ MCP server error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "MCP server failure",
        details: error.message,
      });
    }

    await cleanup();
  }
});

function toText(value) {
  return String(value || "").trim();
}

function deriveTags(payload) {
  const existing = Array.isArray(payload["Tags"])
    ? payload["Tags"].join(", ").trim()
    : toText(payload["Tags"]);

  if (existing) return existing;

  const clusterName = toText(
    payload["Cluster Name"] || payload["Primary Cluster Name"]
  );
  const category = toText(payload["Category"]);
  const prompt = toText(payload["Prompt Used"]).toLowerCase();
  const subType = toText(payload["Sub Type"]);
  const patternFlag = toText(payload["Pattern Flag"]);

  const tags = new Set();

  if (clusterName) tags.add(clusterName);
  if (category) tags.add(category);
  if (subType) tags.add(subType);
  if (patternFlag) tags.add(patternFlag);

  const keywordMap = [
    ["fair housing", "Fair Housing"],
    ["discrimination", "Discrimination"],
    ["familial", "Familial Status"],
    ["disability", "Disability"],
    ["reasonable accommodation", "Reasonable Accommodation"],
    ["screening", "Screening"],
    ["credit", "Credit"],
    ["fcra", "FCRA"],
    ["ecoa", "ECOA"],
    ["privacy", "Privacy"],
    ["pii", "PII"],
    ["data leakage", "Data Leakage"],
    ["legal advice", "Legal Advice"],
    ["liability", "Liability"],
    ["maintenance", "Maintenance"],
    ["safety", "Safety"],
    ["fraud", "Fraud"],
    ["financial", "Financial Manipulation"],
    ["prompt injection", "Prompt Injection"],
    ["system override", "System Override"],
    ["social engineering", "Social Engineering"],
    ["governance", "Governance"],
    ["escalation", "Escalation"],
  ];

  for (const [needle, label] of keywordMap) {
    if (prompt.includes(needle)) tags.add(label);
  }

  if (tags.size === 0) {
    tags.add("Compliance");
    tags.add("Risk Review");
  }

  return Array.from(tags).join(", ");
}

// Main logging/evaluation route
app.post("/log-risk-test", async (req, res) => {
  try {
    console.log("📝 Incoming /log-risk-test payload:");
    console.log(JSON.stringify(req.body, null, 2));

    const p = req.body || {};
    const isEvaluation = !!toText(p["Pass/Fail"]);

    let toolName;
    let args;

    if (isEvaluation) {
      toolName = "update_evaluation_record";
      args = {
        "Test ID": toText(p["Test ID"]),
        "Expected Behavior": toText(p["Expected Behavior"]),
        "Evaluator Output": toText(p["Evaluator Output"]),
        "Suggested Rewrite": toText(p["Suggested Rewrite"]),
        "Refused": toText(p["Refused"]),
        "Offered Live Agent": toText(p["Offered Live Agent"]),
        "Pass/Fail": toText(p["Pass/Fail"]),
        "Input Risk Level": toText(p["Input Risk Level"]),
        "Response Risk Level": toText(p["Response Risk Level"]),
        "Consistency Check": toText(p["Consistency Check"]),
        "pattern_flag": toText(p["Pattern Flag"] || p["pattern_flag"]),
        "sub_type": toText(p["Sub Type"] || p["sub_type"]),
        "Notes/Remediation Needed": toText(p["Notes/Remediation Needed"]),
      };
    } else {
      toolName = "log_conversation_record";
      args = {
        "Test ID": toText(p["Test ID"]),
        "Cluster #": toText(p["Cluster #"] || p["Primary Cluster #"]),
        "Cluster Name": toText(p["Cluster Name"] || p["Primary Cluster Name"]),
        "Tags": deriveTags(p),
        "Category": toText(p["Category"]),
        "Prompt Used": toText(p["Prompt Used"]),
        "Assistant Response": toText(p["Assistant Response"]),
      };
    }

    const mcpPayload = {
      jsonrpc: "2.0",
      id: "log-risk-1",
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const mcpResponse = await fetch(`http://localhost:${PORT}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(mcpPayload),
    });

    const mcpText = await mcpResponse.text();
    console.log("🧰 MCP response:", mcpText);

    return res.status(200).json({
      status: "logged",
      phase: isEvaluation ? "evaluation" : "conversation_log",
    });
  } catch (error) {
    console.error("❌ /log-risk-test error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 REAL MCP server running on port ${PORT}`);
});