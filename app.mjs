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

// MCP route (DO NOT TOUCH)
app.post("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  let cleaned = false;

  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;

    try { await transport.close(); } catch {}
    try { await server.close(); } catch {}
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

// ✅ FIXED logging route
app.post("/log-risk-test", async (req, res) => {
  try {
    console.log("📝 Logging risk test...");
    console.log("📦 Incoming payload:", JSON.stringify(req.body, null, 2));

    const p = req.body || {};

    const mcpPayload = {
      jsonrpc: "2.0",
      id: "log-risk-1",
      method: "tools/call",
      params: {
        name: "process_risk_result",
        arguments: {
          "Test ID": p["Test ID"] || "",
          "Cluster #": p["Cluster #"] || p["Primary Cluster #"] || "",
          "Cluster Name": p["Cluster Name"] || p["Primary Cluster Name"] || "",
          "Tags": Array.isArray(p["Tags"]) ? p["Tags"].join(", ") : (p["Tags"] || ""),
          "Category": p["Category"] || "",
          "Prompt Used": p["Prompt Used"] || "",
          "Expected Behavior": p["Expected Behavior"] || "",
          "Assistant Response": p["Assistant Response"] || "",
          "Evaluator Output": p["Evaluator Output"] || "",
          "Suggested Rewrite": p["Suggested Rewrite"] || "",
          "Refused": p["Refused"] || "",
          "Offered Live Agent": p["Offered Live Agent"] || "",
          "Pass/Fail": p["Pass/Fail"] || "",
          "Flagged Risk": p["Flagged Risk"] || "",
          "Input Risk Level": p["Input Risk Level"] || "",
          "Response Risk Level": p["Response Risk Level"] || "",
          "Consistency Check": p["Consistency Check"] || "",
          "pattern_flag": p["Pattern Flag"] || "",
          "sub_type": p["Sub Type"] || "",
          "Notes/Remediation Needed": p["Notes/Remediation Needed"] || ""
        },
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