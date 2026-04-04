import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.mjs";

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    transport.close();
    server.close();
  };

  res.on("finish", cleanup);
  res.on("error", cleanup);

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("❌ MCP server error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "MCP server failure" });
    }
    cleanup();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 REAL MCP server running on port ${PORT}`);
});