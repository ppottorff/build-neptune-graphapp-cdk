import { Construct } from "constructs";
import { Duration, aws_cognito, aws_iam } from "aws-cdk-lib";
export interface CognitoProps {
    adminEmail: string;
    userName?: string;
    refreshTokenValidity?: Duration;
}
export interface CognitoParams {
    userPoolId: string;
    userPoolClientId: string;
    identityPoolId: string;
}
export declare class Cognito extends Construct {
    readonly cognitoParams: CognitoParams;
    readonly userPool: aws_cognito.UserPool;
    readonly authenticatedRole: aws_iam.IRole;
    constructor(scope: Construct, id: string, props: CognitoProps);
}
