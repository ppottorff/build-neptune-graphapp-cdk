"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web = void 0;
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const child_process_1 = require("child_process");
const fs = require("fs");
const cdk_nag_1 = require("cdk-nag");
const ssm_parameter_reader_1 = require("./ssm-parameter-reader");
class Web extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { webappPath, webappDistFolder, wafParamName, region } = props;
        const webAclIdReader = new ssm_parameter_reader_1.SSMParameterReader(this, "WebAclIdReader", {
            parameterName: wafParamName,
            region: "us-east-1",
        });
        // Access logs bucket
        const accessLoggingBucket = new aws_cdk_lib_1.aws_s3.Bucket(this, "originAccessLoggingBucket", {
            blockPublicAccess: aws_cdk_lib_1.aws_s3.BlockPublicAccess.BLOCK_ALL,
            encryption: aws_cdk_lib_1.aws_s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: false,
            ...props.webBucketProps,
        });
        // Origin bucket
        const origin = new aws_cdk_lib_1.aws_s3.Bucket(this, "origin", {
            blockPublicAccess: aws_cdk_lib_1.aws_s3.BlockPublicAccess.BLOCK_ALL,
            encryption: aws_cdk_lib_1.aws_s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: false,
            serverAccessLogsBucket: accessLoggingBucket,
            ...props.webBucketProps,
        });
        const identity = new aws_cdk_lib_1.aws_cloudfront.OriginAccessIdentity(this, "originAccessIdentity", {
            comment: "website-distribution-originAccessIdentity",
        });
        const bucketPolicyStatement = new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: ["s3:GetObject"],
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            principals: [identity.grantPrincipal],
            resources: [`${origin.bucketArn}/*`],
        });
        origin.addToResourcePolicy(bucketPolicyStatement);
        const bucketOrigin = new aws_cdk_lib_1.aws_cloudfront_origins.S3Origin(origin, {
            originAccessIdentity: identity,
        });
        // Amazon CloudFront
        const cloudFrontWebDistribution = new aws_cdk_lib_1.aws_cloudfront.Distribution(this, "cloudFront", {
            webAclId: webAclIdReader.getParameterValue(),
            minimumProtocolVersion: aws_cdk_lib_1.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            enableLogging: true,
            logBucket: new aws_cdk_lib_1.aws_s3.Bucket(this, "cfLoggingBucket", {
                blockPublicAccess: aws_cdk_lib_1.aws_s3.BlockPublicAccess.BLOCK_ALL,
                encryption: aws_cdk_lib_1.aws_s3.BucketEncryption.S3_MANAGED,
                enforceSSL: true,
                ...props.webBucketProps,
                versioned: false,
                objectOwnership: aws_cdk_lib_1.aws_s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
            }),
            defaultBehavior: {
                origin: bucketOrigin,
                allowedMethods: aws_cdk_lib_1.aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cachedMethods: aws_cdk_lib_1.aws_cloudfront.CachedMethods.CACHE_GET_HEAD,
                cachePolicy: aws_cdk_lib_1.aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
                viewerProtocolPolicy: aws_cdk_lib_1.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            errorResponses: [
                {
                    httpStatus: 403,
                    responsePagePath: "/index.html",
                    responseHttpStatus: 200,
                },
                {
                    httpStatus: 404,
                    responsePagePath: "/index.html",
                    responseHttpStatus: 200,
                },
            ],
        });
        this.distribution = cloudFrontWebDistribution;
        const bucketDeploymentRole = new aws_cdk_lib_1.aws_iam.Role(this, "bucketDeploymentRole", {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
        });
        bucketDeploymentRole.addToPrincipalPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            resources: ["*"],
            actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
        }));
        // React deployment
        new aws_cdk_lib_1.aws_s3_deployment.BucketDeployment(this, "bucketDeployment", {
            destinationBucket: origin,
            distribution: cloudFrontWebDistribution,
            role: bucketDeploymentRole,
            sources: [
                aws_cdk_lib_1.aws_s3_deployment.Source.asset(webappPath, {
                    bundling: {
                        image: aws_cdk_lib_1.DockerImage.fromRegistry("node:lts"),
                        command: [],
                        local: {
                            tryBundle(outputDir) {
                                try {
                                    (0, child_process_1.execSync)("pnpm --version");
                                }
                                catch {
                                    return false;
                                }
                                (0, child_process_1.execSync)(`cd ${webappPath} && pnpm i && pnpm run build`);
                                fs.cpSync(`${webappPath}/${webappDistFolder}`, outputDir, {
                                    recursive: true,
                                });
                                return true;
                            },
                        },
                    },
                }),
            ],
            memoryLimit: 512,
        });
        // Suppressions
        cdk_nag_1.NagSuppressions.addResourceSuppressions(accessLoggingBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "This bucket is the access log bucket",
            },
        ], true);
        // Output
        new aws_cdk_lib_1.CfnOutput(this, "url", {
            value: this.distribution.domainName,
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(bucketDeploymentRole, [
            {
                id: "AwsSolutions-IAM5",
                reason: "Given the least privilege to this role based on LambdaExecutionRole",
                appliesTo: ["Resource::*"],
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "Automatically created this policy and access to the restricted bucket",
                appliesTo: [
                    "Action::s3:GetObject*",
                    "Action::s3:List*",
                    "Action::s3:GetBucket*",
                    "Action::s3:Abort*",
                    "Action::s3:DeleteObject*",
                ],
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "Automatically created this policy",
                appliesTo: [
                    {
                        regex: "/^Resource::(.*)$/g",
                    },
                ],
            },
        ], true);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.distribution.stack, [
            {
                id: "AwsSolutions-S1",
                reason: "CloudfrontLoggingBucket is the access log bucket",
            },
            {
                id: "AwsSolutions-CFR1",
                reason: "Disable warning",
            },
            {
                id: "AwsSolutions-CFR4",
                reason: "Attached the minimum security policy of TLS_V1_2_2021",
            },
        ], true);
        cdk_nag_1.NagSuppressions.addStackSuppressions(aws_cdk_lib_1.Stack.of(this), [
            {
                id: "AwsSolutions-L1",
                reason: "CDK managed resource",
            },
            {
                id: "AwsSolutions-IAM4",
                reason: "CDK managed resource",
                appliesTo: [
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                ],
            },
        ]);
    }
}
exports.Web = Web;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2ViLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUF1QztBQUN2Qyw2Q0FXcUI7QUFDckIsaURBQXlDO0FBQ3pDLHlCQUF5QjtBQUN6QixxQ0FBMEM7QUFDMUMsaUVBQTREO0FBYTVELE1BQWEsR0FBSSxTQUFRLHNCQUFTO0lBRWhDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZTtRQUN2RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztRQUVyRSxNQUFNLGNBQWMsR0FBRyxJQUFJLHlDQUFrQixDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNwRSxhQUFhLEVBQUUsWUFBWTtZQUMzQixNQUFNLEVBQUUsV0FBVztTQUNwQixDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLG9CQUFNLENBQUMsTUFBTSxDQUMzQyxJQUFJLEVBQ0osMkJBQTJCLEVBQzNCO1lBQ0UsaUJBQWlCLEVBQUUsb0JBQU0sQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ3JELFVBQVUsRUFBRSxvQkFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7WUFDOUMsVUFBVSxFQUFFLElBQUk7WUFDaEIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsR0FBRyxLQUFLLENBQUMsY0FBYztTQUN4QixDQUNGLENBQUM7UUFFRixnQkFBZ0I7UUFDaEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxvQkFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQy9DLGlCQUFpQixFQUFFLG9CQUFNLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNyRCxVQUFVLEVBQUUsb0JBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzlDLFVB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TUFBTSxFQUFFLHNCQUFzQjtnQkFDOUIsU0FBUyxFQUFFO29CQUNULHVGQUF1RjtpQkFDeEY7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWxPRCxrQkFrT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHtcbiAgUmVtb3ZhbFBvbGljeSxcbiAgU3RhY2tQcm9wcyxcbiAgYXdzX3MzX2RlcGxveW1lbnQsXG4gIGF3c19jbG91ZGZyb250LFxuICBhd3NfczMsXG4gIGF3c19pYW0sXG4gIGF3c19jbG91ZGZyb250X29yaWdpbnMsXG4gIERvY2tlckltYWdlLFxuICBDZm5PdXRwdXQsXG4gIFN0YWNrLFxufSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcbmltcG9ydCB7IFNTTVBhcmFtZXRlclJlYWRlciB9IGZyb20gXCIuL3NzbS1wYXJhbWV0ZXItcmVhZGVyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgd2ViYXBwUGF0aDogc3RyaW5nO1xuICB3ZWJhcHBEaXN0Rm9sZGVyOiBzdHJpbmc7XG4gIHdhZlBhcmFtTmFtZTogc3RyaW5nO1xuICByZWdpb246IHN0cmluZztcbiAgd2ViQnVja2V0UHJvcHM6IHtcbiAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5O1xuICAgIGF1dG9EZWxldGVPYmplY3RzOiBib29sZWFuO1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgV2ViIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGRpc3RyaWJ1dGlvbjogYXdzX2Nsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogV2ViUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyB3ZWJhcHBQYXRoLCB3ZWJhcHBEaXN0Rm9sZGVyLCB3YWZQYXJhbU5hbWUsIHJlZ2lvbiB9ID0gcHJvcHM7XG5cbiAgICBjb25zdCB3ZWJBY2xJZFJlYWRlciA9IG5ldyBTU01QYXJhbWV0ZXJSZWFkZXIodGhpcywgXCJXZWJBY2xJZFJlYWRlclwiLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiB3YWZQYXJhbU5hbWUsXG4gICAgICByZWdpb246IFwidXMtZWFzdC0xXCIsXG4gICAgfSk7XG5cbiAgICAvLyBBY2Nlc3MgbG9ncyBidWNrZXRcbiAgICBjb25zdCBhY2Nlc3NMb2dnaW5nQnVja2V0ID0gbmV3IGF3c19zMy5CdWNrZXQoXG4gICAgICB0aGlzLFxuICAgICAgXCJvcmlnaW5BY2Nlc3NMb2dnaW5nQnVja2V0XCIsXG4gICAgICB7XG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBhd3NfczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICBlbmNyeXB0aW9uOiBhd3NfczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICB2ZXJzaW9uZWQ6IGZhbHNlLFxuICAgICAgICAuLi5wcm9wcy53ZWJCdWNrZXRQcm9wcyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gT3JpZ2luIGJ1Y2tldFxuICAgIGNvbnN0IG9yaWdpbiA9IG5ldyBhd3NfczMuQnVja2V0KHRoaXMsIFwib3JpZ2luXCIsIHtcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBhd3NfczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgZW5jcnlwdGlvbjogYXdzX3MzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICB2ZXJzaW9uZWQ6IGZhbHNlLFxuICAgICAgc2VydmVyQWNjZXNzTG9nc0J1Y2tldDogYWNjZXNzTG9nZ2luZ0J1Y2tldCxcbiAgICAgIC4uLnByb3BzLndlYkJ1Y2tldFByb3BzLFxuICAgIH0pO1xuICAgIGNvbnN0IGlkZW50aXR5ID0gbmV3IGF3c19jbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5KFxuICAgICAgdGhpcyxcbiAgICAgIFwib3JpZ2luQWNjZXNzSWRlbnRpdHlcIixcbiAgICAgIHtcbiAgICAgICAgY29tbWVudDogXCJ3ZWJzaXRlLWRpc3RyaWJ1dGlvbi1vcmlnaW5BY2Nlc3NJZGVudGl0eVwiLFxuICAgICAgfVxuICAgICk7XG4gICAgY29uc3QgYnVja2V0UG9saWN5U3RhdGVtZW50ID0gbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFtcInMzOkdldE9iamVjdFwiXSxcbiAgICAgIGVmZmVjdDogYXdzX2lhbS5FZmZlY3QuQUxMT1csXG4gICAgICBwcmluY2lwYWxzOiBbaWRlbnRpdHkuZ3JhbnRQcmluY2lwYWxdLFxuICAgICAgcmVzb3VyY2VzOiBbYCR7b3JpZ2luLmJ1Y2tldEFybn0vKmBdLFxuICAgIH0pO1xuICAgIG9yaWdpbi5hZGRUb1Jlc291cmNlUG9saWN5KGJ1Y2tldFBvbGljeVN0YXRlbWVudCk7XG5cbiAgICBjb25zdCBidWNrZXRPcmlnaW4gPSBuZXcgYXdzX2Nsb3VkZnJvbnRfb3JpZ2lucy5TM09yaWdpbihvcmlnaW4sIHtcbiAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5OiBpZGVudGl0eSxcbiAgICB9KTtcblxuICAgIC8vIEFtYXpvbiBDbG91ZEZyb250XG4gICAgY29uc3QgY2xvdWRGcm9udFdlYkRpc3RyaWJ1dGlvbiA9IG5ldyBhd3NfY2xvdWRmcm9udC5EaXN0cmlidXRpb24oXG4gICAgICB0aGlzLFxuICAgICAgXCJjbG91ZEZyb250XCIsXG4gICAgICB7XG4gICAgICAgIHdlYkFjbElkOiB3ZWJBY2xJZFJlYWRlci5nZXRQYXJhbWV0ZXJWYWx1ZSgpLFxuICAgICAgICBtaW5pbXVtUHJvdG9jb2xWZXJzaW9uOlxuICAgICAgICAgIGF3c19jbG91ZGZyb250LlNlY3VyaXR5UG9saWN5UHJvdG9jb2wuVExTX1YxXzJfMjAyMSxcbiAgICAgICAgZW5hYmxlTG9nZ2luZzogdHJ1ZSxcbiAgICAgICAgbG9nQnVja2V0OiBuZXcgYXdzX3MzLkJ1Y2tldCh0aGlzLCBcImNmTG9nZ2luZ0J1Y2tldFwiLCB7XG4gICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IGF3c19zMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgICAgZW5jcnlwdGlvbjogYXdzX3MzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICAgIC4uLnByb3BzLndlYkJ1Y2tldFByb3BzLFxuICAgICAgICAgIHZlcnNpb25lZDogZmFsc2UsXG4gICAgICAgICAgb2JqZWN0T3duZXJzaGlwOiBhd3NfczMuT2JqZWN0T3duZXJzaGlwLkJVQ0tFVF9PV05FUl9QUkVGRVJSRUQsXG4gICAgICAgIH0pLFxuICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgICBvcmlnaW46IGJ1Y2tldE9yaWdpbixcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogYXdzX2Nsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQUQsXG4gICAgICAgICAgY2FjaGVkTWV0aG9kczogYXdzX2Nsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRCxcbiAgICAgICAgICBjYWNoZVBvbGljeTogYXdzX2Nsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6XG4gICAgICAgICAgICBhd3NfY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgfSxcblxuICAgICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6IFwiL2luZGV4Lmh0bWxcIixcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogXCIvaW5kZXguaHRtbFwiLFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgdGhpcy5kaXN0cmlidXRpb24gPSBjbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uO1xuXG4gICAgY29uc3QgYnVja2V0RGVwbG95bWVudFJvbGUgPSBuZXcgYXdzX2lhbS5Sb2xlKFxuICAgICAgdGhpcyxcbiAgICAgIFwiYnVja2V0RGVwbG95bWVudFJvbGVcIixcbiAgICAgIHtcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKFwibGFtYmRhLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICB9XG4gICAgKTtcbiAgICBidWNrZXREZXBsb3ltZW50Um9sZS5hZGRUb1ByaW5jaXBhbFBvbGljeShcbiAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dHcm91cFwiLFxuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dTdHJlYW1cIixcbiAgICAgICAgICBcImxvZ3M6UHV0TG9nRXZlbnRzXCIsXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBSZWFjdCBkZXBsb3ltZW50XG4gICAgbmV3IGF3c19zM19kZXBsb3ltZW50LkJ1Y2tldERlcGxveW1lbnQodGhpcywgXCJidWNrZXREZXBsb3ltZW50XCIsIHtcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiBvcmlnaW4sXG4gICAgICBkaXN0cmlidXRpb246IGNsb3VkRnJvbnRXZWJEaXN0cmlidXRpb24sXG4gICAgICByb2xlOiBidWNrZXREZXBsb3ltZW50Um9sZSxcbiAgICAgIHNvdXJjZXM6IFtcbiAgICAgICAgYXdzX3MzX2RlcGxveW1lbnQuU291cmNlLmFzc2V0KHdlYmFwcFBhdGgsIHtcbiAgICAgICAgICBidW5kbGluZzoge1xuICAgICAgICAgICAgaW1hZ2U6IERvY2tlckltYWdlLmZyb21SZWdpc3RyeShcIm5vZGU6bHRzXCIpLFxuICAgICAgICAgICAgY29tbWFuZDogW10sXG4gICAgICAgICAgICBsb2NhbDoge1xuICAgICAgICAgICAgICB0cnlCdW5kbGUob3V0cHV0RGlyOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZXhlY1N5bmMoXCJwbnBtIC0tdmVyc2lvblwiKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhlY1N5bmMoYGNkICR7d2ViYXBwUGF0aH0gJiYgcG5wbSBpICYmIHBucG0gcnVuIGJ1aWxkYCk7XG4gICAgICAgICAgICAgICAgZnMuY3BTeW5jKGAke3dlYmFwcFBhdGh9LyR7d2ViYXBwRGlzdEZvbGRlcn1gLCBvdXRwdXREaXIsIHtcbiAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICBdLFxuICAgICAgbWVtb3J5TGltaXQ6IDUxMixcbiAgICB9KTtcblxuICAgIC8vIFN1cHByZXNzaW9uc1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIGFjY2Vzc0xvZ2dpbmdCdWNrZXQsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtUzFcIixcbiAgICAgICAgICByZWFzb246IFwiVGhpcyBidWNrZXQgaXMgdGhlIGFjY2VzcyBsb2cgYnVja2V0XCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICAvLyBPdXRwdXRcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwidXJsXCIsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRpc3RyaWJ1dGlvbi5kb21haW5OYW1lLFxuICAgIH0pO1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIGJ1Y2tldERlcGxveW1lbnRSb2xlLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICBcIkdpdmVuIHRoZSBsZWFzdCBwcml2aWxlZ2UgdG8gdGhpcyByb2xlIGJhc2VkIG9uIExhbWJkYUV4ZWN1dGlvblJvbGVcIixcbiAgICAgICAgICBhcHBsaWVzVG86IFtcIlJlc291cmNlOjoqXCJdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICBcIkF1dG9tYXRpY2FsbHkgY3JlYXRlZCB0aGlzIHBvbGljeSBhbmQgYWNjZXNzIHRvIHRoZSByZXN0cmljdGVkIGJ1Y2tldFwiLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgXCJBY3Rpb246OnMzOkdldE9iamVjdCpcIixcbiAgICAgICAgICAgIFwiQWN0aW9uOjpzMzpMaXN0KlwiLFxuICAgICAgICAgICAgXCJBY3Rpb246OnMzOkdldEJ1Y2tldCpcIixcbiAgICAgICAgICAgIFwiQWN0aW9uOjpzMzpBYm9ydCpcIixcbiAgICAgICAgICAgIFwiQWN0aW9uOjpzMzpEZWxldGVPYmplY3QqXCIsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgcmVhc29uOiBcIkF1dG9tYXRpY2FsbHkgY3JlYXRlZCB0aGlzIHBvbGljeVwiLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICByZWdleDogXCIvXlJlc291cmNlOjooLiopJC9nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgdGhpcy5kaXN0cmlidXRpb24uc3RhY2ssXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtUzFcIixcbiAgICAgICAgICByZWFzb246IFwiQ2xvdWRmcm9udExvZ2dpbmdCdWNrZXQgaXMgdGhlIGFjY2VzcyBsb2cgYnVja2V0XCIsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtQ0ZSMVwiLFxuICAgICAgICAgIHJlYXNvbjogXCJEaXNhYmxlIHdhcm5pbmdcIixcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1DRlI0XCIsXG4gICAgICAgICAgcmVhc29uOiBcIkF0dGFjaGVkIHRoZSBtaW5pbXVtIHNlY3VyaXR5IHBvbGljeSBvZiBUTFNfVjFfMl8yMDIxXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkU3RhY2tTdXBwcmVzc2lvbnMoU3RhY2sub2YodGhpcyksIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUwxXCIsXG4gICAgICAgIHJlYXNvbjogXCJDREsgbWFuYWdlZCByZXNvdXJjZVwiLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgcmVhc29uOiBcIkNESyBtYW5hZ2VkIHJlc291cmNlXCIsXG4gICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgIFwiUG9saWN5Ojphcm46PEFXUzo6UGFydGl0aW9uPjppYW06OmF3czpwb2xpY3kvc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZVwiLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdKTtcbiAgfVxufVxuIl19