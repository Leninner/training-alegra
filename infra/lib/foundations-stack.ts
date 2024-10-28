import * as cdk from "aws-cdk-lib";
import { getCdkPropsFromCustomProps } from "./util";
import { Construct } from "constructs";
import { StackBasicProps } from "./interfaces";

export class FoundationsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackBasicProps) {
    super(scope, id, getCdkPropsFromCustomProps(props));
  }
}
