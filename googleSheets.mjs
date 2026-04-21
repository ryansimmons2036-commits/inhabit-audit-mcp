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