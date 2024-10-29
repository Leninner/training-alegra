import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apiGateway from "aws-cdk-lib/aws-apigatewayv2";
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import { StackBasicProps } from "./interfaces";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import { getCdkPropsFromCustomProps, getResourceNameWithPrefix } from "./util";
import { Code } from "aws-cdk-lib/aws-lambda";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

export class SharedStack extends cdk.Stack {
  public readonly apiGateway: apiGateway.HttpApi;
  public readonly domainName: apiGateway.DomainName;
  public readonly lambdaAuthorizer: lambda.NodejsFunction;

  constructor(scope: Construct, id: string, props?: StackBasicProps) {
    super(scope, id, getCdkPropsFromCustomProps(props));

    this.apiGateway = this.createApiGateway(
      props,
      this.createHttpAuthorizer(this.lambdaAuthorizer, props),
    );
    this.createLogsBucket(props);
    this.createRootResource(this.apiGateway);
  }

  private createApiGateway(
    props?: StackBasicProps,
    authorizer?: any,
  ): apiGateway.HttpApi {
    return new apiGateway.HttpApi(this, "ApiGateway", {
      apiName: getResourceNameWithPrefix(`api-gateway-${props?.env}`),
      description: "API Gateway para Lenin Training Pets",
      defaultAuthorizer: authorizer,
    });
  }

  private createLogsBucket(props?: StackBasicProps): s3.Bucket {
    return new s3.Bucket(this, "LogsBucket", {
      bucketName: getResourceNameWithPrefix(
        `leninner-logs-bucket-${props?.env}`,
      ),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }

  private createDomainName(): apiGateway.DomainName {
    const certificateArn =
      "arn:aws:acm:REGION:ACCOUNT_ID:certificate/CERTIFICATE_ID"; // Reemplaza con tu ARN real

    const certificate = certificatemanager.Certificate.fromCertificateArn(
      this,
      "Certificate",
      certificateArn,
    );

    return new apiGateway.DomainName(this, "CustomDomain", {
      domainName: "lenin-training-pets.alegra.com",
      endpointType: apiGateway.EndpointType.REGIONAL,
      certificate,
    });
  }

  private attachDomainNameToApiGateway(
    domainName: apiGateway.DomainName,
    api: apiGateway.HttpApi,
  ) {
    new apiGateway.ApiMapping(this, "BasePathMapping", {
      domainName,
      api,
      stage: api.defaultStage,
    });
  }

  private exportCustomName(domainName: apiGateway.DomainName) {
    new cdk.CfnOutput(this, "CustomDomainName", {
      value: domainName.name,
      description: "Dominio personalizado para la API Gateway",
    });
  }

  private createHttpAuthorizer(
    lambda: lambda.NodejsFunction,
    props?: StackBasicProps,
  ): HttpLambdaAuthorizer {
    return new HttpLambdaAuthorizer("SharedAuthorizer", lambda, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      authorizerName: getResourceNameWithPrefix(`authorizer-${props?.env}`),
    });
  }

  private createRootResource(api: apiGateway.HttpApi): apiGateway.HttpRoute {
    if (!api) {
      throw new Error("API Gateway instance is required");
    }

    const mockIntegration = new integrations.HttpLambdaIntegration(
      "MockIntegration",
      new lambda.NodejsFunction(this, "MockFunction", {
        handler: "index.handler",
        code: Code.fromInline(`
          exports.handler = async function(event) {
            return {
              statusCode: 200,
              body: JSON.stringify({
          message: "Hello, world!"
              })
            };
          }
        `),
      }),
    );

    return new apiGateway.HttpRoute(this, "RootRoute", {
      httpApi: api,
      routeKey: apiGateway.HttpRouteKey.with("/", apiGateway.HttpMethod.ANY),
      integration: mockIntegration,
    });
  }

  private attachAuthorizerToApiGateway(
    authorizer: lambda.NodejsFunction,
    api: apiGateway.HttpApi,
    props?: StackBasicProps,
  ): apiGateway.CfnAuthorizer {
    return new apiGateway.CfnAuthorizer(this, "SharedAuthorizer", {
      apiId: api.httpApiId,
      name: getResourceNameWithPrefix(`lambda-authorizer-${props?.env}`),
      authorizerType: "REQUEST",
      authorizerUri: `arn:aws:apigateway:${props?.region}:lambda:path/2015-03-31/functions/${authorizer.functionArn}/invocations`,
      authorizerPayloadFormatVersion: "2.0",
      authorizerResultTtlInSeconds: 300,
      identitySource: ["$request.header.Authorization"],
    });
  }
}
