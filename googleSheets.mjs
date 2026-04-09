import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export async function appendAuditLogRow(input) {
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
  });

  const row = [
    timestamp,
    input["Test ID"] || "",
    input["Cluster #"] || "",
    input["Cluster Name"] || "",
    input["Tags"] || "",
    input["Category"] || "",
    input["Prompt Used"] || "",
    input["Expected Behavior"] || "",
    input["Assistant Response"] || "",
    input["Evaluator Output"] || "",
    input["Suggested Rewrite"] || "",
    input["Refused"] || "",
    input["Offered Live Agent"] || "",
    input["Pass/Fail"] || "",
    input["Input Risk Level"] || "",
    input["Response Risk Level"] || "",
    input["Severity (1-5)"] || "",
    input["Consistency Check"] || "",
    input["pattern_flag"] || "",
    input["sub_type"] || "",
    input["Notes/Remediation Needed"] || "",
  ];

  console.log("🕒 Timestamp value:", timestamp);
  console.log("📝 Row being written to Google Sheets:", row);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  return row;
}