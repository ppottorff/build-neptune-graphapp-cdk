import { aws_ec2, aws_iam } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as neptune from "@aws-cdk/aws-neptune-alpha";
import { Cognito } from "./cognito";
export interface BackendApiProps {
    schema: string;
    cognito: Cognito;
    vpc: aws_ec2.Vpc;
    cluster: neptune.DatabaseCluster;
    clusterRole: aws_iam.Role;
    graphqlFieldName: string[];
    s3Uri: S3Uri;
}
export type S3Uri = {
    vertex: string;
    edge: string;
};
export declare class Api extends Construct {
    readonly graphqlUrl: string;
    constructor(scope: Construct, id: string, props: BackendApiProps);
}
