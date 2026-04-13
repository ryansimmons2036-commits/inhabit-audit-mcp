require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.json());

// Google Sheets auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// MCP endpoint
app.post("/mcp", async (req, res) => {
  const { name, arguments: args } = req.body;

  console.log("📥 MCP CALL RECEIVED:");
  console.log("Tool Name:", name);
  console.log("Arguments:", args);

  if (name === "append_audit_log") {
    try {

    	const timestamp = new Date().toLocaleString();
	console.log("🕒 Timestamp value:", timestamp);

    	const validSecondaryClusters = new Set([
      	const validSecondaryClusters = new Set([
        "1 — Fair Housing & Discrimination",
        "2 — Credit & Screening Risk (FCRA/ECOA)",
        "3 — Privacy & Data Leakage",
        "4 — Legal Advice / Liability",
        "5 — Maintenance & Safety",
        "6 — Financial Manipulation / Fraud",
        "7 — Prompt Injection / System Override",
        "8 — Social Engineering",
        "9 — Hallucination",
        "10 — Bias / Toxic Language",
        "11 — Site Access & Exploitation",
        "12 — Governance & Escalation Risk",
      ]);

      const validCategories = new Set([
        "Compliance Safe",
        "Compliance Risk",
        "Safety Risk",
        "Security Risk",
        "Governance Risk",
        "Escalation Needed",
      ]);

      const normalizeCategory = (value) => {
        if (!value) return "";
        if (value === "Security") return "Security Risk";
        if (value === "Compliance") return "Compliance Risk";
        if (value === "Safety") return "Safety Risk";
        return validCategories.has(value) ? value : "";
      };

      const normalizeSecondaryClusters = (value) => {
        if (!value) return "";

        const parts = String(value)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const cleaned = parts.filter((part) =>
          validSecondaryClusters.has(part)
        );

        return cleaned.join(", ");
      };

      const normalizedCategory = normalizeCategory(args["Category"]);
      const normalizedSecondaryClusters = normalizeSecondaryClusters(
        args["Secondary Clusters"]
      );

      console.log("🧪 Test ID value:", args["Test ID"]);
      console.log("🧪 Cluster # value:", args["Cluster #"]);
      console.log("🧪 Cluster Name value:", args["Cluster Name"]);
      console.log("🧪 Raw Secondary Clusters value:", args["Secondary Clusters"]);
      console.log(
        "🧪 Normalized Secondary Clusters value:",
        normalizedSecondaryClusters
      );
      console.log("🧪 Raw Category value:", args["Category"]);
      console.log("🧪 Normalized Category value:", normalizedCategory);

      const row = [
	timestamp,
        args["Test ID"] || "",
        args["Cluster #"] || "",
        args["Cluster Name"] || "",
        normalizedSecondaryClusters,
        normalizedCategory,
        args["Prompt Used"] || "",
        args["Expected Behavior"] || "",
        args["Assistant Response"] || "",
        args["Evaluator Output"] || "",
        args["Suggested Rewrite"] || "",
        args["Refused"] || "",
        args["Offered Live Agent"] || "",
        args["Pass/Fail"] || "",
        args["Risk Level"] || "",
        args["Consistency Check"] || "",
        args["pattern_flag"] || "",
        args["sub_type"] || "",
        args["Notes/Remediation Needed"] || "",
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SHEET_ID,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row],
        },
      });

      console.log("✅ Row appended to Google Sheets");

      return res.json({
        rerunLLM: true,
      });
    } catch (error) {
      console.error("❌ Google Sheets append failed:", error.message);
      console.error(error);
      return res.status(500).json({
        error: "Failed to write audit log",
        details: error.message,
      });
    }
  }

  return res.status(400).json({
    error: "Unknown function",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 MCP server running at http://localhost:${PORT}`);
});