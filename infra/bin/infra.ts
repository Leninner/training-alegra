#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { SharedStack } from "../lib/shared-stack";

dotenv.config();

const app = new cdk.App();

const appName = "lenin-training";

const env = app.node.tryGetContext("env");

if (["test", "prod"].indexOf(env) === -1) {
  throw Error("Env not supported");
}

console.log(`Deploying to ${process.env.AWS_ACCOUNT_ID} environment`);
const sharedProps = {
  env: env,
  account: process.env.AWS_ACCOUNT_ID || "",
  region: process.env.AWS_ACCOUNT_REGION || "",
};

new SharedStack(app, "SharedStack", {
  ...sharedProps,
  name: `${appName}-shared-${env}`,
});
