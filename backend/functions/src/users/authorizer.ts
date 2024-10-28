import middy from "@middy/core";
import {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewayAuthorizerResult,
} from "aws-lambda";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

enum StatementEffect {
  ALLOW = "Allow",
  DENY = "Deny",
}

const validateToken = (token: string): boolean => {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
};

const lambdaAuthorizer = async (
  event: APIGatewayRequestAuthorizerEventV2,
): Promise<APIGatewayAuthorizerResult> => {
  const { routeArn, headers } = event;

  try {
    if (validateToken(headers?.authorization || "")) {
      return generatePolicy("user", StatementEffect.ALLOW, routeArn);
    }

    return generatePolicy("user", StatementEffect.DENY, routeArn);
  } catch (error) {
    console.error("Error in Lambda Authorizer:", error);
    return generatePolicy("user", StatementEffect.DENY, routeArn);
  }
};

const generatePolicy = (
  principalId: string,
  effect: StatementEffect,
  resource: string,
): APIGatewayAuthorizerResult => {
  if (!effect || !resource) {
    throw new Error("Missing effect or resource for policy generation");
  }

  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Resource: resource,
          Effect: effect,
        },
      ],
    },
  };
};

export const handler = middy(lambdaAuthorizer);
