import middy from "@middy/core";

import {
  ApiErrorResponseDTO,
  ApiSuccessResponseDTO,
  UpdatePetDto,
} from "../../../layers/interfaces/dto";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { writeLogToS3 } from "../../../layers/logging";

const PETS_TABLE_NAME = `${process.env.PETS_TABLE_NAME}`;

const databaseClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(databaseClient);

const updatePetHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<any> => {
  await writeLogToS3(event);

  const params = event.pathParameters;
  const foundationId = event.queryStringParameters?.foundation;
  const data = event.body as unknown as UpdatePetDto;

  if (!params?.id) {
    return new ApiErrorResponseDTO(400, {
      message: "Missed required data to update a pet",
    });
  }

  try {
    const command: UpdateCommandInput = {
      TableName: PETS_TABLE_NAME,
      Key: {
        id: params.id,
        foundationId,
      },
      UpdateExpression: "set #name = :name",
      ExpressionAttributeNames: {
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": data.name,
      },
    };

    const updateCommand = new UpdateCommand(command);
    await documentClient.send(updateCommand);

    return new ApiSuccessResponseDTO(200, {
      message: "Pet updated",
    });
  } catch (error) {
    console.error(error);

    return new ApiErrorResponseDTO(502, {
      message: "Internal server error",
    });
  }
};

export const handler = middy(updatePetHandler).use(httpJsonBodyParser());
