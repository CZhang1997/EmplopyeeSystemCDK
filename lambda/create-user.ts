import { CognitoIdentityServiceProvider, DynamoDB } from "aws-sdk";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { MissingFieldError } from "./utils/InputValidator";
import { generateRandomId, getEventBody, addCorsHeader } from "./utils";
import { AdminCreateUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";

const TABLE_NAME = process.env.TABLE_NAME;
const UserPoolId = process.env.UserPoolId;

const dbClient = new DynamoDB.DocumentClient();
const cognito = new CognitoIdentityServiceProvider();

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
    const item = getEventBody(event);

    const { email, username, password } = item;

    console.log(
      "receive request from " +
        event.requestContext.authorizer?.claims["cognito:username"] +
        " for " +
        JSON.stringify(item)
    );

    console.log(
      "/////////////////",
      JSON.stringify(event.requestContext.authorizer?.claims)
    );

    const cognitoParams: AdminCreateUserRequest = {
      UserPoolId: UserPoolId!,
      Username: username,
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
      TemporaryPassword: password,
    };

    let response = await cognito.adminCreateUser(cognitoParams).promise();

    console.log(JSON.stringify(response, null, 2));
    result.body = JSON.stringify(response);
  } catch (error) {
    console.error(error);
    if (error instanceof MissingFieldError) {
      result.statusCode = 400;
    } else {
      result.statusCode = 500;
    }
    result.body = JSON.stringify(error);
  }
  return result;
}

export { handler };
