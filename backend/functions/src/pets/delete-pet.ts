import middy from "@middy/core";

import {
  ApiErrorResponseDTO,
  ApiSuccessResponseDTO,
} from "../../../layers/interfaces/dto";
import {
  QueryCommand,
  QueryCommandInput,
  DynamoDBDocumentClient,
  UpdateCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { STATUS } from "../../../layers/interfaces/common";
import { writeLogToS3 } from "../../../layers/logging";

const PETS_TABLE_NAME = `${process.env.PETS_TABLE_NAME}`;

const databaseClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(databaseClient);

const deletePetHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  await writeLogToS3(event);

  const params = event.pathParameters;
  const queryParams = event.queryStringParameters;

  if (!params?.id || !queryParams?.foundation) {
    return new ApiErrorResponseDTO(400, {
      message: "Missed required data to delete a pet",
    });
  }

  try {
    const command: UpdateCommandInput = {
      TableName: PETS_TABLE_NAME,
      Key: {
        id: params.id,
        foundationId: queryParams.foundation,
      },
      UpdateExpression: "set #status = :status",
      ExpressionAttributeValues: {
        ":status": STATUS.DELETED,
      },
      ExpressionAttributeNames: {
        "#status": "status",
      },
    };

    const updateCommand = new UpdateCommand(command);
    await documentClient.send(updateCommand);

    return new ApiSuccessResponseDTO(200, {
      message: "Pet deleted",
    });
  } catch (error) {
    console.error(error);

    return new ApiErrorResponseDTO(502, {
      message: "Internal server error",
    });
  }
};

export const handler = middy(deletePetHandler);
