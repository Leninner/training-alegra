import { ulid } from "ulid";
import middy from "@middy/core";

import {
  CreatePetDto,
  ApiErrorResponseDTO,
  ApiSuccessResponseDTO,
} from "../../../layers/interfaces/dto";
import { STATUS } from "../../../layers/interfaces/common";
import {
  QueryCommand,
  PutCommand,
  PutCommandInput,
  QueryCommandInput,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { writeLogToS3 } from "../../../layers/logging";

const PETS_TABLE_NAME = `${process.env.PETS_TABLE_NAME}`;
const FOUNDATIONS_TABLE_NAME = `${process.env.FOUNDATIONS_TABLE_NAME}`;

const databaseClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(databaseClient);

const createPetHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  await writeLogToS3(event);

  const petId = ulid();
  const data = event.body as unknown as CreatePetDto;

  const pet = {
    ...data,
    id: petId,
    createdAt: new Date().toISOString(),
    status: STATUS.ACTIVE,
  };

  const foundationQuery: QueryCommandInput = {
    TableName: FOUNDATIONS_TABLE_NAME,
    KeyConditionExpression: "#dynodb_id = :id",
    ExpressionAttributeValues: {
      ":id": data.foundationId,
    },
    ExpressionAttributeNames: {
      "#dynodb_id": "id",
    },
  };

  const foundationQueryCommand = new QueryCommand(foundationQuery);
  const foundationExists = await documentClient.send(foundationQueryCommand);

  if ((foundationExists?.Items?.length || 0) === 0) {
    return new ApiErrorResponseDTO(400, {
      message: "Foundation not found",
    });
  }

  try {
    const command: PutCommandInput = {
      TableName: PETS_TABLE_NAME,
      Item: pet,
    };

    const inputCommand = new PutCommand(command);
    await documentClient.send(inputCommand);

    return new ApiSuccessResponseDTO(201, {
      message: "Pet created",
      pet,
    });
  } catch (error) {
    console.error(error);

    return new ApiErrorResponseDTO(500, {
      message: "Internal server error",
    });
  }
};

export const handler = middy(createPetHandler).use(httpJsonBodyParser());
