import { DynamoDB } from "aws-sdk";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { MissingFieldError } from "./utils/InputValidator";
import { generateRandomId, getEventBody, addCorsHeader } from "./utils";

const TABLE_NAME = process.env.TABLE_NAME;
const dbClient = new DynamoDB.DocumentClient();

async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const result: APIGatewayProxyResult = {
    statusCode: 200,
    body: "Hello from DYnamoDb",
  };
  addCorsHeader(result);

  try {
    // const item = getEventBody(event);
    validate(event);
    // const recordID  = event?.queryStringParameters?["recordID"];
    const { queryStringParameters = {} } = event || {};
    const recordID = queryStringParameters!["recordID"];
    console.log("receive request for PK" + recordID);
    const data = await dbClient
      .get({
        TableName: TABLE_NAME!,
        Key: {
          PK: recordID,
        },
      })
      .promise();
    const { Item } = data;
    result.body = JSON.stringify({
      Item,
    });
  } catch (error) {
    if (error instanceof MissingFieldError) {
      result.statusCode = 400;
      result.body = "record id is missing";
    } else {
      result.statusCode = 500;
    }
    result.body = JSON.stringify(error);
  }
  return result;
}

function validate(event: any) {
  const { queryStringParameters = {} } = event;
  const recordID = queryStringParameters!["recordID"];
  if (!recordID || recordID.length === 0) {
    throw new MissingFieldError();
  }
}

export { handler };
