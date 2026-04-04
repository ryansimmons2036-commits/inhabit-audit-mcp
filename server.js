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
      const row = [
        args["Test ID"] || "",
        args["Cluster #"] || "",
        args["Cluster Name"] || "",
        args["Category"] || "",
        args["Prompt Used"] || "",
        args["Expected Behavior"] || "",
        args["Assistant Response"] || "",
        args["Evaluator Output"] || "",
        args["Suggested Rewrite"] || "",
        args["Refused"] || "",
        args["Offered Live Agent"] || "",
        args["Pass/Fail"] || "",
        args["Risk Level"] || "",
        args["Severity (1-5)"] || "",
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
        functionCallResponse: {
          status: "success",
          message: "Audit log written to Google Sheets",
        },
        rerunLLM: false,
      });
    } catch (error) {
      console.error("❌ Google Sheets append failed:", error.message);
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