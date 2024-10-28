import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const S3_BUCKET = "lenin-training-leninner-logs-bucket-test";
const S3 = new S3Client({});

export const writeLogToS3 = async (request: any) => {
  const timestamp = new Date().toISOString();
  const keyName = `logs/${timestamp}-${uuidv4()}.json`;

  const params = {
    Bucket: S3_BUCKET,
    Key: keyName,
    Body: JSON.stringify(request),
    ContentType: "application/json",
  };

  try {
    const data = await S3.send(new PutObjectCommand(params));
    console.log(data);
    console.log(`Logged request to S3: ${keyName}`);
  } catch (error) {
    console.error("Error writing log to S3:", error);
  }
};
