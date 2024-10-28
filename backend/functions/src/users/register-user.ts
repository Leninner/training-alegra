import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { ulid } from "ulid";
import { writeLogToS3 } from "../../../layers/logging";
import {
  ApiErrorResponseDTO,
  ApiSuccessResponseDTO,
} from "../../../layers/interfaces/dto";

const USER_TABLE_NAME = `${process.env.USERS_TABLE}`;
const JWT_SECRET = process.env.JWT_SECRET || "default-secret"; // Reemplazar en producción
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const databaseClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(databaseClient);

interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

const registerUserHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<any> => {
  await writeLogToS3(event);

  const userId = ulid();
  const data = event.body as unknown as CreateUserDto;
  const userPassword = bcrypt.hashSync(data.password, 10);

  const user = {
    id: userId,
    email: data.email,
    password: userPassword,
    name: data.name,
  };

  console.log({ user });

  const query: QueryCommandInput = {
    TableName: USER_TABLE_NAME,
    IndexName: "EmailIndex",
    KeyConditionExpression: "#email = :email",
    ExpressionAttributeValues: {
      ":email": { S: user.email },
    },
    ExpressionAttributeNames: {
      "#email": "email",
    },
  };

  const queryCommand = new QueryCommand(query);
  const alreadyExists = await documentClient.send(queryCommand);

  if ((alreadyExists?.Items?.length || 0) > 0) {
    return new ApiErrorResponseDTO(400, {
      message: "User already exists",
    });
  }

  try {
    const command: PutCommandInput = {
      TableName: USER_TABLE_NAME,
      Item: user,
    };

    const inputCommand = new PutCommand(command);
    await documentClient.send(inputCommand);

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return new ApiSuccessResponseDTO(201, {
      message: "User created",
      token,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return new ApiErrorResponseDTO(400, {
      message: "Failed to create user",
    });
  }
};

export const handler = middy(registerUserHandler).use(httpJsonBodyParser());
