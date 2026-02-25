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
            else if (filedName.startsWith("get")) {
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
                typeName: filedName.startsWith("get") || filedName.startsWith("ask")
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQVFxQjtBQUNyQix5REFPaUM7QUFDakMsMkNBQXVDO0FBSXZDLHFDQUEwQztBQWtCMUMsTUFBYSxHQUFJLFNBQVEsc0JBQVM7SUFLaEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLEdBQ2xFLEtBQUssQ0FBQztRQUVSLGNBQWM7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLHdCQUFVLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUM5QyxJQUFJLEVBQUUsRUFBRTtZQUNSLFVBQVUsRUFBRSx3QkFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDdkMsU0FBUyxFQUFFO2dCQUNULGFBQWEsRUFBRSwyQkFBYSxDQUFDLEtBQUs7Z0JBQ2xDLElBQUksRUFBRSxJQUFJLHFCQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtvQkFDL0MsU0FBUyxFQUFFLElBQUkscUJBQU8sQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQztvQkFDaEUsY0FBYyxFQUFFO3dCQUNkLElBQUksRUFBRSxJQUFJLHFCQUFPLENBQUMsY0FBYyxDQUFDOzRCQUMvQixVQUFVLEVBQUU7Z0NBQ1YsSUFBSSxxQkFBTyxDQUFDLGVBQWUsQ0FBQztvQ0FDMUIsT0FBTyxFQUFFO3dDQUNQLHFCQUFxQjt3Q0FDckIsc0JBQXNCO3dDQUN0QixtQkFBbUI7cUNBQ3BCO29DQUNELFNBQVMsRUFBRTt3Q0FDVCxnQkFBZ0IsbUJBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUNuQyxtQkFB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Q0FDRjtBQTVURCxrQkE0VEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBTdGFjayxcbiAgRHVyYXRpb24sXG4gIGF3c19lYzIsXG4gIGF3c19sYW1iZGFfbm9kZWpzLFxuICBhd3NfbGFtYmRhLFxuICBhd3NfaWFtLFxuICBDZm5PdXRwdXQsXG59IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHtcbiAgQXV0aG9yaXphdGlvblR5cGUsXG4gIERlZmluaXRpb24sXG4gIEZpZWxkTG9nTGV2ZWwsXG4gIEdyYXBocWxBcGksXG4gIE1hcHBpbmdUZW1wbGF0ZSxcbiAgVXNlclBvb2xEZWZhdWx0QWN0aW9uLFxufSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwcHN5bmNcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5cbmltcG9ydCAqIGFzIG5lcHR1bmUgZnJvbSBcIkBhd3MtY2RrL2F3cy1uZXB0dW5lLWFscGhhXCI7XG5cbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5pbXBvcnQgeyBDb2duaXRvIH0gZnJvbSBcIi4vY29nbml0b1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJhY2tlbmRBcGlQcm9wcyB7XG4gIHNjaGVtYTogc3RyaW5nO1xuICBjb2duaXRvOiBDb2duaXRvO1xuICB2cGM6IGF3c19lYzIuVnBjO1xuICBjbHVzdGVyOiBuZXB0dW5lLkRhdGFiYXNlQ2x1c3RlcjtcbiAgY2x1c3RlclJvbGU6IGF3c19pYW0uUm9sZTtcbiAgZ3JhcGhxbEZpZWxkTmFtZTogc3RyaW5nW107XG4gIHMzVXJpOiBTM1VyaTtcbn1cblxuZXhwb3J0IHR5cGUgUzNVcmkgPSB7XG4gIHZlcnRleDogc3RyaW5nO1xuICBlZGdlOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgY2xhc3MgQXBpIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcmVhZG9ubHkgZ3JhcGhxbFVybDogc3RyaW5nO1xuICByZWFkb25seSBncmFwaHFsQXBpSWQ6IHN0cmluZztcbiAgcmVhZG9ubHkgbGFtYmRhRnVuY3Rpb25OYW1lczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQmFja2VuZEFwaVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHsgc2NoZW1hLCB2cGMsIGNsdXN0ZXIsIGNsdXN0ZXJSb2xlLCBncmFwaHFsRmllbGROYW1lLCBzM1VyaSB9ID1cbiAgICAgIHByb3BzO1xuXG4gICAgLy8gQVdTIEFwcFN5bmNcbiAgICBjb25zdCBncmFwaHFsID0gbmV3IEdyYXBocWxBcGkodGhpcywgXCJncmFwaHFsXCIsIHtcbiAgICAgIG5hbWU6IGlkLFxuICAgICAgZGVmaW5pdGlvbjogRGVmaW5pdGlvbi5mcm9tRmlsZShzY2hlbWEpLFxuICAgICAgbG9nQ29uZmlnOiB7XG4gICAgICAgIGZpZWxkTG9nTGV2ZWw6IEZpZWxkTG9nTGV2ZWwuRVJST1IsXG4gICAgICAgIHJvbGU6IG5ldyBhd3NfaWFtLlJvbGUodGhpcywgXCJhcHBzeW5jLWxvZy1yb2xlXCIsIHtcbiAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBhd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJhcHBzeW5jLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgIGxvZ3M6IG5ldyBhd3NfaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dHcm91cFwiLFxuICAgICAgICAgICAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nU3RyZWFtXCIsXG4gICAgICAgICAgICAgICAgICAgIFwibG9nczpQdXRMb2dFdmVudHNcIixcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgYGFybjphd3M6bG9nczoke1N0YWNrLm9mKHRoaXMpLnJlZ2lvbn06JHtcbiAgICAgICAgICAgICAgICAgICAgICBTdGFjay5vZih0aGlzKS5hY2NvdW50XG4gICAgICAgICAgICAgICAgICAgIH1gLFxuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICAgIGF1dGhvcml6YXRpb25Db25maWc6IHtcbiAgICAgICAgZGVmYXVsdEF1dGhvcml6YXRpb246IHtcbiAgICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogQXV0aG9yaXphdGlvblR5cGUuVVNFUl9QT09MLFxuICAgICAgICAgIHVzZXJQb29sQ29uZmlnOiB7XG4gICAgICAgICAgICB1c2VyUG9vbDogcHJvcHMuY29nbml0by51c2VyUG9vbCxcbiAgICAgICAgICAgIGFwcElkQ2xpZW50UmVnZXg6IHByb3BzLmNvZ25pdG8uY29nbml0b1BhcmFtcy51c2VyUG9vbENsaWVudElkLFxuICAgICAgICAgICAgZGVmYXVsdEFjdGlvbjogVXNlclBvb2xEZWZhdWx0QWN0aW9uLkFMTE9XLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgeHJheUVuYWJsZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICB0aGlzLmdyYXBocWxVcmwgPSBncmFwaHFsLmdyYXBocWxVcmw7XG4gICAgdGhpcy5ncmFwaHFsQXBpSWQgPSBncmFwaHFsLmFwaUlkO1xuICAgIHRoaXMubGFtYmRhRnVuY3Rpb25OYW1lcyA9IHt9O1xuXG4gICAgY29uc3QgbGFtYmRhUm9sZSA9IG5ldyBhd3NfaWFtLlJvbGUodGhpcywgXCJsYW1iZGFSb2xlXCIsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGF3c19pYW0uU2VydmljZVByaW5jaXBhbChcImxhbWJkYS5hbWF6b25hd3MuY29tXCIpLFxuICAgIH0pO1xuICAgIGxhbWJkYVJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIixcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nU3RyZWFtXCIsXG4gICAgICAgICAgXCJsb2dzOlB1dExvZ0V2ZW50c1wiLFxuICAgICAgICAgIFwiZWMyOkNyZWF0ZU5ldHdvcmtJbnRlcmZhY2VcIixcbiAgICAgICAgICBcImVjMjpEZXNjcmliZU5ldHdvcmtJbnRlcmZhY2VzXCIsXG4gICAgICAgICAgXCJlYzI6RGVzY3JpYmVTdWJuZXRzXCIsXG4gICAgICAgICAgXCJlYzI6RGVsZXRlTmV0d29ya0ludGVyZmFjZVwiLFxuICAgICAgICAgIFwiZWMyOkFzc2lnblByaXZhdGVJcEFkZHJlc3Nlc1wiLFxuICAgICAgICAgIFwiZWMyOlVuYXNzaWduUHJpdmF0ZUlwQWRkcmVzc2VzXCIsXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG4gICAgY2x1c3Rlci5ncmFudENvbm5lY3QobGFtYmRhUm9sZSk7XG5cbiAgICAvLyBBV1MgTGFtYmRhIGZvciBncmFwaCBhcHBsaWNhdGlvblxuICAgIGNvbnN0IE5vZGVqc0Z1bmN0aW9uQmFzZVByb3BzOiBhd3NfbGFtYmRhX25vZGVqcy5Ob2RlanNGdW5jdGlvblByb3BzID0ge1xuICAgICAgcnVudGltZTogYXdzX2xhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuXG4gICAgICAvLyBlbnRyeTogYC4vYXBpL2xhbWJkYS8ke2xhbWJkYU5hbWV9LnRzYCxcbiAgICAgIGRlcHNMb2NrRmlsZVBhdGg6IFwiLi9hcGkvbGFtYmRhL3BhY2thZ2UtbG9jay5qc29uXCIsXG4gICAgICBhcmNoaXRlY3R1cmU6IGF3c19sYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLm1pbnV0ZXMoMSksXG4gICAgICB0cmFjaW5nOiBhd3NfbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHZwYzogdnBjLFxuICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICBzdWJuZXRzOiB2cGMuaXNvbGF0ZWRTdWJuZXRzLFxuICAgICAgfSxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIG5vZGVNb2R1bGVzOiBbXCJncmVtbGluXCIsIFwiZ3JlbWxpbi1hd3Mtc2lndjRcIl0sXG4gICAgICB9LFxuICAgIH07XG4gICAgY29uc3QgcXVlcnlGbiA9IG5ldyBhd3NfbGFtYmRhX25vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCBcInF1ZXJ5Rm5cIiwge1xuICAgICAgLi4uTm9kZWpzRnVuY3Rpb25CYXNlUHJvcHMsXG4gICAgICBlbnRyeTogXCIuL2FwaS9sYW1iZGEvcXVlcnlHcmFwaC50c1wiLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTkVQVFVORV9FTkRQT0lOVDogY2x1c3Rlci5jbHVzdGVyUmVhZEVuZHBvaW50Lmhvc3RuYW1lLFxuICAgICAgICBORVBUVU5FX1BPUlQ6IGNsdXN0ZXIuY2x1c3RlclJlYWRFbmRwb2ludC5wb3J0LnRvU3RyaW5nKCksXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRoaXMubGFtYmRhRnVuY3Rpb25OYW1lc1tcInF1ZXJ5Rm5cIl0gPSBxdWVyeUZuLmZ1bmN0aW9uTmFtZTtcbiAgICBncmFwaHFsLmdyYW50UXVlcnkocXVlcnlGbik7XG4gICAgcXVlcnlGbi5jb25uZWN0aW9ucy5hbGxvd1RvKGNsdXN0ZXIsIGF3c19lYzIuUG9ydC50Y3AoODE4MikpO1xuXG4gICAgLy8gQUkgUXVlcnkgTGFtYmRhIChCZWRyb2NrICsgTmVwdHVuZSlcbiAgICBjb25zdCBhaVF1ZXJ5Um9sZSA9IG5ldyBhd3NfaWFtLlJvbGUodGhpcywgXCJhaVF1ZXJ5Um9sZVwiLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBhd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJsYW1iZGEuYW1hem9uYXdzLmNvbVwiKSxcbiAgICB9KTtcbiAgICBhaVF1ZXJ5Um9sZS5hZGRUb1ByaW5jaXBhbFBvbGljeShcbiAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dHcm91cFwiLFxuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dTdHJlYW1cIixcbiAgICAgICAgICBcImxvZ3M6UHV0TG9nRXZlbnRzXCIsXG4gICAgICAgICAgXCJlYzI6Q3JlYXRlTmV0d29ya0ludGVyZmFjZVwiLFxuICAgICAgICAgIFwiZWMyOkRlc2NyaWJlTmV0d29ya0ludGVyZmFjZXNcIixcbiAgICAgICAgICBcImVjMjpEZXNjcmliZVN1Ym5ldHNcIixcbiAgICAgICAgICBcImVjMjpEZWxldGVOZXR3b3JrSW50ZXJmYWNlXCIsXG4gICAgICAgICAgXCJlYzI6QXNzaWduUHJpdmF0ZUlwQWRkcmVzc2VzXCIsXG4gICAgICAgICAgXCJlYzI6VW5hc3NpZ25Qcml2YXRlSXBBZGRyZXNzZXNcIixcbiAgICAgICAgXSxcbiAgICAgIH0pXG4gICAgKTtcbiAgICBhaVF1ZXJ5Um9sZS5hZGRUb1ByaW5jaXBhbFBvbGljeShcbiAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOmJlZHJvY2s6JHtTdGFjay5vZih0aGlzKS5yZWdpb259Ojpmb3VuZGF0aW9uLW1vZGVsLypgLFxuICAgICAgICBdLFxuICAgICAgICBhY3Rpb25zOiBbXCJiZWRyb2NrOkludm9rZU1vZGVsXCIsIFwiYmVkcm9jazpDb252ZXJzZVwiXSxcbiAgICAgIH0pXG4gICAgKTtcbiAgICBjbHVzdGVyLmdyYW50Q29ubmVjdChhaVF1ZXJ5Um9sZSk7XG5cbiAgICBjb25zdCBhaVF1ZXJ5Rm4gPSBuZXcgYXdzX2xhbWJkYV9ub2RlanMuTm9kZWpzRnVuY3Rpb24oXG4gICAgICB0aGlzLFxuICAgICAgXCJhaVF1ZXJ5Rm5cIixcbiAgICAgIHtcbiAgICAgICAgLi4uTm9kZWpzRnVuY3Rpb25CYXNlUHJvcHMsXG4gICAgICAgIGVudHJ5OiBcIi4vYXBpL2xhbWJkYS9haVF1ZXJ5LnRzXCIsXG4gICAgICAgIHJvbGU6IGFpUXVlcnlSb2xlLFxuICAgICAgICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDIpLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIE5FUFRVTkVfRU5EUE9JTlQ6IGNsdXN0ZXIuY2x1c3RlclJlYWRFbmRwb2ludC5ob3N0bmFtZSxcbiAgICAgICAgICBORVBUVU5FX1BPUlQ6IGNsdXN0ZXIuY2x1c3RlclJlYWRFbmRwb2ludC5wb3J0LnRvU3RyaW5nKCksXG4gICAgICAgICAgQkVEUk9DS19SRUdJT046IFN0YWNrLm9mKHRoaXMpLnJlZ2lvbixcbiAgICAgICAgICBNT0RFTF9JRDogXCJhbWF6b24ubm92YS1saXRlLXYxOjBcIixcbiAgICAgICAgfSxcbiAgICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgICBub2RlTW9kdWxlczogW1xuICAgICAgICAgICAgXCJncmVtbGluXCIsXG4gICAgICAgICAgICBcImdyZW1saW4tYXdzLXNpZ3Y0XCIsXG4gICAgICAgICAgICBcIkBhd3Mtc2RrL2NsaWVudC1iZWRyb2NrLXJ1bnRpbWVcIixcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgICAgc3VibmV0czogdnBjLmlzb2xhdGVkU3VibmV0cyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMubGFtYmRhRnVuY3Rpb25OYW1lc1tcImFpUXVlcnlGblwiXSA9IGFpUXVlcnlGbi5mdW5jdGlvbk5hbWU7XG4gICAgZ3JhcGhxbC5ncmFudFF1ZXJ5KGFpUXVlcnlGbik7XG4gICAgYWlRdWVyeUZuLmNvbm5lY3Rpb25zLmFsbG93VG8oY2x1c3RlciwgYXdzX2VjMi5Qb3J0LnRjcCg4MTgyKSk7XG5cbiAgICBjb25zdCBtdXRhdGlvbkZuID0gbmV3IGF3c19sYW1iZGFfbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKFxuICAgICAgdGhpcyxcbiAgICAgIFwibXV0YXRpb25GblwiLFxuICAgICAge1xuICAgICAgICAuLi5Ob2RlanNGdW5jdGlvbkJhc2VQcm9wcyxcbiAgICAgICAgZW50cnk6IFwiLi9hcGkvbGFtYmRhL211dGF0aW9uR3JhcGgudHNcIixcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBORVBUVU5FX0VORFBPSU5UOiBjbHVzdGVyLmNsdXN0ZXJFbmRwb2ludC5ob3N0bmFtZSxcbiAgICAgICAgICBORVBUVU5FX1BPUlQ6IGNsdXN0ZXIuY2x1c3RlckVuZHBvaW50LnBvcnQudG9TdHJpbmcoKSxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMubGFtYmRhRnVuY3Rpb25OYW1lc1tcIm11dGF0aW9uRm5cIl0gPSBtdXRhdGlvbkZuLmZ1bmN0aW9uTmFtZTtcbiAgICBncmFwaHFsLmdyYW50TXV0YXRpb24obXV0YXRpb25Gbik7XG4gICAgbXV0YXRpb25Gbi5jb25uZWN0aW9ucy5hbGxvd1RvKGNsdXN0ZXIsIGF3c19lYzIuUG9ydC50Y3AoODE4MikpO1xuXG4gICAgLy8gRnVuY3Rpb24gVVJMXG5cbiAgICBjb25zdCBidWxrTG9hZEZuID0gbmV3IGF3c19sYW1iZGFfbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKFxuICAgICAgdGhpcyxcbiAgICAgIFwiYnVsa0xvYWRGblwiLFxuICAgICAge1xuICAgICAgICAuLi5Ob2RlanNGdW5jdGlvbkJhc2VQcm9wcyxcbiAgICAgICAgZW50cnk6IFwiLi9hcGkvbGFtYmRhL2Z1bmN0aW9uVXJsL2luZGV4LnRzXCIsXG4gICAgICAgIGRlcHNMb2NrRmlsZVBhdGg6IFwiLi9hcGkvbGFtYmRhL2Z1bmN0aW9uVXJsL3BhY2thZ2UtbG9jay5qc29uXCIsXG4gICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgTkVQVFVORV9FTkRQT0lOVDogY2x1c3Rlci5jbHVzdGVyRW5kcG9pbnQuaG9zdG5hbWUsXG4gICAgICAgICAgTkVQVFVORV9QT1JUOiBjbHVzdGVyLmNsdXN0ZXJFbmRwb2ludC5wb3J0LnRvU3RyaW5nKCksXG4gICAgICAgICAgVkVSVEVYOiBzM1VyaS52ZXJ0ZXgsXG4gICAgICAgICAgRURHRTogczNVcmkuZWRnZSxcbiAgICAgICAgICBST0xFX0FSTjogY2x1c3RlclJvbGUucm9sZUFybixcbiAgICAgICAgfSxcbiAgICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICAgIHN1Ym5ldHM6IHZwYy5wdWJsaWNTdWJuZXRzLFxuICAgICAgICB9LFxuICAgICAgICBidW5kbGluZzoge1xuICAgICAgICAgIG5vZGVNb2R1bGVzOiBbXG4gICAgICAgICAgICBcIkBzbWl0aHkvc2lnbmF0dXJlLXY0XCIsXG4gICAgICAgICAgICBcIkBhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXItbm9kZVwiLFxuICAgICAgICAgICAgXCJAYXdzLWNyeXB0by9zaGEyNTYtanNcIixcbiAgICAgICAgICAgIFwiQHNtaXRoeS9wcm90b2NvbC1odHRwXCIsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgYWxsb3dQdWJsaWNTdWJuZXQ6IHRydWUsXG4gICAgICB9XG4gICAgKTtcbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9uTmFtZXNbXCJidWxrTG9hZEZuXCJdID0gYnVsa0xvYWRGbi5mdW5jdGlvbk5hbWU7XG4gICAgYnVsa0xvYWRGbi5jb25uZWN0aW9ucy5hbGxvd1RvKGNsdXN0ZXIsIGF3c19lYzIuUG9ydC50Y3AoODE4MikpO1xuXG4gICAgY29uc3QgZnVuY3Rpb25VcmwgPSBidWxrTG9hZEZuLmFkZEZ1bmN0aW9uVXJsKHtcbiAgICAgIGF1dGhUeXBlOiBhd3NfbGFtYmRhLkZ1bmN0aW9uVXJsQXV0aFR5cGUuQVdTX0lBTSxcbiAgICAgIGNvcnM6IHtcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFthd3NfbGFtYmRhLkh0dHBNZXRob2QuR0VUXSxcbiAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFtcIipcIl0sXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdLFxuICAgICAgfSxcblxuICAgICAgaW52b2tlTW9kZTogYXdzX2xhbWJkYS5JbnZva2VNb2RlLlJFU1BPTlNFX1NUUkVBTSxcbiAgICB9KTtcblxuICAgIGdyYXBocWxGaWVsZE5hbWUubWFwKChmaWxlZE5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgLy8gRGF0YSBzb3VyY2VzXG4gICAgICBsZXQgdGFyZ2V0Rm47XG4gICAgICBpZiAoZmlsZWROYW1lID09PSBcImFza0dyYXBoXCIpIHtcbiAgICAgICAgdGFyZ2V0Rm4gPSBhaVF1ZXJ5Rm47XG4gICAgICB9IGVsc2UgaWYgKGZpbGVkTmFtZS5zdGFydHNXaXRoKFwiZ2V0XCIpKSB7XG4gICAgICAgIHRhcmdldEZuID0gcXVlcnlGbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldEZuID0gbXV0YXRpb25GbjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRhdGFzb3VyY2UgPSBncmFwaHFsLmFkZExhbWJkYURhdGFTb3VyY2UoXG4gICAgICAgIGAke2ZpbGVkTmFtZX1EU2AsXG4gICAgICAgIHRhcmdldEZuXG4gICAgICApO1xuICAgICAgcXVlcnlGbi5hZGRFbnZpcm9ubWVudChcIkdSQVBIUUxfRU5EUE9JTlRcIiwgdGhpcy5ncmFwaHFsVXJsKTtcbiAgICAgIC8vIFJlc29sdmVyXG4gICAgICBkYXRhc291cmNlLmNyZWF0ZVJlc29sdmVyKGAke2ZpbGVkTmFtZX1SZXNvbHZlcmAsIHtcbiAgICAgICAgZmllbGROYW1lOiBgJHtmaWxlZE5hbWV9YCxcbiAgICAgICAgdHlwZU5hbWU6IGZpbGVkTmFtZS5zdGFydHNXaXRoKFwiZ2V0XCIpIHx8IGZpbGVkTmFtZS5zdGFydHNXaXRoKFwiYXNrXCIpXG4gICAgICAgICAgPyBcIlF1ZXJ5XCJcbiAgICAgICAgICA6IFwiTXV0YXRpb25cIixcbiAgICAgICAgcmVxdWVzdE1hcHBpbmdUZW1wbGF0ZTogTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKFxuICAgICAgICAgIGAuL2FwaS9ncmFwaHFsL3Jlc29sdmVycy9yZXF1ZXN0cy8ke2ZpbGVkTmFtZX0udnRsYFxuICAgICAgICApLFxuICAgICAgICByZXNwb25zZU1hcHBpbmdUZW1wbGF0ZTogTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKFxuICAgICAgICAgIFwiLi9hcGkvZ3JhcGhxbC9yZXNvbHZlcnMvcmVzcG9uc2VzL2RlZmF1bHQudnRsXCJcbiAgICAgICAgKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJHcmFwaHFsVXJsXCIsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmdyYXBocWxVcmwsXG4gICAgfSk7XG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIkZ1bmN0aW9uVXJsXCIsIHtcbiAgICAgIHZhbHVlOiBmdW5jdGlvblVybC51cmwsXG4gICAgfSk7XG5cbiAgICAvLyBTdXBwcmVzc2lvbnNcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBncmFwaHFsLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246IFwiRGF0YXNvcmNlIHJvbGVcIixcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICB0cnVlXG4gICAgKTtcblxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIGxhbWJkYVJvbGUsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICAgIHJlYXNvbjogXCJOZWVkIHRoZSBwZXJtaXNzaW9uIGZvciBhY2Nlc3NpbmcgZGF0YWJhc2UgaW4gVnBjXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgYWlRdWVyeVJvbGUsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICAgIHJlYXNvbjogXCJOZWVkIHRoZSBwZXJtaXNzaW9uIGZvciBCZWRyb2NrIGFuZCBWUEMgYWNjZXNzXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFN0YWNrU3VwcHJlc3Npb25zKFN0YWNrLm9mKHRoaXMpLCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICAgIHJlYXNvbjogXCJDREsgbWFuYWdlZCByZXNvdXJjZVwiLFxuICAgICAgICBhcHBsaWVzVG86IFtcbiAgICAgICAgICBcIlBvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGVcIixcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1MMVwiLFxuICAgICAgICByZWFzb246IFwiQ0RLIG1hbmFnZWQgcmVzb3VyY2VcIixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgIHJlYXNvbjogXCJDREsgbWFuYWdlZCByZXNvdXJjZVwiLFxuICAgICAgICBhcHBsaWVzVG86IFtcIlJlc291cmNlOjoqXCJdLFxuICAgICAgfSxcbiAgICBdKTtcbiAgfVxufVxuIl19