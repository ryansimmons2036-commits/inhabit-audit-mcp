Replace my entire googleSheets.mjs file with a clean ES module version that supports a two-phase Google Sheets workflow for my Inhabit audit log.

Requirements:
- Use `import { google } from "googleapis";`
- Keep GoogleAuth setup using:
  - process.env.GOOGLE_CLIENT_EMAIL
  - process.env.GOOGLE_PRIVATE_KEY with .replace(/\\n/g, "\n")
- Use scope: https://www.googleapis.com/auth/spreadsheets
- Use spreadsheetId from process.env.SHEET_ID
- Use sheet name "Sheet1"

I need three exported async functions:

1. `appendConversationLogRow(input)`
This function should:
- create a timestamp in America/Chicago timezone
- append a NEW row to Sheet1
- write these columns in this exact order:
  A Timestamp
  B Test ID
  C Cluster #
  D Cluster Name
  E Tags
  F Category
  G Prompt Used
  H Expected Behavior
  I Assistant Response
  J Evaluator Output
  K Suggested Rewrite
  L Refused
  M Offered Live Agent
  N Pass/Fail
  O Input Risk Level
  P Response Risk Level
  Q Consistency Check
  R pattern_flag
  S sub_type
  T Notes/Remediation Needed

For the conversation logging phase:
- populate A through G and I
- leave H and J through T blank
- specifically:
  - Timestamp = generated timestamp
  - Test ID = input["Test ID"] || ""
  - Cluster # = input["Cluster #"] || ""
  - Cluster Name = input["Cluster Name"] || ""
  - Tags = input["Tags"] || ""
  - Category = input["Category"] || ""
  - Prompt Used = input["Prompt Used"] || ""
  - Expected Behavior = ""
  - Assistant Response = input["Assistant Response"] || ""
  - all remaining evaluation columns blank
- log the row contents to console
- append using USER_ENTERED
- return an object with:
  - timestamp
  - testId
  - appended: true

2. `findRowByTestId(testId)`
This function should:
- read rows from Sheet1!A:T
- search for the row where column B matches the provided testId exactly
- ignore the header row
- return the 1-based sheet row number if found
- return null if not found

3. `updateEvaluationFieldsByTestId(testId, input)`
This function should:
- call findRowByTestId(testId)
- throw a clear error if no row is found
- update only columns H through T on the matching row
- preserve all original conversation columns
- write these values in this exact order:
  H Expected Behavior = input["Expected Behavior"] || ""
  I Assistant Response = existing sheet value should NOT be overwritten here
  J Evaluator Output = input["Evaluator Output"] || ""
  K Suggested Rewrite = input["Suggested Rewrite"] || ""
  L Refused = input["Refused"] || ""
  M Offered Live Agent = input["Offered Live Agent"] || ""
  N Pass/Fail = input["Pass/Fail"] || ""
  O Input Risk Level = input["Input Risk Level"] || ""
  P Response Risk Level = input["Response Risk Level"] || ""
  Q Consistency Check = input["Consistency Check"] || ""
  R pattern_flag = input["pattern_flag"] || ""
  S sub_type = input["sub_type"] || ""
  T Notes/Remediation Needed = input["Notes/Remediation Needed"] || ""

Important:
- do NOT overwrite column I Assistant Response during evaluation update
- for the H:T update range, first read the existing row values from A:T so you can preserve Assistant Response
- then update H:T with the correct values
- use USER_ENTERED
- log updated values to console
- return an object with:
  - testId
  - rowNumber
  - updated: true

General requirements:
- the code must be syntactically correct and runnable
- include helpful console logs
- output the full final contents of googleSheets.mjs only, with no explanation