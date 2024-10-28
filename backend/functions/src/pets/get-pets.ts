import middy from "@middy/core";

import {
  ApiErrorResponseDTO,
  ApiSuccessResponseDTO,
} from "../../../layers/interfaces/dto";
import {
  QueryCommand,
  QueryCommandInput,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { writeLogToS3 } from "../../../layers/logging";

const PETS_TABLE_NAME = `${process.env.PETS_TABLE_NAME}`;
const FOUNDATIONS_TABLE_NAME = `${process.env.FOUNDATIONS_TABLE_NAME}`;

const databaseClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(databaseClient);

const getPetsHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  await writeLogToS3(event);

  const queryParams = event.queryStringParameters;

  const foundationId = queryParams?.foundation!;
  const petType = queryParams?.type;
  const petBreed = queryParams?.breed;

  const foundationQuery: QueryCommandInput = {
    TableName: FOUNDATIONS_TABLE_NAME,
    KeyConditionExpression: "#dynodb_id = :id",
    ExpressionAttributeValues: {
      ":id": foundationId,
    },
    ExpressionAttributeNames: {
      "#dynodb_id": "id",
    },
  };

  const foundationQueryCommand = new QueryCommand(foundationQuery);
  const foundationExists = await documentClient.send(foundationQueryCommand);

  if ((foundationExists?.Items?.length || 1) === 0) {
    return new ApiErrorResponseDTO(401, {
      message: "Foundation not found",
    });
  }

  try {
    const getPetsQuery: QueryCommandInput = {
      TableName: PETS_TABLE_NAME,
      IndexName: "FoundationIndex",
      KeyConditionExpression: "#dynodb_foundationId = :foundationId",
      ExpressionAttributeValues: {
        ":foundationId": foundationId,
      },
      ExpressionAttributeNames: {
        "#dynodb_foundationId": "foundationId",
      },
    };

    const filterExpressions: string[] = [];

    if (petType) {
      filterExpressions.push("#dynodb_type = :type");
      getPetsQuery.ExpressionAttributeValues[":type"] = petType;
      getPetsQuery.ExpressionAttributeNames["#dynodb_type"] = "type";
    }

    if (petBreed) {
      filterExpressions.push("#dynodb_breed = :breed");
      getPetsQuery.ExpressionAttributeValues[":breed"] = petBreed;
      getPetsQuery.ExpressionAttributeNames["#dynodb_breed"] = "breed";
    }

    if (filterExpressions.length > 0) {
      getPetsQuery.FilterExpression = filterExpressions.join(" OR ");
    }

    const queryCommand = new QueryCommand(getPetsQuery);
    const pets = await documentClient.send(queryCommand);

    if (pets?.Items?.length === 0) {
      return new ApiErrorResponseDTO(404, {
        message: "Pets not found",
      });
    }

    return new ApiSuccessResponseDTO(200, {
      message: "Pets found",
      pets: pets?.Items,
    });
  } catch (error) {
    console.error(error);

    return new ApiErrorResponseDTO(501, {
      message: "Internal server error",
    });
  }
};

export const handler = middy(getPetsHandler);
