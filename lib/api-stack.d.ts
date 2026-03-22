import { Stack, StackProps, aws_ec2, aws_iam } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Cognito } from "./constructs/cognito";
import * as neptune from "@aws-cdk/aws-neptune-alpha";
import { S3Uri } from "./constructs/api";
interface ApiStackProps extends StackProps {
    cognito: {
        adminEmail: string;
        userName?: string;
    };
    vpc: aws_ec2.Vpc;
    cluster: neptune.DatabaseCluster;
    clusterRole: aws_iam.Role;
    graphqlFieldName: string[];
    s3Uri: S3Uri;
}
export declare class ApiStack extends Stack {
    readonly cognito: Cognito;
    readonly graphqlUrl: string;
    readonly graphqlApiId: string;
    readonly lambdaFunctionNames: Record<string, string>;
    constructor(scope: Construct, id: string, props: ApiStackProps);
}
export {};
