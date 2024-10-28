import { ulid } from "ulid";
import middy from "@middy/core";

import {
  CreateFoundationDto,
  ApiErrorResponseDTO,
  ApiSuccessResponseDTO,
} from "../../../layers/interfaces/dto";
import { writeLogToS3 } from "../../../layers/logging";
import {
  QueryCommand,
  PutCommand,
  PutCommandInput,
  QueryCommandInput,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import httpJsonBodyParser from "@middy/http-json-body-parser";

const FOUNDATIONS_TABLE_NAME = `${process.env.FOUNDATIONS_TABLE_NAME}`;

const databaseClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(databaseClient);

const createFoundationHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<any> => {
  await writeLogToS3(event);

  const foundationId = ulid();
  const data = event.body as unknown as CreateFoundationDto;

  const foundation = {
    id: foundationId,
    name: data.name,
    createdAt: new Date().toISOString(),
  };

  const query: QueryCommandInput = {
    TableName: FOUNDATIONS_TABLE_NAME,
    IndexName: "NameIndex",
    KeyConditionExpression: "#dynodb_name = :name",
    ExpressionAttributeValues: {
      ":name": data.name,
    },
    ExpressionAttributeNames: {
      "#dynodb_name": "name",
    },
  };

  const queryCommand = new QueryCommand(query);
  const alreadyExists = await documentClient.send(queryCommand);

  if ((alreadyExists?.Items?.length || 0) > 0) {
    return new ApiErrorResponseDTO(400, {
      message: "Foundation already exists",
    });
  }

  try {
    const command: PutCommandInput = {
      TableName: FOUNDATIONS_TABLE_NAME,
      Item: foundation,
    };

    const inputCommand = new PutCommand(command);
    await documentClient.send(inputCommand);

    return new ApiSuccessResponseDTO(201, {
      message: "Foundation created",
      foundation,
    });
  } catch (error) {
    console.error(error);

    return new ApiErrorResponseDTO(500, {
      message: "Internal server error",
    });
  }
};

export const handler = middy(createFoundationHandler).use(httpJsonBodyParser());
