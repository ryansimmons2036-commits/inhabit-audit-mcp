import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.mjs";
import {
  appendConversationLogRow,
  getConversationRecordByTestId,
  updateEvaluationFieldsByTestId,
} from "./googleSheets.mjs";

const PORT = process.env.PORT || 3000;
const AUTO_EVALUATE_ON_LOG = process.env.AUTO_EVALUATE_ON_LOG !== "false";
const EVALUATOR_URL = process.env.EVALUATOR_URL || "";
const EVALUATOR_API_KEY = process.env.EVALUATOR_API_KEY || "";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Inhabit audit MCP server is running",
    autoEvaluateOnLog: AUTO_EVALUATE_ON_LOG,
    evaluatorConfigured: Boolean(EVALUATOR_URL),
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
  const subType = toText(payload["Sub Type"] || payload["sub_type"]);
  const patternFlag = toText(payload["Pattern Flag"] || payload["pattern_flag"]);

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

function normalizeEvaluationPayload(testId, evaluation) {
  const source = evaluation?.evaluation || evaluation || {};

  return {
    "Test ID": testId,
    "Expected Behavior": toText(
      source["Expected Behavior"] ?? source.expected_behavior
    ),
    "Evaluator Output": toText(
      source["Evaluator Output"] ?? source.evaluator_output
    ),
    "Suggested Rewrite": toText(
      source["Suggested Rewrite"] ?? source.suggested_rewrite
    ),
    "Refused": toText(source["Refused"] ?? source.refused),
    "Offered Live Agent": toText(
      source["Offered Live Agent"] ?? source.offered_live_agent
    ),
    "Pass/Fail": toText(source["Pass/Fail"] ?? source.pass_fail),
    "Input Risk Level": toText(
      source["Input Risk Level"] ?? source.input_risk_level
    ),
    "Response Risk Level": toText(
      source["Response Risk Level"] ?? source.response_risk_level
    ),
    "Consistency Check": toText(
      source["Consistency Check"] ?? source.consistency_check
    ),
    pattern_flag: toText(source["pattern_flag"] ?? source["Pattern Flag"]),
    sub_type: toText(source["sub_type"] ?? source["Sub Type"]),
    "Notes/Remediation Needed": toText(
      source["Notes/Remediation Needed"] ?? source.notes_remediation_needed
    ),
  };
}

async function callEvaluator(record) {
  if (!EVALUATOR_URL) {
    throw new Error(
      "EVALUATOR_URL is not configured. Add your evaluator endpoint URL in Render environment variables."
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (EVALUATOR_API_KEY) {
    headers.Authorization = `Bearer ${EVALUATOR_API_KEY}`;
  }

  const payload = {
    "Test ID": record["Test ID"],
    "Cluster #": record["Cluster #"],
    "Cluster Name": record["Cluster Name"],
    Tags: record["Tags"],
    Category: record["Category"],
    "Prompt Used": record["Prompt Used"],
    "Assistant Response": record["Assistant Response"],
  };

  console.log("🧠 Sending record to evaluator endpoint...");
  console.log(JSON.stringify(payload, null, 2));

  const response = await fetch(EVALUATOR_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  console.log("🧠 Evaluator raw response:", rawText);

  if (!response.ok) {
    throw new Error(
      `Evaluator request failed with status ${response.status}: ${rawText}`
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      "Evaluator response was not valid JSON. The evaluator endpoint must return JSON."
    );
  }

  return parsed;
}

async function runAutoEvaluation(testId) {
  console.log(`🔎 Retrieving conversation record for Test ID ${testId}...`);
  const record = await getConversationRecordByTestId(testId);

  console.log("✅ Conversation record retrieved:");
  console.log(record);

  const evaluatorResponse = await callEvaluator(record);
  const normalized = normalizeEvaluationPayload(testId, evaluatorResponse);

  console.log("📝 Normalized evaluation payload:");
  console.log(normalized);

  await updateEvaluationFieldsByTestId(testId, normalized);

  return {
    testId,
    evaluated: true,
  };
}

// Main logging/evaluation route
app.post("/log-risk-test", async (req, res) => {
  try {
    console.log("📝 Incoming /log-risk-test payload:");
    console.log(JSON.stringify(req.body, null, 2));

    const p = req.body || {};
    const isDirectEvaluationUpdate = !!toText(p["Pass/Fail"]);
    const testId = toText(p["Test ID"]);

    if (!testId) {
      return res.status(400).json({
        error: "Missing Test ID",
      });
    }

    // Direct evaluation update path (still supported)
    if (isDirectEvaluationUpdate) {
      const evaluationPayload = normalizeEvaluationPayload(testId, p);
      const updateResult = await updateEvaluationFieldsByTestId(
        testId,
        evaluationPayload
      );

      return res.status(200).json({
        status: "updated",
        phase: "evaluation",
        result: updateResult,
      });
    }

    // Conversation logging path
    const logPayload = {
      "Test ID": testId,
      "Cluster #": toText(p["Cluster #"] || p["Primary Cluster #"]),
      "Cluster Name": toText(
        p["Cluster Name"] || p["Primary Cluster Name"]
      ),
      Tags: deriveTags(p),
      Category: toText(p["Category"]),
      "Prompt Used": toText(p["Prompt Used"]),
      "Assistant Response": toText(p["Assistant Response"]),
    };

    const logResult = await appendConversationLogRow(logPayload);

    // Optional auto-evaluation right after logging
    let evaluationResult = null;
    let evaluationError = null;

    if (AUTO_EVALUATE_ON_LOG) {
      try {
        evaluationResult = await runAutoEvaluation(testId);
      } catch (error) {
        evaluationError = error.message;
        console.error("❌ Auto-evaluation failed:", error);
      }
    }

    return res.status(200).json({
      status: "logged",
      phase: "conversation_log",
      result: logResult,
      autoEvaluation: AUTO_EVALUATE_ON_LOG
        ? evaluationError
          ? { success: false, error: evaluationError }
          : { success: true, result: evaluationResult }
        : { success: false, skipped: true },
    });
  } catch (error) {
    console.error("❌ /log-risk-test error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

// Manual backend-triggered evaluation route
app.post("/evaluate-test-id", async (req, res) => {
  try {
    const testId = toText(req.body?.["Test ID"] || req.body?.testId);

    if (!testId) {
      return res.status(400).json({
        error: "Missing Test ID",
      });
    }

    const result = await runAutoEvaluation(testId);

    return res.status(200).json({
      status: "evaluated",
      result,
    });
  } catch (error) {
    console.error("❌ /evaluate-test-id error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 REAL MCP server running on port ${PORT}`);
});