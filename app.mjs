import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.mjs";

const app = express();
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Inhabit audit MCP server is running",
  });
});

// Existing MCP route - KEEP THIS
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
    } catch (error) {
      console.error("⚠️ transport.close error:", error);
    }

    try {
      await server.close();
    } catch (error) {
      console.error("⚠️ server.close error:", error);
    }
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

// Simple test route
app.post("/run-full-scenario-test", async (_req, res) => {
  try {
    console.log("🧪 Test route hit: /run-full-scenario-test");

    return res.status(200).json({
      status: "ok",
      message: "Function reached Render successfully",
    });
  } catch (error) {
    console.error("❌ /run-full-scenario-test error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

// Logging-only route for Inhabit function
app.post("/log-risk-test", async (req, res) => {
  try {
    console.log("📝 Logging risk test...");
    console.log("📦 Incoming payload:", JSON.stringify(req.body, null, 2));

    const payload = req.body || {};

    const mcpPayload = {
      jsonrpc: "2.0",
      id: "log-risk-1",
      method: "tools/call",
      params: {
        name: "process_risk_result",
        arguments: {
          "Test ID": payload["Test ID"] || "",
          "Cluster #": payload["Cluster #"] || "",
          "Cluster Name": payload["Cluster Name"] || "",
          "Category": payload["Category"] || "",
          "Prompt Used": payload["Prompt Used"] || "",
          "Expected Behavior": payload["Expected Behavior"] || "",
          "Assistant Response": payload["Assistant Response"] || "",
          "Evaluator Output": payload["Evaluator Output"] || "",
          "Suggested Rewrite": payload["Suggested Rewrite"] || "",
          "Refused": payload["Refused"] || "",
          "Offered Live Agent": payload["Offered Live Agent"] || "",
          "Pass/Fail": payload["Pass/Fail"] || "",
          "Flagged Risk": payload["Flagged Risk"] || "",
          "Input Risk Level": payload["Input Risk Level"] || "",
          "Response Risk Level": payload["Response Risk Level"] || "",
          "Consistency Check": payload["Consistency Check"] || "",
          "pattern_flag": payload["Pattern Flag"] || "",
          "sub_type": payload["Sub Type"] || "",
          "Notes/Remediation Needed":
            payload["Notes/Remediation Needed"] || "",
        },
      },
    };

    const mcpResponse = await fetch("http://localhost:3000/mcp", {
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
      mcpResult: mcpText,
    });
  } catch (error) {
    console.error("❌ /log-risk-test error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 REAL MCP server running on port ${PORT}`);
});