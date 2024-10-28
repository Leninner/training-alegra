import middy from "@middy/core";

import {
  AdoptPetDto,
  ApiErrorResponseDTO,
  ApiSuccessResponseDTO,
} from "../../../layers/interfaces/dto";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { writeLogToS3 } from "../../../layers/logging";

const PETS_TABLE_NAME = `${process.env.PETS_TABLE_NAME}`;
const TOPIC_ARN = process.env.ADOPT_PET_TOPIC_ARN;

const databaseClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(databaseClient);
const snsClient = new SNSClient({});

const adoptPetHandler = async (event: APIGatewayProxyEventV2): Promise<any> => {
  await writeLogToS3(event);

  const data = event.body as unknown as AdoptPetDto;

  try {
    const command: UpdateCommandInput = {
      TableName: PETS_TABLE_NAME,
      Key: {
        id: data.petId,
        foundationId: data.foundationId,
      },
      UpdateExpression: "set #adopter = :adopter",
      ExpressionAttributeNames: {
        "#adopter": "adopter",
      },
      ExpressionAttributeValues: {
        ":adopter": data.adopter,
      },
    };

    const updateCommand = new UpdateCommand(command);
    await documentClient.send(updateCommand);

    const params = {
      Message: JSON.stringify({
        message: `A pet has been adopted by ${data.adopter.name + " " + data.adopter.lastName}`,
      }),
      TopicArn: TOPIC_ARN,
    };

    await snsClient.send(new PublishCommand(params));

    return new ApiSuccessResponseDTO(200, {
      message: "Pet adopted successfully",
    });
  } catch (error) {
    console.error(error);

    return new ApiErrorResponseDTO(502, {
      message: "Internal server error",
    });
  }
};

export const handler = middy(adoptPetHandler).use(httpJsonBodyParser());
