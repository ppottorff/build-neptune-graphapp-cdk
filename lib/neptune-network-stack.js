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
        ]);
    }
}
exports.NeptuneNetworkStack = NeptuneNetworkStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmVwdHVuZS1uZXR3b3JrLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmVwdHVuZS1uZXR3b3JrLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUE2RjtBQUc3RixxQ0FBMEM7QUFDMUMsa0RBQStDO0FBQy9DLGtEQUErQztBQUMvQyxzRUFBa0U7QUFDbEUsd0ZBQW1GO0FBc0JuRixNQUFhLG1CQUFvQixTQUFRLG1CQUFLO0lBSTVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBK0I7UUFDdkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUNKLFNBQVMsRUFDVCxLQUFLLEVBQ0wsZ0JBQWdCLEVBQ2hCLHdCQUF3QixFQUN4QixlQUFlLEdBQ2hCLEdBQUcsS0FBSyxDQUFDO1FBRVYsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDM0MsU0FBUztZQUNULEtBQUs7U0FDTixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFFdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDM0MsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO1lBQ2hCLGdCQUFnQjtZQUNoQix3QkFBd0I7U0FDekIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUV2Qyw2REFBNkQ7UUFDN0QsSUFBSSxlQUFlLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDN0IsSUFBSSxvQ0FBZ0IsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7Z0JBQzlDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztnQkFD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O2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFDSiwyRkFBMkY7Z0JBQzdGLFNBQVMsRUFBRTtvQkFDVCx1RkFBdUY7aUJBQ3hGO2FBQ0Y7WUFDRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQUUseURBQXlEO2dCQUNqRSxTQUFTLEVBQUUsQ0FBQyxhQUFhLENBQUM7YUFDM0I7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF4SEQsa0RBd0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMsIGF3c19lYzIsIGF3c19pYW0sIGF3c19rbXMsIGF3c19zbnMsIGF3c19yZHMgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBuZXB0dW5lIGZyb20gXCJAYXdzLWNkay9hd3MtbmVwdHVuZS1hbHBoYVwiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcbmltcG9ydCB7IE5ldHdvcmsgfSBmcm9tIFwiLi9jb25zdHJ1Y3RzL25ldHdvcmtcIjtcbmltcG9ydCB7IE5lcHR1bmUgfSBmcm9tIFwiLi9jb25zdHJ1Y3RzL25lcHR1bmVcIjtcbmltcG9ydCB7IE5lcHR1bmVTY2hlZHVsZXIgfSBmcm9tIFwiLi9jb25zdHJ1Y3RzL25lcHR1bmUtc2NoZWR1bGVyXCI7XG5pbXBvcnQgeyBQYXJhbWV0ZXJFbWFpbFN1YnNjcmliZXIgfSBmcm9tIFwiLi9jb25zdHJ1Y3RzL3BhcmFtZXRlci1lbWFpbC1zdWJzY3JpYmVyXCI7XG5cbmludGVyZmFjZSBOZXB0dW5lU2NoZWR1bGVDb25maWcge1xuICAvKiogRW5hYmxlIHNjaGVkdWxlZCBzdG9wL3N0YXJ0IG9mIE5lcHR1bmUgKGRlZmF1bHQ6IGZhbHNlKSAqL1xuICBlbmFibGVkOiBib29sZWFuO1xuICAvKiogSUFOQSB0aW1lem9uZSAoZGVmYXVsdDogQW1lcmljYS9Mb3NfQW5nZWxlcykgKi9cbiAgdGltZXpvbmU/OiBzdHJpbmc7XG4gIC8qKiBIb3VyIHRvIHN0b3AgdGhlIGNsdXN0ZXIgKGRlZmF1bHQ6IDAgPSBtaWRuaWdodCkgKi9cbiAgc3RvcEhvdXI/OiBudW1iZXI7XG4gIC8qKiBIb3VyIHRvIHN0YXJ0IHRoZSBjbHVzdGVyIChkZWZhdWx0OiAxNiA9IDRwbSkgKi9cbiAgc3RhcnRIb3VyPzogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgTmVwdHVuZU5ldHdvcmtTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gIG5hdFN1Ym5ldD86IGJvb2xlYW47XG4gIG1heEF6OiBudW1iZXI7XG4gIG5lcHR1bmVTZXJ2ZXJsc3M6IGJvb2xlYW47XG4gIG5lcHR1bmVTZXJ2ZXJsc3NDYXBhY2l0eT86IG5lcHR1bmUuU2VydmVybGVzc1NjYWxpbmdDb25maWd1cmF0aW9uO1xuICAvKiogT3B0aW9uYWwgc2NoZWR1bGUgdG8gc3RvcC9zdGFydCBOZXB0dW5lIGR1cmluZyBvZmYtaG91cnMgKi9cbiAgbmVwdHVuZVNjaGVkdWxlPzogTmVwdHVuZVNjaGVkdWxlQ29uZmlnO1xufVxuXG5leHBvcnQgY2xhc3MgTmVwdHVuZU5ldHdvcmtTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHZwYzogYXdzX2VjMi5WcGM7XG4gIHB1YmxpYyByZWFkb25seSBjbHVzdGVyOiBuZXB0dW5lLkRhdGFiYXNlQ2x1c3RlcjtcbiAgcHVibGljIHJlYWRvbmx5IG5lcHR1bmVSb2xlOiBhd3NfaWFtLlJvbGU7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBOZXB0dW5lTmV0d29ya1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHtcbiAgICAgIG5hdFN1Ym5ldCxcbiAgICAgIG1heEF6LFxuICAgICAgbmVwdHVuZVNlcnZlcmxzcyxcbiAgICAgIG5lcHR1bmVTZXJ2ZXJsc3NDYXBhY2l0eSxcbiAgICAgIG5lcHR1bmVTY2hlZHVsZSxcbiAgICB9ID0gcHJvcHM7XG5cbiAgICBjb25zdCBuZXR3b3JrID0gbmV3IE5ldHdvcmsodGhpcywgXCJuZXR3b3JrXCIsIHtcbiAgICAgIG5hdFN1Ym5ldCxcbiAgICAgIG1heEF6LFxuICAgIH0pO1xuICAgIHRoaXMudnBjID0gbmV0d29yay52cGM7XG5cbiAgICBjb25zdCBuZXB0dW5lID0gbmV3IE5lcHR1bmUodGhpcywgXCJuZXB0dW5lXCIsIHtcbiAgICAgIHZwYzogbmV0d29yay52cGMsXG4gICAgICBuZXB0dW5lU2VydmVybHNzLFxuICAgICAgbmVwdHVuZVNlcnZlcmxzc0NhcGFjaXR5LFxuICAgIH0pO1xuXG4gICAgdGhpcy5jbHVzdGVyID0gbmVwdHVuZS5jbHVzdGVyO1xuICAgIHRoaXMubmVwdHVuZVJvbGUgPSBuZXB0dW5lLm5lcHR1bmVSb2xlO1xuXG4gICAgLy8gU2NoZWR1bGUgTmVwdHVuZSBzdG9wL3N0YXJ0IHRvIHNhdmUgY29zdHMgZHVyaW5nIG9mZi1ob3Vyc1xuICAgIGlmIChuZXB0dW5lU2NoZWR1bGU/LmVuYWJsZWQpIHtcbiAgICAgIG5ldyBOZXB0dW5lU2NoZWR1bGVyKHRoaXMsIFwibmVwdHVuZS1zY2hlZHVsZXJcIiwge1xuICAgICAgICBjbHVzdGVyOiB0aGlzLmNsdXN0ZXIsXG4gICAgICAgIHRpbWV6b25lOiBuZXB0dW5lU2NoZWR1bGUudGltZXpvbmUsXG4gICAgICAgIHN0b3BIb3VyOiBuZXB0dW5lU2NoZWR1bGUuc3RvcEhvdXIsXG4gICAgICAgIHN0YXJ0SG91cjogbmVwdHVuZVNjaGVkdWxlLnN0YXJ0SG91cixcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFNOUyB0b3BpYyBmb3IgTmVwdHVuZSBjbHVzdGVyIHN0YXRlIGNoYW5nZSBub3RpZmljYXRpb25zXG4gICAgY29uc3QgbmVwdHVuZVN0YXR1c0tleSA9IG5ldyBhd3Nfa21zLktleSh0aGlzLCBcIk5lcHR1bmVTdGF0dXNUb3BpY0tleVwiLCB7XG4gICAgICBkZXNjcmlwdGlvbjogXCJLTVMga2V5IGZvciBOZXB0dW5lIHN0YXR1cyBTTlMgdG9waWMgZW5jcnlwdGlvblwiLFxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBuZXB0dW5lU3RhdHVzVG9waWMgPSBuZXcgYXdzX3Nucy5Ub3BpYyh0aGlzLCBcIk5lcHR1bmVTdGF0dXNUb3BpY1wiLCB7XG4gICAgICBkaXNwbGF5TmFtZTogXCJOZXB0dW5lIENsdXN0ZXIgU3RhdHVzIE5vdGlmaWNhdGlvbnNcIixcbiAgICAgIG1hc3RlcktleTogbmVwdHVuZVN0YXR1c0tleSxcbiAgICB9KTtcblxuICAgIC8vIEVuZm9yY2UgU1NMLW9ubHkgYWNjZXNzIHRvIHRoZSB0b3BpYyAoQXdzU29sdXRpb25zLVNOUzMpXG4gICAgbmVwdHVuZVN0YXR1c1RvcGljLmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBzaWQ6IFwiQWxsb3dQdWJsaXNoVGhyb3VnaFNTTE9ubHlcIixcbiAgICAgICAgZWZmZWN0OiBhd3NfaWFtLkVmZmVjdC5ERU5ZLFxuICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGF3c19pYW0uQW55UHJpbmNpcGFsKCldLFxuICAgICAgICBhY3Rpb25zOiBbXCJzbnM6UHVibGlzaFwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbbmVwdHVuZVN0YXR1c1RvcGljLnRvcGljQXJuXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIEJvb2w6IHsgXCJhd3M6U2VjdXJlVHJhbnNwb3J0XCI6IFwiZmFsc2VcIiB9LFxuICAgICAgICB9LFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQWxsb3cgUkRTL05lcHR1bmUgdG8gcHVibGlzaCB0byB0aGlzIGVuY3J5cHRlZCB0b3BpY1xuICAgIG5lcHR1bmVTdGF0dXNUb3BpYy5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgc2lkOiBcIkFsbG93UkRTUHVibGlzaFwiLFxuICAgICAgICBlZmZlY3Q6IGF3c19pYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGF3c19pYW0uU2VydmljZVByaW5jaXBhbChcImV2ZW50cy5yZHMuYW1hem9uYXdzLmNvbVwiKV0sXG4gICAgICAgIGFjdGlvbnM6IFtcInNuczpQdWJsaXNoXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtuZXB0dW5lU3RhdHVzVG9waWMudG9waWNBcm5dLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgbmVwdHVuZVN0YXR1c0tleS5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgc2lkOiBcIkFsbG93UkRTVXNlS2V5XCIsXG4gICAgICAgIGVmZmVjdDogYXdzX2lhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKFwiZXZlbnRzLnJkcy5hbWF6b25hd3MuY29tXCIpXSxcbiAgICAgICAgYWN0aW9uczogW1wia21zOkRlY3J5cHRcIiwgXCJrbXM6R2VuZXJhdGVEYXRhS2V5KlwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gU3Vic2NyaWJlIGVtYWlsIGFkZHJlc3NlcyBmcm9tIFBhcmFtZXRlciBTdG9yZVxuICAgIG5ldyBQYXJhbWV0ZXJFbWFpbFN1YnNjcmliZXIodGhpcywgXCJOZXB0dW5lRW1haWxTdWJzY3JpYmVyXCIsIHtcbiAgICAgIHRvcGljQXJuOiBuZXB0dW5lU3RhdHVzVG9waWMudG9waWNBcm4sXG4gICAgICBwYXJhbWV0ZXJOYW1lOiBcIi9nbG9iYWwtYXBwLXBhcmFtcy9yZHNub3RpZmljYXRpb25lbWFpbHNcIixcbiAgICB9KTtcblxuICAgIC8vIFJEUyBFdmVudCBTdWJzY3JpcHRpb246IG5vdGlmeSBvbiBjbHVzdGVyIGZhaWxvdmVyLCBtYWludGVuYW5jZSwgYW5kIG5vdGlmaWNhdGlvbiBldmVudHNcbiAgICBuZXcgYXdzX3Jkcy5DZm5FdmVudFN1YnNjcmlwdGlvbih0aGlzLCBcIk5lcHR1bmVFdmVudFN1YnNjcmlwdGlvblwiLCB7XG4gICAgICBzbnNUb3BpY0FybjogbmVwdHVuZVN0YXR1c1RvcGljLnRvcGljQXJuLFxuICAgICAgc291cmNlVHlwZTogXCJkYi1jbHVzdGVyXCIsXG4gICAgICBzb3VyY2VJZHM6IFt0aGlzLmNsdXN0ZXIuY2x1c3RlcklkZW50aWZpZXJdLFxuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIGV2ZW50Q2F0ZWdvcmllczogW1wiZmFpbG92ZXJcIiwgXCJmYWlsdXJlXCIsIFwibWFpbnRlbmFuY2VcIiwgXCJub3RpZmljYXRpb25cIl0sXG4gICAgfSk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIGNkay1uYWcgc3RhY2stbGV2ZWwgc3VwcHJlc3Npb25zXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkU3RhY2tTdXBwcmVzc2lvbnModGhpcywgW1xuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICByZWFzb246XG4gICAgICAgICAgXCJBV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUgaXMgcmVxdWlyZWQgZm9yIENsb3VkV2F0Y2ggTG9ncyBhY2Nlc3MgLSBDREsgbWFuYWdlZCByZXNvdXJjZVwiLFxuICAgICAgICBhcHBsaWVzVG86IFtcbiAgICAgICAgICBcIlBvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGVcIixcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgIHJlYXNvbjogXCJXaWxkY2FyZCBwZXJtaXNzaW9ucyByZXF1aXJlZCBmb3IgQ0RLIG1hbmFnZWQgcmVzb3VyY2VzXCIsXG4gICAgICAgIGFwcGxpZXNUbzogW1wiUmVzb3VyY2U6OipcIl0sXG4gICAgICB9LFxuICAgIF0pO1xuICB9XG59XG4iXX0=