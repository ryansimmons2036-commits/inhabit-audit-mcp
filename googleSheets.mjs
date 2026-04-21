import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = process.env.SHEET_ID;
const sheetName = "Sheet1";

function chicagoTimestamp() {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
  });
}

export async function appendConversationLogRow(input) {
  const timestamp = chicagoTimestamp();

  const row = [
    timestamp, // A Timestamp
    input["Test ID"] || "", // B Test ID
    input["Cluster #"] || "", // C Cluster #
    input["Cluster Name"] || "", // D Cluster Name
    input["Tags"] || "", // E Tags
    input["Category"] || "", // F Category
    input["Prompt Used"] || "", // G Prompt Used
    "", // H Expected Behavior
    input["Assistant Response"] || "", // I Assistant Response
    "", // J Evaluator Output
    "", // K Suggested Rewrite
    "", // L Refused
    "", // M Offered Live Agent
    "", // N Pass/Fail
    "", // O Input Risk Level
    "", // P Response Risk Level
    "", // Q Consistency Check
    "", // R pattern_flag
    "", // S sub_type
    "", // T Notes/Remediation Needed
  ];

  console.log("🕒 Conversation timestamp:", timestamp);
  console.log("📝 Conversation row being appended:", row);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  return {
    timestamp,
    testId: input["Test ID"] || "",
    appended: true,
  };
}

export async function findRowByTestId(testId) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:T`,
  });

  const rows = response.data.values || [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const currentTestId = row[1] || "";
    if (currentTestId === testId) {
      return i + 1;
    }
  }

  return null;
}

export async function updateEvaluationFieldsByTestId(testId, input) {
  const rowNumber = await findRowByTestId(testId);

  if (!rowNumber) {
    throw new Error(`No row found for Test ID: ${testId}`);
  }

  const existingResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}:T${rowNumber}`,
  });

  const existingRow = existingResponse.data.values?.[0] || [];
  const existingAssistantResponse = existingRow[8] || "";

  const updateValues = [
    [
      input["Expected Behavior"] || "", // H
      existingAssistantResponse, // I preserve existing Assistant Response
      input["Evaluator Output"] || "", // J
      input["Suggested Rewrite"] || "", // K
      input["Refused"] || "", // L
      input["Offered Live Agent"] || "", // M
      input["Pass/Fail"] || "", // N
      input["Input Risk Level"] || "", // O
      input["Response Risk Level"] || "", // P
      input["Consistency Check"] || "", // Q
      input["pattern_flag"] || "", // R
      input["sub_type"] || "", // S
      input["Notes/Remediation Needed"] || "", // T
    ],
  ];

  console.log(`🛠 Updating evaluation fields for Test ID ${testId} at row ${rowNumber}`);
  console.log("📝 Evaluation values being written:", updateValues);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!H${rowNumber}:T${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: updateValues,
    },
  });

  return {
    testId,
    rowNumber,
    updated: true,
  };
}on