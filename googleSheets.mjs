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

function mapRowToRecord(row, rowNumber) {
  return {
    rowNumber,
    Timestamp: row[0] || "",
    "Test ID": row[1] || "",
    "Cluster #": row[2] || "",
    "Cluster Name": row[3] || "",
    "Tags": row[4] || "",
    "Category": row[5] || "",
    "Prompt Used": row[6] || "",
    "Expected Behavior": row[7] || "",
    "Assistant Response": row[8] || "",
    "Evaluator Output": row[9] || "",
    "Suggested Rewrite": row[10] || "",
    "Refused": row[11] || "",
    "Offered Live Agent": row[12] || "",
    "Pass/Fail": row[13] || "",
    "Input Risk Level": row[14] || "",
    "Response Risk Level": row[15] || "",
    "Consistency Check": row[16] || "",
    "pattern_flag": row[17] || "",
    "sub_type": row[18] || "",
    "Notes/Remediation Needed": row[19] || "",
  };
}

export async function appendConversationLogRow(input) {
  const timestamp = chicagoTimestamp();

  const row = [
    timestamp,
    input["Test ID"] || "",
    input["Cluster #"] || "",
    input["Cluster Name"] || "",
    input["Tags"] || "",
    input["Category"] || "",
    input["Prompt Used"] || "",
    "",
    input["Assistant Response"] || "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
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

export async function getConversationRecordByTestId(testId) {
  const rowNumber = await findRowByTestId(testId);

  if (!rowNumber) {
    throw new Error(`No row found for Test ID: ${testId}`);
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}:T${rowNumber}`,
  });

  const row = response.data.values?.[0] || [];
  const record = mapRowToRecord(row, rowNumber);

  console.log(`📖 Conversation record retrieved for Test ID ${testId}:`);
  console.log(record);

  return record;
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
      input["Expected Behavior"] || "",
      existingAssistantResponse,
      input["Evaluator Output"] || "",
      input["Suggested Rewrite"] || "",
      input["Refused"] || "",
      input["Offered Live Agent"] || "",
      input["Pass/Fail"] || "",
      input["Input Risk Level"] || "",
      input["Response Risk Level"] || "",
      input["Consistency Check"] || "",
      input["pattern_flag"] || "",
      input["sub_type"] || "",
      input["Notes/Remediation Needed"] || "",
    ],
  ];

  console.log(
    `🛠 Updating evaluation fields for Test ID ${testId} at row ${rowNumber}`
  );
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
}