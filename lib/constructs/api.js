"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Api = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_appsync_1 = require("aws-cdk-lib/aws-appsync");
const constructs_1 = require("constructs");
const cdk_nag_1 = require("cdk-nag");
class Api extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { schema, vpc, cluster, clusterRole, graphqlFieldName, s3Uri } = props;
        // AWS AppSync
        const graphql = new aws_appsync_1.GraphqlApi(this, "graphql", {
            name: id,
            definition: aws_appsync_1.Definition.fromFile(schema),
            logConfig: {
                fieldLogLevel: aws_appsync_1.FieldLogLevel.ERROR,
                role: new aws_cdk_lib_1.aws_iam.Role(this, "appsync-log-role", {
                    assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal("appsync.amazonaws.com"),
                    inlinePolicies: {
                        logs: new aws_cdk_lib_1.aws_iam.PolicyDocument({
                            statements: [
                                new aws_cdk_lib_1.aws_iam.PolicyStatement({
                                    actions: [
                                        "logs:CreateLogGroup",
                                        "logs:CreateLogStream",
                                        "logs:PutLogEvents",
                                    ],
                                    resources: [
                                        `arn:aws:logs:${aws_cdk_lib_1.Stack.of(this).region}:${aws_cdk_lib_1.Stack.of(this).account}`,
                                    ],
                                }),
                            ],
                        }),
                    },
                }),
            },
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: aws_appsync_1.AuthorizationType.USER_POOL,
                    userPoolConfig: {
                        userPool: props.cognito.userPool,
                        appIdClientRegex: props.cognito.cognitoParams.userPoolClientId,
                        defaultAction: aws_appsync_1.UserPoolDefaultAction.ALLOW,
                    },
                },
            },
            xrayEnabled: true,
        });
        this.graphqlUrl = graphql.graphqlUrl;
        this.graphqlApiId = graphql.apiId;
        this.lambdaFunctionNames = {};
        const lambdaRole = new aws_cdk_lib_1.aws_iam.Role(this, "lambdaRole", {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
        });
        lambdaRole.addToPrincipalPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            resources: ["*"],
            actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "ec2:CreateNetworkInterface",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DescribeSubnets",
                "ec2:DeleteNetworkInterface",
                "ec2:AssignPrivateIpAddresses",
                "ec2:UnassignPrivateIpAddresses",
            ],
        }));
        cluster.grantConnect(lambdaRole);
        // AWS Lambda for graph application
        const NodejsFunctionBaseProps = {
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_20_X,
            // entry: `./api/lambda/${lambdaName}.ts`,
            depsLockFilePath: "./api/lambda/package-lock.json",
            architecture: aws_cdk_lib_1.aws_lambda.Architecture.ARM_64,
            timeout: aws_cdk_lib_1.Duration.minutes(1),
            tracing: aws_cdk_lib_1.aws_lambda.Tracing.ACTIVE,
            role: lambdaRole,
            vpc: vpc,
            vpcSubnets: {
                subnets: vpc.isolatedSubnets,
            },
            bundling: {
                nodeModules: ["gremlin", "gremlin-aws-sigv4"],
            },
        };
        const queryFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, "queryFn", {
            ...NodejsFunctionBaseProps,
            entry: "./api/lambda/queryGraph.ts",
            environment: {
                NEPTUNE_ENDPOINT: cluster.clusterReadEndpoint.hostname,
                NEPTUNE_PORT: cluster.clusterReadEndpoint.port.toString(),
            },
        });
        this.lambdaFunctionNames["queryFn"] = queryFn.functionName;
        graphql.grantQuery(queryFn);
        queryFn.connections.allowTo(cluster, aws_cdk_lib_1.aws_ec2.Port.tcp(8182));
        // AI Query Lambda (Bedrock + Neptune)
        const aiQueryRole = new aws_cdk_lib_1.aws_iam.Role(this, "aiQueryRole", {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
        });
        aiQueryRole.addToPrincipalPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            resources: ["*"],
            actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "ec2:CreateNetworkInterface",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DescribeSubnets",
                "ec2:DeleteNetworkInterface",
                "ec2:AssignPrivateIpAddresses",
                "ec2:UnassignPrivateIpAddresses",
            ],
        }));
        aiQueryRole.addToPrincipalPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            resources: [
                `arn:aws:bedrock:${aws_cdk_lib_1.Stack.of(this).region}::foundation-model/*`,
            ],
            actions: ["bedrock:InvokeModel", "bedrock:Converse"],
        }));
        cluster.grantConnect(aiQueryRole);
        const aiQueryFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, "aiQueryFn", {
            ...NodejsFunctionBaseProps,
            entry: "./api/lambda/aiQuery.ts",
            role: aiQueryRole,
            timeout: aws_cdk_lib_1.Duration.minutes(2),
            environment: {
                NEPTUNE_ENDPOINT: cluster.clusterReadEndpoint.hostname,
                NEPTUNE_PORT: cluster.clusterReadEndpoint.port.toString(),
                BEDROCK_REGION: aws_cdk_lib_1.Stack.of(this).region,
                MODEL_ID: "amazon.nova-lite-v1:0",
            },
            bundling: {
                nodeModules: [
                    "gremlin",
                    "gremlin-aws-sigv4",
                    "@aws-sdk/client-bedrock-runtime",
                ],
            },
            vpcSubnets: {
                subnets: vpc.isolatedSubnets,
            },
        });
        this.lambdaFunctionNames["aiQueryFn"] = aiQueryFn.functionName;
        graphql.grantQuery(aiQueryFn);
        aiQueryFn.connections.allowTo(cluster, aws_cdk_lib_1.aws_ec2.Port.tcp(8182));
        const mutationFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, "mutationFn", {
            ...NodejsFunctionBaseProps,
            entry: "./api/lambda/mutationGraph.ts",
            environment: {
                NEPTUNE_ENDPOINT: cluster.clusterEndpoint.hostname,
                NEPTUNE_PORT: cluster.clusterEndpoint.port.toString(),
            },
        });
        this.lambdaFunctionNames["mutationFn"] = mutationFn.functionName;
        graphql.grantMutation(mutationFn);
        mutationFn.connections.allowTo(cluster, aws_cdk_lib_1.aws_ec2.Port.tcp(8182));
        // Function URL
        const bulkLoadFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, "bulkLoadFn", {
            ...NodejsFunctionBaseProps,
            entry: "./api/lambda/functionUrl/index.ts",
            depsLockFilePath: "./api/lambda/functionUrl/package-lock.json",
            environment: {
                NEPTUNE_ENDPOINT: cluster.clusterEndpoint.hostname,
                NEPTUNE_PORT: cluster.clusterEndpoint.port.toString(),
                VERTEX: s3Uri.vertex,
                EDGE: s3Uri.edge,
                ROLE_ARN: clusterRole.roleArn,
            },
            vpcSubnets: {
                subnets: vpc.publicSubnets,
            },
            bundling: {
                nodeModules: [
                    "@smithy/signature-v4",
                    "@aws-sdk/credential-provider-node",
                    "@aws-crypto/sha256-js",
                    "@smithy/protocol-http",
                ],
            },
            allowPublicSubnet: true,
        });
        this.lambdaFunctionNames["bulkLoadFn"] = bulkLoadFn.functionName;
        bulkLoadFn.connections.allowTo(cluster, aws_cdk_lib_1.aws_ec2.Port.tcp(8182));
        const functionUrl = bulkLoadFn.addFunctionUrl({
            authType: aws_cdk_lib_1.aws_lambda.FunctionUrlAuthType.AWS_IAM,
            cors: {
                allowedMethods: [aws_cdk_lib_1.aws_lambda.HttpMethod.GET],
                allowedOrigins: ["*"],
                allowedHeaders: ["*"],
            },
            invokeMode: aws_cdk_lib_1.aws_lambda.InvokeMode.RESPONSE_STREAM,
        });
        graphqlFieldName.map((filedName) => {
            // Data sources
            let targetFn;
            if (filedName === "askGraph") {
                targetFn = aiQueryFn;
            }
            else if (filedName.startsWith("get") || filedName.startsWith("search")) {
                targetFn = queryFn;
            }
            else {
                targetFn = mutationFn;
            }
            const datasource = graphql.addLambdaDataSource(`${filedName}DS`, targetFn);
            queryFn.addEnvironment("GRAPHQL_ENDPOINT", this.graphqlUrl);
            // Resolver
            datasource.createResolver(`${filedName}Resolver`, {
                fieldName: `${filedName}`,
                typeName: filedName.startsWith("get") || filedName.startsWith("ask") || filedName.startsWith("search")
                    ? "Query"
                    : "Mutation",
                requestMappingTemplate: aws_appsync_1.MappingTemplate.fromFile(`./api/graphql/resolvers/requests/${filedName}.vtl`),
                responseMappingTemplate: aws_appsync_1.MappingTemplate.fromFile("./api/graphql/resolvers/responses/default.vtl"),
            });
        });
        // Outputs
        new aws_cdk_lib_1.CfnOutput(this, "GraphqlUrl", {
            value: this.graphqlUrl,
        });
        new aws_cdk_lib_1.CfnOutput(this, "FunctionUrl", {
            value: functionUrl.url,
        });
        // Suppressions
        cdk_nag_1.NagSuppressions.addResourceSuppressions(graphql, [
            {
                id: "AwsSolutions-IAM5",
                reason: "Datasorce role",
            },
        ], true);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(lambdaRole, [
            {
                id: "AwsSolutions-IAM5",
                reason: "Need the permission for accessing database in Vpc",
            },
        ], true);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(aiQueryRole, [
            {
                id: "AwsSolutions-IAM5",
                reason: "Need the permission for Bedrock and VPC access",
            },
        ], true);
        cdk_nag_1.NagSuppressions.addStackSuppressions(aws_cdk_lib_1.Stack.of(this), [
            {
                id: "AwsSolutions-IAM4",
                reason: "CDK managed resource",
                appliesTo: [
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                ],
            },
            {
                id: "AwsSolutions-L1",
                reason: "CDK managed resource",
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "CDK managed resource",
                appliesTo: ["Resource::*"],
            },
        ]);
    }
}
exports.Api = Api;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQVFxQjtBQUNyQix5REFPaUM7QUFDakMsMkNBQXVDO0FBSXZDLHFDQUEwQztBQWtCMUMsTUFBYSxHQUFJLFNBQVEsc0JBQVM7SUFLaEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLEdBQ2xFLEtBQUssQ0FBQztRQUVSLGNBQWM7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLHdCQUFVLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUM5QyxJQUFJLEVBQUUsRUFBRTtZQUNSLFVBQVUsRUFBRSx3QkFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDdkMsU0FBUyxFQUFFO2dCQUNULGFBQWEsRUFBRSwyQkFBYSxDQUFDLEtBQUs7Z0JBQ2xDLElBQUksRUFBRSxJQUFJLHFCQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtvQkFDL0MsU0FBUyxFQUFFLElBQUkscUJBQU8sQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQztvQkFDaEUsY0FBYyxFQUFFO3dCQUNkLElBQUksRUFBRSxJQUFJLHFCQUFPLENBQUMsY0FBYyxDQUFDOzRCQUMvQixVQUFVLEVBQUU7Z0NBQ1YsSUFBSSxxQkFBTyxDQUFDLGVBQWUsQ0FBQztvQ0FDMUIsT0FBTyxFQUFFO3dDQUNQLHFCQUFxQjt3Q0FDckIsc0JBQXNCO3dDQUN0QixtQkFBbUI7cUNBQ3BCO29DQUNELFNBQVMsRUFBRTt3Q0FDVCxnQkFBZ0IsbUJBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUNuQyxtQkFB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c0JBQXNCO2dCQUM5QixTQUFTLEVBQUUsQ0FBQyxhQUFhLENBQUM7YUFDM0I7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1VEQsa0JBNFRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgU3RhY2ssXG4gIER1cmF0aW9uLFxuICBhd3NfZWMyLFxuICBhd3NfbGFtYmRhX25vZGVqcyxcbiAgYXdzX2xhbWJkYSxcbiAgYXdzX2lhbSxcbiAgQ2ZuT3V0cHV0LFxufSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7XG4gIEF1dGhvcml6YXRpb25UeXBlLFxuICBEZWZpbml0aW9uLFxuICBGaWVsZExvZ0xldmVsLFxuICBHcmFwaHFsQXBpLFxuICBNYXBwaW5nVGVtcGxhdGUsXG4gIFVzZXJQb29sRGVmYXVsdEFjdGlvbixcbn0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1hcHBzeW5jXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG5pbXBvcnQgKiBhcyBuZXB0dW5lIGZyb20gXCJAYXdzLWNkay9hd3MtbmVwdHVuZS1hbHBoYVwiO1xuXG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuaW1wb3J0IHsgQ29nbml0byB9IGZyb20gXCIuL2NvZ25pdG9cIjtcblxuZXhwb3J0IGludGVyZmFjZSBCYWNrZW5kQXBpUHJvcHMge1xuICBzY2hlbWE6IHN0cmluZztcbiAgY29nbml0bzogQ29nbml0bztcbiAgdnBjOiBhd3NfZWMyLlZwYztcbiAgY2x1c3RlcjogbmVwdHVuZS5EYXRhYmFzZUNsdXN0ZXI7XG4gIGNsdXN0ZXJSb2xlOiBhd3NfaWFtLlJvbGU7XG4gIGdyYXBocWxGaWVsZE5hbWU6IHN0cmluZ1tdO1xuICBzM1VyaTogUzNVcmk7XG59XG5cbmV4cG9ydCB0eXBlIFMzVXJpID0ge1xuICB2ZXJ0ZXg6IHN0cmluZztcbiAgZWRnZTogc3RyaW5nO1xufTtcblxuZXhwb3J0IGNsYXNzIEFwaSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHJlYWRvbmx5IGdyYXBocWxVcmw6IHN0cmluZztcbiAgcmVhZG9ubHkgZ3JhcGhxbEFwaUlkOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGxhbWJkYUZ1bmN0aW9uTmFtZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEJhY2tlbmRBcGlQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IHNjaGVtYSwgdnBjLCBjbHVzdGVyLCBjbHVzdGVyUm9sZSwgZ3JhcGhxbEZpZWxkTmFtZSwgczNVcmkgfSA9XG4gICAgICBwcm9wcztcblxuICAgIC8vIEFXUyBBcHBTeW5jXG4gICAgY29uc3QgZ3JhcGhxbCA9IG5ldyBHcmFwaHFsQXBpKHRoaXMsIFwiZ3JhcGhxbFwiLCB7XG4gICAgICBuYW1lOiBpZCxcbiAgICAgIGRlZmluaXRpb246IERlZmluaXRpb24uZnJvbUZpbGUoc2NoZW1hKSxcbiAgICAgIGxvZ0NvbmZpZzoge1xuICAgICAgICBmaWVsZExvZ0xldmVsOiBGaWVsZExvZ0xldmVsLkVSUk9SLFxuICAgICAgICByb2xlOiBuZXcgYXdzX2lhbS5Sb2xlKHRoaXMsIFwiYXBwc3luYy1sb2ctcm9sZVwiLCB7XG4gICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKFwiYXBwc3luYy5hbWF6b25hd3MuY29tXCIpLFxuICAgICAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgICAgICBsb2dzOiBuZXcgYXdzX2lhbS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIixcbiAgICAgICAgICAgICAgICAgICAgXCJsb2dzOkNyZWF0ZUxvZ1N0cmVhbVwiLFxuICAgICAgICAgICAgICAgICAgICBcImxvZ3M6UHV0TG9nRXZlbnRzXCIsXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgICAgIGBhcm46YXdzOmxvZ3M6JHtTdGFjay5vZih0aGlzKS5yZWdpb259OiR7XG4gICAgICAgICAgICAgICAgICAgICAgU3RhY2sub2YodGhpcykuYWNjb3VudFxuICAgICAgICAgICAgICAgICAgICB9YCxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgICBhdXRob3JpemF0aW9uQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHRBdXRob3JpemF0aW9uOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IEF1dGhvcml6YXRpb25UeXBlLlVTRVJfUE9PTCxcbiAgICAgICAgICB1c2VyUG9vbENvbmZpZzoge1xuICAgICAgICAgICAgdXNlclBvb2w6IHByb3BzLmNvZ25pdG8udXNlclBvb2wsXG4gICAgICAgICAgICBhcHBJZENsaWVudFJlZ2V4OiBwcm9wcy5jb2duaXRvLmNvZ25pdG9QYXJhbXMudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgICAgIGRlZmF1bHRBY3Rpb246IFVzZXJQb29sRGVmYXVsdEFjdGlvbi5BTExPVyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHhyYXlFbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgdGhpcy5ncmFwaHFsVXJsID0gZ3JhcGhxbC5ncmFwaHFsVXJsO1xuICAgIHRoaXMuZ3JhcGhxbEFwaUlkID0gZ3JhcGhxbC5hcGlJZDtcbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9uTmFtZXMgPSB7fTtcblxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBuZXcgYXdzX2lhbS5Sb2xlKHRoaXMsIFwibGFtYmRhUm9sZVwiLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBhd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJsYW1iZGEuYW1hem9uYXdzLmNvbVwiKSxcbiAgICB9KTtcbiAgICBsYW1iZGFSb2xlLmFkZFRvUHJpbmNpcGFsUG9saWN5KFxuICAgICAgbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgXCJsb2dzOkNyZWF0ZUxvZ0dyb3VwXCIsXG4gICAgICAgICAgXCJsb2dzOkNyZWF0ZUxvZ1N0cmVhbVwiLFxuICAgICAgICAgIFwibG9nczpQdXRMb2dFdmVudHNcIixcbiAgICAgICAgICBcImVjMjpDcmVhdGVOZXR3b3JrSW50ZXJmYWNlXCIsXG4gICAgICAgICAgXCJlYzI6RGVzY3JpYmVOZXR3b3JrSW50ZXJmYWNlc1wiLFxuICAgICAgICAgIFwiZWMyOkRlc2NyaWJlU3VibmV0c1wiLFxuICAgICAgICAgIFwiZWMyOkRlbGV0ZU5ldHdvcmtJbnRlcmZhY2VcIixcbiAgICAgICAgICBcImVjMjpBc3NpZ25Qcml2YXRlSXBBZGRyZXNzZXNcIixcbiAgICAgICAgICBcImVjMjpVbmFzc2lnblByaXZhdGVJcEFkZHJlc3Nlc1wiLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuICAgIGNsdXN0ZXIuZ3JhbnRDb25uZWN0KGxhbWJkYVJvbGUpO1xuXG4gICAgLy8gQVdTIExhbWJkYSBmb3IgZ3JhcGggYXBwbGljYXRpb25cbiAgICBjb25zdCBOb2RlanNGdW5jdGlvbkJhc2VQcm9wczogYXdzX2xhbWJkYV9ub2RlanMuTm9kZWpzRnVuY3Rpb25Qcm9wcyA9IHtcbiAgICAgIHJ1bnRpbWU6IGF3c19sYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcblxuICAgICAgLy8gZW50cnk6IGAuL2FwaS9sYW1iZGEvJHtsYW1iZGFOYW1lfS50c2AsXG4gICAgICBkZXBzTG9ja0ZpbGVQYXRoOiBcIi4vYXBpL2xhbWJkYS9wYWNrYWdlLWxvY2suanNvblwiLFxuICAgICAgYXJjaGl0ZWN0dXJlOiBhd3NfbGFtYmRhLkFyY2hpdGVjdHVyZS5BUk1fNjQsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDEpLFxuICAgICAgdHJhY2luZzogYXdzX2xhbWJkYS5UcmFjaW5nLkFDVElWRSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB2cGM6IHZwYyxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0czogdnBjLmlzb2xhdGVkU3VibmV0cyxcbiAgICAgIH0sXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBub2RlTW9kdWxlczogW1wiZ3JlbWxpblwiLCBcImdyZW1saW4tYXdzLXNpZ3Y0XCJdLFxuICAgICAgfSxcbiAgICB9O1xuICAgIGNvbnN0IHF1ZXJ5Rm4gPSBuZXcgYXdzX2xhbWJkYV9ub2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgXCJxdWVyeUZuXCIsIHtcbiAgICAgIC4uLk5vZGVqc0Z1bmN0aW9uQmFzZVByb3BzLFxuICAgICAgZW50cnk6IFwiLi9hcGkvbGFtYmRhL3F1ZXJ5R3JhcGgudHNcIixcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE5FUFRVTkVfRU5EUE9JTlQ6IGNsdXN0ZXIuY2x1c3RlclJlYWRFbmRwb2ludC5ob3N0bmFtZSxcbiAgICAgICAgTkVQVFVORV9QT1JUOiBjbHVzdGVyLmNsdXN0ZXJSZWFkRW5kcG9pbnQucG9ydC50b1N0cmluZygpLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9uTmFtZXNbXCJxdWVyeUZuXCJdID0gcXVlcnlGbi5mdW5jdGlvbk5hbWU7XG4gICAgZ3JhcGhxbC5ncmFudFF1ZXJ5KHF1ZXJ5Rm4pO1xuICAgIHF1ZXJ5Rm4uY29ubmVjdGlvbnMuYWxsb3dUbyhjbHVzdGVyLCBhd3NfZWMyLlBvcnQudGNwKDgxODIpKTtcblxuICAgIC8vIEFJIFF1ZXJ5IExhbWJkYSAoQmVkcm9jayArIE5lcHR1bmUpXG4gICAgY29uc3QgYWlRdWVyeVJvbGUgPSBuZXcgYXdzX2lhbS5Sb2xlKHRoaXMsIFwiYWlRdWVyeVJvbGVcIiwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKFwibGFtYmRhLmFtYXpvbmF3cy5jb21cIiksXG4gICAgfSk7XG4gICAgYWlRdWVyeVJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIixcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nU3RyZWFtXCIsXG4gICAgICAgICAgXCJsb2dzOlB1dExvZ0V2ZW50c1wiLFxuICAgICAgICAgIFwiZWMyOkNyZWF0ZU5ldHdvcmtJbnRlcmZhY2VcIixcbiAgICAgICAgICBcImVjMjpEZXNjcmliZU5ldHdvcmtJbnRlcmZhY2VzXCIsXG4gICAgICAgICAgXCJlYzI6RGVzY3JpYmVTdWJuZXRzXCIsXG4gICAgICAgICAgXCJlYzI6RGVsZXRlTmV0d29ya0ludGVyZmFjZVwiLFxuICAgICAgICAgIFwiZWMyOkFzc2lnblByaXZhdGVJcEFkZHJlc3Nlc1wiLFxuICAgICAgICAgIFwiZWMyOlVuYXNzaWduUHJpdmF0ZUlwQWRkcmVzc2VzXCIsXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG4gICAgYWlRdWVyeVJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOmF3czpiZWRyb2NrOiR7U3RhY2sub2YodGhpcykucmVnaW9ufTo6Zm91bmRhdGlvbi1tb2RlbC8qYCxcbiAgICAgICAgXSxcbiAgICAgICAgYWN0aW9uczogW1wiYmVkcm9jazpJbnZva2VNb2RlbFwiLCBcImJlZHJvY2s6Q29udmVyc2VcIl0sXG4gICAgICB9KVxuICAgICk7XG4gICAgY2x1c3Rlci5ncmFudENvbm5lY3QoYWlRdWVyeVJvbGUpO1xuXG4gICAgY29uc3QgYWlRdWVyeUZuID0gbmV3IGF3c19sYW1iZGFfbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKFxuICAgICAgdGhpcyxcbiAgICAgIFwiYWlRdWVyeUZuXCIsXG4gICAgICB7XG4gICAgICAgIC4uLk5vZGVqc0Z1bmN0aW9uQmFzZVByb3BzLFxuICAgICAgICBlbnRyeTogXCIuL2FwaS9sYW1iZGEvYWlRdWVyeS50c1wiLFxuICAgICAgICByb2xlOiBhaVF1ZXJ5Um9sZSxcbiAgICAgICAgdGltZW91dDogRHVyYXRpb24ubWludXRlcygyKSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBORVBUVU5FX0VORFBPSU5UOiBjbHVzdGVyLmNsdXN0ZXJSZWFkRW5kcG9pbnQuaG9zdG5hbWUsXG4gICAgICAgICAgTkVQVFVORV9QT1JUOiBjbHVzdGVyLmNsdXN0ZXJSZWFkRW5kcG9pbnQucG9ydC50b1N0cmluZygpLFxuICAgICAgICAgIEJFRFJPQ0tfUkVHSU9OOiBTdGFjay5vZih0aGlzKS5yZWdpb24sXG4gICAgICAgICAgTU9ERUxfSUQ6IFwiYW1hem9uLm5vdmEtbGl0ZS12MTowXCIsXG4gICAgICAgIH0sXG4gICAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgICAgbm9kZU1vZHVsZXM6IFtcbiAgICAgICAgICAgIFwiZ3JlbWxpblwiLFxuICAgICAgICAgICAgXCJncmVtbGluLWF3cy1zaWd2NFwiLFxuICAgICAgICAgICAgXCJAYXdzLXNkay9jbGllbnQtYmVkcm9jay1ydW50aW1lXCIsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICAgIHN1Ym5ldHM6IHZwYy5pc29sYXRlZFN1Ym5ldHMsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9uTmFtZXNbXCJhaVF1ZXJ5Rm5cIl0gPSBhaVF1ZXJ5Rm4uZnVuY3Rpb25OYW1lO1xuICAgIGdyYXBocWwuZ3JhbnRRdWVyeShhaVF1ZXJ5Rm4pO1xuICAgIGFpUXVlcnlGbi5jb25uZWN0aW9ucy5hbGxvd1RvKGNsdXN0ZXIsIGF3c19lYzIuUG9ydC50Y3AoODE4MikpO1xuXG4gICAgY29uc3QgbXV0YXRpb25GbiA9IG5ldyBhd3NfbGFtYmRhX25vZGVqcy5Ob2RlanNGdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICBcIm11dGF0aW9uRm5cIixcbiAgICAgIHtcbiAgICAgICAgLi4uTm9kZWpzRnVuY3Rpb25CYXNlUHJvcHMsXG4gICAgICAgIGVudHJ5OiBcIi4vYXBpL2xhbWJkYS9tdXRhdGlvbkdyYXBoLnRzXCIsXG4gICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgTkVQVFVORV9FTkRQT0lOVDogY2x1c3Rlci5jbHVzdGVyRW5kcG9pbnQuaG9zdG5hbWUsXG4gICAgICAgICAgTkVQVFVORV9QT1JUOiBjbHVzdGVyLmNsdXN0ZXJFbmRwb2ludC5wb3J0LnRvU3RyaW5nKCksXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9uTmFtZXNbXCJtdXRhdGlvbkZuXCJdID0gbXV0YXRpb25Gbi5mdW5jdGlvbk5hbWU7XG4gICAgZ3JhcGhxbC5ncmFudE11dGF0aW9uKG11dGF0aW9uRm4pO1xuICAgIG11dGF0aW9uRm4uY29ubmVjdGlvbnMuYWxsb3dUbyhjbHVzdGVyLCBhd3NfZWMyLlBvcnQudGNwKDgxODIpKTtcblxuICAgIC8vIEZ1bmN0aW9uIFVSTFxuXG4gICAgY29uc3QgYnVsa0xvYWRGbiA9IG5ldyBhd3NfbGFtYmRhX25vZGVqcy5Ob2RlanNGdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICBcImJ1bGtMb2FkRm5cIixcbiAgICAgIHtcbiAgICAgICAgLi4uTm9kZWpzRnVuY3Rpb25CYXNlUHJvcHMsXG4gICAgICAgIGVudHJ5OiBcIi4vYXBpL2xhbWJkYS9mdW5jdGlvblVybC9pbmRleC50c1wiLFxuICAgICAgICBkZXBzTG9ja0ZpbGVQYXRoOiBcIi4vYXBpL2xhbWJkYS9mdW5jdGlvblVybC9wYWNrYWdlLWxvY2suanNvblwiLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIE5FUFRVTkVfRU5EUE9JTlQ6IGNsdXN0ZXIuY2x1c3RlckVuZHBvaW50Lmhvc3RuYW1lLFxuICAgICAgICAgIE5FUFRVTkVfUE9SVDogY2x1c3Rlci5jbHVzdGVyRW5kcG9pbnQucG9ydC50b1N0cmluZygpLFxuICAgICAgICAgIFZFUlRFWDogczNVcmkudmVydGV4LFxuICAgICAgICAgIEVER0U6IHMzVXJpLmVkZ2UsXG4gICAgICAgICAgUk9MRV9BUk46IGNsdXN0ZXJSb2xlLnJvbGVBcm4sXG4gICAgICAgIH0sXG4gICAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgICBzdWJuZXRzOiB2cGMucHVibGljU3VibmV0cyxcbiAgICAgICAgfSxcbiAgICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgICBub2RlTW9kdWxlczogW1xuICAgICAgICAgICAgXCJAc21pdGh5L3NpZ25hdHVyZS12NFwiLFxuICAgICAgICAgICAgXCJAYXdzLXNkay9jcmVkZW50aWFsLXByb3ZpZGVyLW5vZGVcIixcbiAgICAgICAgICAgIFwiQGF3cy1jcnlwdG8vc2hhMjU2LWpzXCIsXG4gICAgICAgICAgICBcIkBzbWl0aHkvcHJvdG9jb2wtaHR0cFwiLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGFsbG93UHVibGljU3VibmV0OiB0cnVlLFxuICAgICAgfVxuICAgICk7XG4gICAgdGhpcy5sYW1iZGFGdW5jdGlvbk5hbWVzW1wiYnVsa0xvYWRGblwiXSA9IGJ1bGtMb2FkRm4uZnVuY3Rpb25OYW1lO1xuICAgIGJ1bGtMb2FkRm4uY29ubmVjdGlvbnMuYWxsb3dUbyhjbHVzdGVyLCBhd3NfZWMyLlBvcnQudGNwKDgxODIpKTtcblxuICAgIGNvbnN0IGZ1bmN0aW9uVXJsID0gYnVsa0xvYWRGbi5hZGRGdW5jdGlvblVybCh7XG4gICAgICBhdXRoVHlwZTogYXdzX2xhbWJkYS5GdW5jdGlvblVybEF1dGhUeXBlLkFXU19JQU0sXG4gICAgICBjb3JzOiB7XG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbYXdzX2xhbWJkYS5IdHRwTWV0aG9kLkdFVF0sXG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbXCIqXCJdLFxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXSxcbiAgICAgIH0sXG5cbiAgICAgIGludm9rZU1vZGU6IGF3c19sYW1iZGEuSW52b2tlTW9kZS5SRVNQT05TRV9TVFJFQU0sXG4gICAgfSk7XG5cbiAgICBncmFwaHFsRmllbGROYW1lLm1hcCgoZmlsZWROYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgIC8vIERhdGEgc291cmNlc1xuICAgICAgbGV0IHRhcmdldEZuO1xuICAgICAgaWYgKGZpbGVkTmFtZSA9PT0gXCJhc2tHcmFwaFwiKSB7XG4gICAgICAgIHRhcmdldEZuID0gYWlRdWVyeUZuO1xuICAgICAgfSBlbHNlIGlmIChmaWxlZE5hbWUuc3RhcnRzV2l0aChcImdldFwiKSB8fCBmaWxlZE5hbWUuc3RhcnRzV2l0aChcInNlYXJjaFwiKSkge1xuICAgICAgICB0YXJnZXRGbiA9IHF1ZXJ5Rm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRGbiA9IG11dGF0aW9uRm47XG4gICAgICB9XG4gICAgICBjb25zdCBkYXRhc291cmNlID0gZ3JhcGhxbC5hZGRMYW1iZGFEYXRhU291cmNlKFxuICAgICAgICBgJHtmaWxlZE5hbWV9RFNgLFxuICAgICAgICB0YXJnZXRGblxuICAgICAgKTtcbiAgICAgIHF1ZXJ5Rm4uYWRkRW52aXJvbm1lbnQoXCJHUkFQSFFMX0VORFBPSU5UXCIsIHRoaXMuZ3JhcGhxbFVybCk7XG4gICAgICAvLyBSZXNvbHZlclxuICAgICAgZGF0YXNvdXJjZS5jcmVhdGVSZXNvbHZlcihgJHtmaWxlZE5hbWV9UmVzb2x2ZXJgLCB7XG4gICAgICAgIGZpZWxkTmFtZTogYCR7ZmlsZWROYW1lfWAsXG4gICAgICAgIHR5cGVOYW1lOiBmaWxlZE5hbWUuc3RhcnRzV2l0aChcImdldFwiKSB8fCBmaWxlZE5hbWUuc3RhcnRzV2l0aChcImFza1wiKSB8fCBmaWxlZE5hbWUuc3RhcnRzV2l0aChcInNlYXJjaFwiKVxuICAgICAgICAgID8gXCJRdWVyeVwiXG4gICAgICAgICAgOiBcIk11dGF0aW9uXCIsXG4gICAgICAgIHJlcXVlc3RNYXBwaW5nVGVtcGxhdGU6IE1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZShcbiAgICAgICAgICBgLi9hcGkvZ3JhcGhxbC9yZXNvbHZlcnMvcmVxdWVzdHMvJHtmaWxlZE5hbWV9LnZ0bGBcbiAgICAgICAgKSxcbiAgICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IE1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZShcbiAgICAgICAgICBcIi4vYXBpL2dyYXBocWwvcmVzb2x2ZXJzL3Jlc3BvbnNlcy9kZWZhdWx0LnZ0bFwiXG4gICAgICAgICksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiR3JhcGhxbFVybFwiLCB7XG4gICAgICB2YWx1ZTogdGhpcy5ncmFwaHFsVXJsLFxuICAgIH0pO1xuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJGdW5jdGlvblVybFwiLCB7XG4gICAgICB2YWx1ZTogZnVuY3Rpb25VcmwudXJsLFxuICAgIH0pO1xuXG4gICAgLy8gU3VwcHJlc3Npb25zXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgZ3JhcGhxbCxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgcmVhc29uOiBcIkRhdGFzb3JjZSByb2xlXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBsYW1iZGFSb2xlLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246IFwiTmVlZCB0aGUgcGVybWlzc2lvbiBmb3IgYWNjZXNzaW5nIGRhdGFiYXNlIGluIFZwY1wiLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWVcbiAgICApO1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIGFpUXVlcnlSb2xlLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246IFwiTmVlZCB0aGUgcGVybWlzc2lvbiBmb3IgQmVkcm9jayBhbmQgVlBDIGFjY2Vzc1wiLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWVcbiAgICApO1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRTdGFja1N1cHByZXNzaW9ucyhTdGFjay5vZih0aGlzKSwgW1xuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICByZWFzb246IFwiQ0RLIG1hbmFnZWQgcmVzb3VyY2VcIixcbiAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgXCJQb2xpY3k6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmlhbTo6YXdzOnBvbGljeS9zZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtTDFcIixcbiAgICAgICAgcmVhc29uOiBcIkNESyBtYW5hZ2VkIHJlc291cmNlXCIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICByZWFzb246IFwiQ0RLIG1hbmFnZWQgcmVzb3VyY2VcIixcbiAgICAgICAgYXBwbGllc1RvOiBbXCJSZXNvdXJjZTo6KlwiXSxcbiAgICAgIH0sXG4gICAgXSk7XG4gIH1cbn1cbiJdfQ==