"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeptuneNetworkStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cdk_nag_1 = require("cdk-nag");
const network_1 = require("./constructs/network");
const neptune_1 = require("./constructs/neptune");
const neptune_scheduler_1 = require("./constructs/neptune-scheduler");
const parameter_email_subscriber_1 = require("./constructs/parameter-email-subscriber");
class NeptuneNetworkStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { natSubnet, maxAz, neptuneServerlss, neptuneServerlssCapacity, neptuneSchedule, } = props;
        const network = new network_1.Network(this, "network", {
            natSubnet,
            maxAz,
        });
        this.vpc = network.vpc;
        const neptune = new neptune_1.Neptune(this, "neptune", {
            vpc: network.vpc,
            neptuneServerlss,
            neptuneServerlssCapacity,
        });
        this.cluster = neptune.cluster;
        this.neptuneRole = neptune.neptuneRole;
        // Schedule Neptune stop/start to save costs during off-hours
        if (neptuneSchedule?.enabled) {
            new neptune_scheduler_1.NeptuneScheduler(this, "neptune-scheduler", {
                cluster: this.cluster,
                timezone: neptuneSchedule.timezone,
                stopHour: neptuneSchedule.stopHour,
                startHour: neptuneSchedule.startHour,
            });
        }
        // SNS topic for Neptune cluster state change notifications
        const neptuneStatusKey = new aws_cdk_lib_1.aws_kms.Key(this, "NeptuneStatusTopicKey", {
            description: "KMS key for Neptune status SNS topic encryption",
            enableKeyRotation: true,
        });
        const neptuneStatusTopic = new aws_cdk_lib_1.aws_sns.Topic(this, "NeptuneStatusTopic", {
            displayName: "Neptune Cluster Status Notifications",
            masterKey: neptuneStatusKey,
        });
        // Enforce SSL-only access to the topic (AwsSolutions-SNS3)
        neptuneStatusTopic.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            sid: "AllowPublishThroughSSLOnly",
            effect: aws_cdk_lib_1.aws_iam.Effect.DENY,
            principals: [new aws_cdk_lib_1.aws_iam.AnyPrincipal()],
            actions: ["sns:Publish"],
            resources: [neptuneStatusTopic.topicArn],
            conditions: {
                Bool: { "aws:SecureTransport": "false" },
            },
        }));
        // Allow RDS/Neptune to publish to this encrypted topic
        neptuneStatusTopic.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            sid: "AllowRDSPublish",
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            principals: [new aws_cdk_lib_1.aws_iam.ServicePrincipal("events.rds.amazonaws.com")],
            actions: ["sns:Publish"],
            resources: [neptuneStatusTopic.topicArn],
        }));
        neptuneStatusKey.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            sid: "AllowRDSUseKey",
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            principals: [new aws_cdk_lib_1.aws_iam.ServicePrincipal("events.rds.amazonaws.com")],
            actions: ["kms:Decrypt", "kms:GenerateDataKey*"],
            resources: ["*"],
        }));
        // Subscribe email addresses from Parameter Store
        new parameter_email_subscriber_1.ParameterEmailSubscriber(this, "NeptuneEmailSubscriber", {
            topicArn: neptuneStatusTopic.topicArn,
            parameterName: "/global-app-params/rdsnotificationemails",
        });
        // RDS Event Subscription: notify on cluster failover, maintenance, and notification events
        new aws_cdk_lib_1.aws_rds.CfnEventSubscription(this, "NeptuneEventSubscription", {
            snsTopicArn: neptuneStatusTopic.topicArn,
            sourceType: "db-cluster",
            sourceIds: [this.cluster.clusterIdentifier],
            enabled: true,
            eventCategories: ["failover", "failure", "maintenance", "notification"],
        });
        // -----------------------------------------------------------------------
        // cdk-nag stack-level suppressions
        // -----------------------------------------------------------------------
        cdk_nag_1.NagSuppressions.addStackSuppressions(this, [
            {
                id: "AwsSolutions-IAM4",
                reason: "AWSLambdaBasicExecutionRole is required for CloudWatch Logs access - CDK managed resource",
                appliesTo: [
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                ],
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "Wildcard permissions required for CDK managed resources",
                appliesTo: ["Resource::*"],
            },
            {
                id: "AwsSolutions-L1",
                reason: "NODEJS_22_X is the latest supported runtime at deploy time - CDK managed resource",
            },
        ]);
    }
}
exports.NeptuneNetworkStack = NeptuneNetworkStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmVwdHVuZS1uZXR3b3JrLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmVwdHVuZS1uZXR3b3JrLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUE2RjtBQUc3RixxQ0FBMEM7QUFDMUMsa0RBQStDO0FBQy9DLGtEQUErQztBQUMvQyxzRUFBa0U7QUFDbEUsd0ZBQW1GO0FBc0JuRixNQUFhLG1CQUFvQixTQUFRLG1CQUFLO0lBSTVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBK0I7UUFDdkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUNKLFNBQVMsRUFDVCxLQUFLLEVBQ0wsZ0JBQWdCLEVBQ2hCLHdCQUF3QixFQUN4QixlQUFlLEdBQ2hCLEdBQUcsS0FBSyxDQUFDO1FBRVYsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDM0MsU0FBUztZQUNULEtBQUs7U0FDTixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFFdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDM0MsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO1lBQ2hCLGdCQUFnQjtZQUNoQix3QkFBd0I7U0FDekIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUV2Qyw2REFBNkQ7UUFDN0QsSUFBSSxlQUFlLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDN0IsSUFBSSxvQ0FBZ0IsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7Z0JBQzlDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztnQkFD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O2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFDSiwyRkFBMkY7Z0JBQzdGLFNBQVMsRUFBRTtvQkFDVCx1RkFBdUY7aUJBQ3hGO2FBQ0Y7WUFDRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQUUseURBQXlEO2dCQUNqRSxTQUFTLEVBQUUsQ0FBQyxhQUFhLENBQUM7YUFDM0I7WUFDRDtnQkFDRSxFQUFFLEVBQUUsaUJBQWlCO2dCQUNyQixNQUFNLEVBQUUsbUZBQW1GO2FBQzVGO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNUhELGtEQTRIQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzLCBhd3NfZWMyLCBhd3NfaWFtLCBhd3Nfa21zLCBhd3Nfc25zLCBhd3NfcmRzIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0ICogYXMgbmVwdHVuZSBmcm9tIFwiQGF3cy1jZGsvYXdzLW5lcHR1bmUtYWxwaGFcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5pbXBvcnQgeyBOZXR3b3JrIH0gZnJvbSBcIi4vY29uc3RydWN0cy9uZXR3b3JrXCI7XG5pbXBvcnQgeyBOZXB0dW5lIH0gZnJvbSBcIi4vY29uc3RydWN0cy9uZXB0dW5lXCI7XG5pbXBvcnQgeyBOZXB0dW5lU2NoZWR1bGVyIH0gZnJvbSBcIi4vY29uc3RydWN0cy9uZXB0dW5lLXNjaGVkdWxlclwiO1xuaW1wb3J0IHsgUGFyYW1ldGVyRW1haWxTdWJzY3JpYmVyIH0gZnJvbSBcIi4vY29uc3RydWN0cy9wYXJhbWV0ZXItZW1haWwtc3Vic2NyaWJlclwiO1xuXG5pbnRlcmZhY2UgTmVwdHVuZVNjaGVkdWxlQ29uZmlnIHtcbiAgLyoqIEVuYWJsZSBzY2hlZHVsZWQgc3RvcC9zdGFydCBvZiBOZXB0dW5lIChkZWZhdWx0OiBmYWxzZSkgKi9cbiAgZW5hYmxlZDogYm9vbGVhbjtcbiAgLyoqIElBTkEgdGltZXpvbmUgKGRlZmF1bHQ6IEFtZXJpY2EvTG9zX0FuZ2VsZXMpICovXG4gIHRpbWV6b25lPzogc3RyaW5nO1xuICAvKiogSG91ciB0byBzdG9wIHRoZSBjbHVzdGVyIChkZWZhdWx0OiAwID0gbWlkbmlnaHQpICovXG4gIHN0b3BIb3VyPzogbnVtYmVyO1xuICAvKiogSG91ciB0byBzdGFydCB0aGUgY2x1c3RlciAoZGVmYXVsdDogMTYgPSA0cG0pICovXG4gIHN0YXJ0SG91cj86IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIE5lcHR1bmVOZXR3b3JrU3RhY2tQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICBuYXRTdWJuZXQ/OiBib29sZWFuO1xuICBtYXhBejogbnVtYmVyO1xuICBuZXB0dW5lU2VydmVybHNzOiBib29sZWFuO1xuICBuZXB0dW5lU2VydmVybHNzQ2FwYWNpdHk/OiBuZXB0dW5lLlNlcnZlcmxlc3NTY2FsaW5nQ29uZmlndXJhdGlvbjtcbiAgLyoqIE9wdGlvbmFsIHNjaGVkdWxlIHRvIHN0b3Avc3RhcnQgTmVwdHVuZSBkdXJpbmcgb2ZmLWhvdXJzICovXG4gIG5lcHR1bmVTY2hlZHVsZT86IE5lcHR1bmVTY2hlZHVsZUNvbmZpZztcbn1cblxuZXhwb3J0IGNsYXNzIE5lcHR1bmVOZXR3b3JrU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB2cGM6IGF3c19lYzIuVnBjO1xuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogbmVwdHVuZS5EYXRhYmFzZUNsdXN0ZXI7XG4gIHB1YmxpYyByZWFkb25seSBuZXB0dW5lUm9sZTogYXdzX2lhbS5Sb2xlO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTmVwdHVuZU5ldHdvcmtTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7XG4gICAgICBuYXRTdWJuZXQsXG4gICAgICBtYXhBeixcbiAgICAgIG5lcHR1bmVTZXJ2ZXJsc3MsXG4gICAgICBuZXB0dW5lU2VydmVybHNzQ2FwYWNpdHksXG4gICAgICBuZXB0dW5lU2NoZWR1bGUsXG4gICAgfSA9IHByb3BzO1xuXG4gICAgY29uc3QgbmV0d29yayA9IG5ldyBOZXR3b3JrKHRoaXMsIFwibmV0d29ya1wiLCB7XG4gICAgICBuYXRTdWJuZXQsXG4gICAgICBtYXhBeixcbiAgICB9KTtcbiAgICB0aGlzLnZwYyA9IG5ldHdvcmsudnBjO1xuXG4gICAgY29uc3QgbmVwdHVuZSA9IG5ldyBOZXB0dW5lKHRoaXMsIFwibmVwdHVuZVwiLCB7XG4gICAgICB2cGM6IG5ldHdvcmsudnBjLFxuICAgICAgbmVwdHVuZVNlcnZlcmxzcyxcbiAgICAgIG5lcHR1bmVTZXJ2ZXJsc3NDYXBhY2l0eSxcbiAgICB9KTtcblxuICAgIHRoaXMuY2x1c3RlciA9IG5lcHR1bmUuY2x1c3RlcjtcbiAgICB0aGlzLm5lcHR1bmVSb2xlID0gbmVwdHVuZS5uZXB0dW5lUm9sZTtcblxuICAgIC8vIFNjaGVkdWxlIE5lcHR1bmUgc3RvcC9zdGFydCB0byBzYXZlIGNvc3RzIGR1cmluZyBvZmYtaG91cnNcbiAgICBpZiAobmVwdHVuZVNjaGVkdWxlPy5lbmFibGVkKSB7XG4gICAgICBuZXcgTmVwdHVuZVNjaGVkdWxlcih0aGlzLCBcIm5lcHR1bmUtc2NoZWR1bGVyXCIsIHtcbiAgICAgICAgY2x1c3RlcjogdGhpcy5jbHVzdGVyLFxuICAgICAgICB0aW1lem9uZTogbmVwdHVuZVNjaGVkdWxlLnRpbWV6b25lLFxuICAgICAgICBzdG9wSG91cjogbmVwdHVuZVNjaGVkdWxlLnN0b3BIb3VyLFxuICAgICAgICBzdGFydEhvdXI6IG5lcHR1bmVTY2hlZHVsZS5zdGFydEhvdXIsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBTTlMgdG9waWMgZm9yIE5lcHR1bmUgY2x1c3RlciBzdGF0ZSBjaGFuZ2Ugbm90aWZpY2F0aW9uc1xuICAgIGNvbnN0IG5lcHR1bmVTdGF0dXNLZXkgPSBuZXcgYXdzX2ttcy5LZXkodGhpcywgXCJOZXB0dW5lU3RhdHVzVG9waWNLZXlcIiwge1xuICAgICAgZGVzY3JpcHRpb246IFwiS01TIGtleSBmb3IgTmVwdHVuZSBzdGF0dXMgU05TIHRvcGljIGVuY3J5cHRpb25cIixcbiAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgbmVwdHVuZVN0YXR1c1RvcGljID0gbmV3IGF3c19zbnMuVG9waWModGhpcywgXCJOZXB0dW5lU3RhdHVzVG9waWNcIiwge1xuICAgICAgZGlzcGxheU5hbWU6IFwiTmVwdHVuZSBDbHVzdGVyIFN0YXR1cyBOb3RpZmljYXRpb25zXCIsXG4gICAgICBtYXN0ZXJLZXk6IG5lcHR1bmVTdGF0dXNLZXksXG4gICAgfSk7XG5cbiAgICAvLyBFbmZvcmNlIFNTTC1vbmx5IGFjY2VzcyB0byB0aGUgdG9waWMgKEF3c1NvbHV0aW9ucy1TTlMzKVxuICAgIG5lcHR1bmVTdGF0dXNUb3BpYy5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgc2lkOiBcIkFsbG93UHVibGlzaFRocm91Z2hTU0xPbmx5XCIsXG4gICAgICAgIGVmZmVjdDogYXdzX2lhbS5FZmZlY3QuREVOWSxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBhd3NfaWFtLkFueVByaW5jaXBhbCgpXSxcbiAgICAgICAgYWN0aW9uczogW1wic25zOlB1Ymxpc2hcIl0sXG4gICAgICAgIHJlc291cmNlczogW25lcHR1bmVTdGF0dXNUb3BpYy50b3BpY0Fybl0sXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICBCb29sOiB7IFwiYXdzOlNlY3VyZVRyYW5zcG9ydFwiOiBcImZhbHNlXCIgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIEFsbG93IFJEUy9OZXB0dW5lIHRvIHB1Ymxpc2ggdG8gdGhpcyBlbmNyeXB0ZWQgdG9waWNcbiAgICBuZXB0dW5lU3RhdHVzVG9waWMuYWRkVG9SZXNvdXJjZVBvbGljeShcbiAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHNpZDogXCJBbGxvd1JEU1B1Ymxpc2hcIixcbiAgICAgICAgZWZmZWN0OiBhd3NfaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBhd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJldmVudHMucmRzLmFtYXpvbmF3cy5jb21cIildLFxuICAgICAgICBhY3Rpb25zOiBbXCJzbnM6UHVibGlzaFwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbbmVwdHVuZVN0YXR1c1RvcGljLnRvcGljQXJuXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIG5lcHR1bmVTdGF0dXNLZXkuYWRkVG9SZXNvdXJjZVBvbGljeShcbiAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHNpZDogXCJBbGxvd1JEU1VzZUtleVwiLFxuICAgICAgICBlZmZlY3Q6IGF3c19pYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGF3c19pYW0uU2VydmljZVByaW5jaXBhbChcImV2ZW50cy5yZHMuYW1hem9uYXdzLmNvbVwiKV0sXG4gICAgICAgIGFjdGlvbnM6IFtcImttczpEZWNyeXB0XCIsIFwia21zOkdlbmVyYXRlRGF0YUtleSpcIl0sXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIFN1YnNjcmliZSBlbWFpbCBhZGRyZXNzZXMgZnJvbSBQYXJhbWV0ZXIgU3RvcmVcbiAgICBuZXcgUGFyYW1ldGVyRW1haWxTdWJzY3JpYmVyKHRoaXMsIFwiTmVwdHVuZUVtYWlsU3Vic2NyaWJlclwiLCB7XG4gICAgICB0b3BpY0FybjogbmVwdHVuZVN0YXR1c1RvcGljLnRvcGljQXJuLFxuICAgICAgcGFyYW1ldGVyTmFtZTogXCIvZ2xvYmFsLWFwcC1wYXJhbXMvcmRzbm90aWZpY2F0aW9uZW1haWxzXCIsXG4gICAgfSk7XG5cbiAgICAvLyBSRFMgRXZlbnQgU3Vic2NyaXB0aW9uOiBub3RpZnkgb24gY2x1c3RlciBmYWlsb3ZlciwgbWFpbnRlbmFuY2UsIGFuZCBub3RpZmljYXRpb24gZXZlbnRzXG4gICAgbmV3IGF3c19yZHMuQ2ZuRXZlbnRTdWJzY3JpcHRpb24odGhpcywgXCJOZXB0dW5lRXZlbnRTdWJzY3JpcHRpb25cIiwge1xuICAgICAgc25zVG9waWNBcm46IG5lcHR1bmVTdGF0dXNUb3BpYy50b3BpY0FybixcbiAgICAgIHNvdXJjZVR5cGU6IFwiZGItY2x1c3RlclwiLFxuICAgICAgc291cmNlSWRzOiBbdGhpcy5jbHVzdGVyLmNsdXN0ZXJJZGVudGlmaWVyXSxcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICBldmVudENhdGVnb3JpZXM6IFtcImZhaWxvdmVyXCIsIFwiZmFpbHVyZVwiLCBcIm1haW50ZW5hbmNlXCIsIFwibm90aWZpY2F0aW9uXCJdLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBjZGstbmFnIHN0YWNrLWxldmVsIHN1cHByZXNzaW9uc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFN0YWNrU3VwcHJlc3Npb25zKHRoaXMsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgcmVhc29uOlxuICAgICAgICAgIFwiQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlIGlzIHJlcXVpcmVkIGZvciBDbG91ZFdhdGNoIExvZ3MgYWNjZXNzIC0gQ0RLIG1hbmFnZWQgcmVzb3VyY2VcIixcbiAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgXCJQb2xpY3k6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmlhbTo6YXdzOnBvbGljeS9zZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICByZWFzb246IFwiV2lsZGNhcmQgcGVybWlzc2lvbnMgcmVxdWlyZWQgZm9yIENESyBtYW5hZ2VkIHJlc291cmNlc1wiLFxuICAgICAgICBhcHBsaWVzVG86IFtcIlJlc291cmNlOjoqXCJdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUwxXCIsXG4gICAgICAgIHJlYXNvbjogXCJOT0RFSlNfMjJfWCBpcyB0aGUgbGF0ZXN0IHN1cHBvcnRlZCBydW50aW1lIGF0IGRlcGxveSB0aW1lIC0gQ0RLIG1hbmFnZWQgcmVzb3VyY2VcIixcbiAgICAgIH0sXG4gICAgXSk7XG4gIH1cbn1cbiJdfQ==