"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeptuneNetworkStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cdk_nag_1 = require("cdk-nag");
const network_1 = require("./constructs/network");
const neptune_1 = require("./constructs/neptune");
const neptune_scheduler_1 = require("./constructs/neptune-scheduler");
const bastion_1 = require("./constructs/bastion");
const parameter_email_subscriber_1 = require("./constructs/parameter-email-subscriber");
class NeptuneNetworkStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { natSubnet, maxAz, neptuneServerlss, neptuneServerlssCapacity, neptuneSchedule, bastion: bastionConfig, } = props;
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
        // Bastion host for remote Neptune access via SSM
        if (bastionConfig?.enabled) {
            new bastion_1.Bastion(this, "bastion", {
                vpc: this.vpc,
                cluster: this.cluster,
                timezone: bastionConfig.timezone,
                stopHour: bastionConfig.stopHour,
            });
        }
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
        // EC2 Instance State-Change Email Notifications
        // -----------------------------------------------------------------------
        const ec2StatusKey = new aws_cdk_lib_1.aws_kms.Key(this, "EC2StatusTopicKey", {
            description: "KMS key for EC2 status SNS topic encryption",
            enableKeyRotation: true,
        });
        const ec2StatusTopic = new aws_cdk_lib_1.aws_sns.Topic(this, "EC2StatusTopic", {
            displayName: "EC2 Instance State-Change Notifications",
            masterKey: ec2StatusKey,
        });
        // Enforce SSL-only access to the topic (AwsSolutions-SNS3)
        ec2StatusTopic.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            sid: "AllowPublishThroughSSLOnly",
            effect: aws_cdk_lib_1.aws_iam.Effect.DENY,
            principals: [new aws_cdk_lib_1.aws_iam.AnyPrincipal()],
            actions: ["sns:Publish"],
            resources: [ec2StatusTopic.topicArn],
            conditions: {
                Bool: { "aws:SecureTransport": "false" },
            },
        }));
        // Allow EventBridge to publish to the encrypted topic
        ec2StatusTopic.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            sid: "AllowEventBridgePublish",
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            principals: [new aws_cdk_lib_1.aws_iam.ServicePrincipal("events.amazonaws.com")],
            actions: ["sns:Publish"],
            resources: [ec2StatusTopic.topicArn],
        }));
        ec2StatusKey.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            sid: "AllowEventBridgeUseKey",
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            principals: [new aws_cdk_lib_1.aws_iam.ServicePrincipal("events.amazonaws.com")],
            actions: ["kms:Decrypt", "kms:GenerateDataKey*"],
            resources: ["*"],
        }));
        // Subscribe the same email addresses from Parameter Store
        new parameter_email_subscriber_1.ParameterEmailSubscriber(this, "EC2EmailSubscriber", {
            topicArn: ec2StatusTopic.topicArn,
            parameterName: "/global-app-params/rdsnotificationemails",
        });
        // EventBridge rule: EC2 instance state-change (started / stopped)
        new aws_cdk_lib_1.aws_events.Rule(this, "EC2InstanceStateChangeRule", {
            ruleName: "ec2-instance-state-change-notifications",
            description: "Send email when any EC2 instance in us-east-1 is started or stopped",
            eventPattern: {
                source: ["aws.ec2"],
                detailType: ["EC2 Instance State-change Notification"],
                detail: {
                    state: ["running", "stopped"],
                },
            },
            targets: [
                new aws_cdk_lib_1.aws_events_targets.SnsTopic(ec2StatusTopic, {
                    message: aws_cdk_lib_1.aws_events.RuleTargetInput.fromText(`EC2 Instance State Change — Instance ${aws_cdk_lib_1.aws_events.EventField.fromPath("$.detail.instance-id")} is now ${aws_cdk_lib_1.aws_events.EventField.fromPath("$.detail.state")} (Account: ${aws_cdk_lib_1.aws_events.EventField.fromPath("$.account")}, Region: ${aws_cdk_lib_1.aws_events.EventField.fromPath("$.region")})`),
                }),
            ],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmVwdHVuZS1uZXR3b3JrLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibmVwdHVuZS1uZXR3b3JrLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUE2SDtBQUc3SCxxQ0FBMEM7QUFDMUMsa0RBQStDO0FBQy9DLGtEQUErQztBQUMvQyxzRUFBa0U7QUFDbEUsa0RBQStDO0FBQy9DLHdGQUFtRjtBQThCbkYsTUFBYSxtQkFBb0IsU0FBUSxtQkFBSztJQUk1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFDSixTQUFTLEVBQ1QsS0FBSyxFQUNMLGdCQUFnQixFQUNoQix3QkFBd0IsRUFDeEIsZUFBZSxFQUNmLE9BQU8sRUFBRSxhQUFhLEdBQ3ZCLEdBQUcsS0FBSyxDQUFDO1FBRVYsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDM0MsU0FBUztZQUNULEtBQUs7U0FDTixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFFdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDM0MsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO1lBQ2hCLGdCQUFnQjtZQUNoQix3QkFBd0I7U0FDekIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUV2QyxpREFBaUQ7UUFDakQsSUFBSSxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDM0IsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7Z0JBQzNC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QU8sRUFBRTtnQkFDUCxJQUFJLGdDQUFrQixDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUU7b0JBQzlDLE9BQU8sRUFBRSx3QkFBVSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQzFDLHdDQUNFLHdCQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FDdkQsV0FDRSx3QkFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQ2pELGNBQ0Usd0JBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FDNUMsYUFDRSx3QkFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUMzQyxHQUFHLENBQ0o7aUJBQ0YsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsMEVBQTBFO1FBQzFFLG1DQUFtQztRQUNuQywwRUFBMEU7UUFDMUUseUJBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUU7WUFDekM7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLDJGQUEyRjtnQkFDN0YsU0FBUyxFQUFFO29CQUNULHVGQUF1RjtpQkFDeEY7YUFDRjtZQUNEO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFBRSx5REFBeUQ7Z0JBQ2pFLFNBQVMsRUFBRSxDQUFDLGFBQWEsQ0FBQzthQUMzQjtZQUNEO2dCQUNFLEVBQUUsRUFBRSxpQkFBaUI7Z0JBQ3JCLE1BQU0sRUFBRSxtRkFBbUY7YUFDNUY7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUExTkQsa0RBME5DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMsIGF3c19lYzIsIGF3c19ldmVudHMsIGF3c19ldmVudHNfdGFyZ2V0cywgYXdzX2lhbSwgYXdzX2ttcywgYXdzX3NucywgYXdzX3JkcyB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCAqIGFzIG5lcHR1bmUgZnJvbSBcIkBhd3MtY2RrL2F3cy1uZXB0dW5lLWFscGhhXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuaW1wb3J0IHsgTmV0d29yayB9IGZyb20gXCIuL2NvbnN0cnVjdHMvbmV0d29ya1wiO1xuaW1wb3J0IHsgTmVwdHVuZSB9IGZyb20gXCIuL2NvbnN0cnVjdHMvbmVwdHVuZVwiO1xuaW1wb3J0IHsgTmVwdHVuZVNjaGVkdWxlciB9IGZyb20gXCIuL2NvbnN0cnVjdHMvbmVwdHVuZS1zY2hlZHVsZXJcIjtcbmltcG9ydCB7IEJhc3Rpb24gfSBmcm9tIFwiLi9jb25zdHJ1Y3RzL2Jhc3Rpb25cIjtcbmltcG9ydCB7IFBhcmFtZXRlckVtYWlsU3Vic2NyaWJlciB9IGZyb20gXCIuL2NvbnN0cnVjdHMvcGFyYW1ldGVyLWVtYWlsLXN1YnNjcmliZXJcIjtcblxuaW50ZXJmYWNlIE5lcHR1bmVTY2hlZHVsZUNvbmZpZyB7XG4gIC8qKiBFbmFibGUgc2NoZWR1bGVkIHN0b3Avc3RhcnQgb2YgTmVwdHVuZSAoZGVmYXVsdDogZmFsc2UpICovXG4gIGVuYWJsZWQ6IGJvb2xlYW47XG4gIC8qKiBJQU5BIHRpbWV6b25lIChkZWZhdWx0OiBBbWVyaWNhL0xvc19BbmdlbGVzKSAqL1xuICB0aW1lem9uZT86IHN0cmluZztcbiAgLyoqIEhvdXIgdG8gc3RvcCB0aGUgY2x1c3RlciAoZGVmYXVsdDogMCA9IG1pZG5pZ2h0KSAqL1xuICBzdG9wSG91cj86IG51bWJlcjtcbiAgLyoqIEhvdXIgdG8gc3RhcnQgdGhlIGNsdXN0ZXIgKGRlZmF1bHQ6IDE2ID0gNHBtKSAqL1xuICBzdGFydEhvdXI/OiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBOZXB0dW5lTmV0d29ya1N0YWNrUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgbmF0U3VibmV0PzogYm9vbGVhbjtcbiAgbWF4QXo6IG51bWJlcjtcbiAgbmVwdHVuZVNlcnZlcmxzczogYm9vbGVhbjtcbiAgbmVwdHVuZVNlcnZlcmxzc0NhcGFjaXR5PzogbmVwdHVuZS5TZXJ2ZXJsZXNzU2NhbGluZ0NvbmZpZ3VyYXRpb247XG4gIC8qKiBPcHRpb25hbCBzY2hlZHVsZSB0byBzdG9wL3N0YXJ0IE5lcHR1bmUgZHVyaW5nIG9mZi1ob3VycyAqL1xuICBuZXB0dW5lU2NoZWR1bGU/OiBOZXB0dW5lU2NoZWR1bGVDb25maWc7XG4gIC8qKiBFbmFibGUgYSBiYXN0aW9uIGhvc3QgZm9yIHJlbW90ZSBOZXB0dW5lIGFjY2VzcyB2aWEgU1NNICovXG4gIGJhc3Rpb24/OiB7XG4gICAgZW5hYmxlZDogYm9vbGVhbjtcbiAgICAvKiogSUFOQSB0aW1lem9uZSAoZGVmYXVsdDogQW1lcmljYS9Mb3NfQW5nZWxlcykgKi9cbiAgICB0aW1lem9uZT86IHN0cmluZztcbiAgICAvKiogSG91ciB0byBhdXRvLXN0b3AgdGhlIGJhc3Rpb24gKGRlZmF1bHQ6IDAgPSBtaWRuaWdodCkgKi9cbiAgICBzdG9wSG91cj86IG51bWJlcjtcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIE5lcHR1bmVOZXR3b3JrU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB2cGM6IGF3c19lYzIuVnBjO1xuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogbmVwdHVuZS5EYXRhYmFzZUNsdXN0ZXI7XG4gIHB1YmxpYyByZWFkb25seSBuZXB0dW5lUm9sZTogYXdzX2lhbS5Sb2xlO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTmVwdHVuZU5ldHdvcmtTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7XG4gICAgICBuYXRTdWJuZXQsXG4gICAgICBtYXhBeixcbiAgICAgIG5lcHR1bmVTZXJ2ZXJsc3MsXG4gICAgICBuZXB0dW5lU2VydmVybHNzQ2FwYWNpdHksXG4gICAgICBuZXB0dW5lU2NoZWR1bGUsXG4gICAgICBiYXN0aW9uOiBiYXN0aW9uQ29uZmlnLFxuICAgIH0gPSBwcm9wcztcblxuICAgIGNvbnN0IG5ldHdvcmsgPSBuZXcgTmV0d29yayh0aGlzLCBcIm5ldHdvcmtcIiwge1xuICAgICAgbmF0U3VibmV0LFxuICAgICAgbWF4QXosXG4gICAgfSk7XG4gICAgdGhpcy52cGMgPSBuZXR3b3JrLnZwYztcblxuICAgIGNvbnN0IG5lcHR1bmUgPSBuZXcgTmVwdHVuZSh0aGlzLCBcIm5lcHR1bmVcIiwge1xuICAgICAgdnBjOiBuZXR3b3JrLnZwYyxcbiAgICAgIG5lcHR1bmVTZXJ2ZXJsc3MsXG4gICAgICBuZXB0dW5lU2VydmVybHNzQ2FwYWNpdHksXG4gICAgfSk7XG5cbiAgICB0aGlzLmNsdXN0ZXIgPSBuZXB0dW5lLmNsdXN0ZXI7XG4gICAgdGhpcy5uZXB0dW5lUm9sZSA9IG5lcHR1bmUubmVwdHVuZVJvbGU7XG5cbiAgICAvLyBCYXN0aW9uIGhvc3QgZm9yIHJlbW90ZSBOZXB0dW5lIGFjY2VzcyB2aWEgU1NNXG4gICAgaWYgKGJhc3Rpb25Db25maWc/LmVuYWJsZWQpIHtcbiAgICAgIG5ldyBCYXN0aW9uKHRoaXMsIFwiYmFzdGlvblwiLCB7XG4gICAgICAgIHZwYzogdGhpcy52cGMsXG4gICAgICAgIGNsdXN0ZXI6IHRoaXMuY2x1c3RlcixcbiAgICAgICAgdGltZXpvbmU6IGJhc3Rpb25Db25maWcudGltZXpvbmUsXG4gICAgICAgIHN0b3BIb3VyOiBiYXN0aW9uQ29uZmlnLnN0b3BIb3VyLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gU2NoZWR1bGUgTmVwdHVuZSBzdG9wL3N0YXJ0IHRvIHNhdmUgY29zdHMgZHVyaW5nIG9mZi1ob3Vyc1xuICAgIGlmIChuZXB0dW5lU2NoZWR1bGU/LmVuYWJsZWQpIHtcbiAgICAgIG5ldyBOZXB0dW5lU2NoZWR1bGVyKHRoaXMsIFwibmVwdHVuZS1zY2hlZHVsZXJcIiwge1xuICAgICAgICBjbHVzdGVyOiB0aGlzLmNsdXN0ZXIsXG4gICAgICAgIHRpbWV6b25lOiBuZXB0dW5lU2NoZWR1bGUudGltZXpvbmUsXG4gICAgICAgIHN0b3BIb3VyOiBuZXB0dW5lU2NoZWR1bGUuc3RvcEhvdXIsXG4gICAgICAgIHN0YXJ0SG91cjogbmVwdHVuZVNjaGVkdWxlLnN0YXJ0SG91cixcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFNOUyB0b3BpYyBmb3IgTmVwdHVuZSBjbHVzdGVyIHN0YXRlIGNoYW5nZSBub3RpZmljYXRpb25zXG4gICAgY29uc3QgbmVwdHVuZVN0YXR1c0tleSA9IG5ldyBhd3Nfa21zLktleSh0aGlzLCBcIk5lcHR1bmVTdGF0dXNUb3BpY0tleVwiLCB7XG4gICAgICBkZXNjcmlwdGlvbjogXCJLTVMga2V5IGZvciBOZXB0dW5lIHN0YXR1cyBTTlMgdG9waWMgZW5jcnlwdGlvblwiLFxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBuZXB0dW5lU3RhdHVzVG9waWMgPSBuZXcgYXdzX3Nucy5Ub3BpYyh0aGlzLCBcIk5lcHR1bmVTdGF0dXNUb3BpY1wiLCB7XG4gICAgICBkaXNwbGF5TmFtZTogXCJOZXB0dW5lIENsdXN0ZXIgU3RhdHVzIE5vdGlmaWNhdGlvbnNcIixcbiAgICAgIG1hc3RlcktleTogbmVwdHVuZVN0YXR1c0tleSxcbiAgICB9KTtcblxuICAgIC8vIEVuZm9yY2UgU1NMLW9ubHkgYWNjZXNzIHRvIHRoZSB0b3BpYyAoQXdzU29sdXRpb25zLVNOUzMpXG4gICAgbmVwdHVuZVN0YXR1c1RvcGljLmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBzaWQ6IFwiQWxsb3dQdWJsaXNoVGhyb3VnaFNTTE9ubHlcIixcbiAgICAgICAgZWZmZWN0OiBhd3NfaWFtLkVmZmVjdC5ERU5ZLFxuICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGF3c19pYW0uQW55UHJpbmNpcGFsKCldLFxuICAgICAgICBhY3Rpb25zOiBbXCJzbnM6UHVibGlzaFwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbbmVwdHVuZVN0YXR1c1RvcGljLnRvcGljQXJuXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIEJvb2w6IHsgXCJhd3M6U2VjdXJlVHJhbnNwb3J0XCI6IFwiZmFsc2VcIiB9LFxuICAgICAgICB9LFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQWxsb3cgUkRTL05lcHR1bmUgdG8gcHVibGlzaCB0byB0aGlzIGVuY3J5cHRlZCB0b3BpY1xuICAgIG5lcHR1bmVTdGF0dXNUb3BpYy5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgc2lkOiBcIkFsbG93UkRTUHVibGlzaFwiLFxuICAgICAgICBlZmZlY3Q6IGF3c19pYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGF3c19pYW0uU2VydmljZVByaW5jaXBhbChcImV2ZW50cy5yZHMuYW1hem9uYXdzLmNvbVwiKV0sXG4gICAgICAgIGFjdGlvbnM6IFtcInNuczpQdWJsaXNoXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtuZXB0dW5lU3RhdHVzVG9waWMudG9waWNBcm5dLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgbmVwdHVuZVN0YXR1c0tleS5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgc2lkOiBcIkFsbG93UkRTVXNlS2V5XCIsXG4gICAgICAgIGVmZmVjdDogYXdzX2lhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKFwiZXZlbnRzLnJkcy5hbWF6b25hd3MuY29tXCIpXSxcbiAgICAgICAgYWN0aW9uczogW1wia21zOkRlY3J5cHRcIiwgXCJrbXM6R2VuZXJhdGVEYXRhS2V5KlwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gU3Vic2NyaWJlIGVtYWlsIGFkZHJlc3NlcyBmcm9tIFBhcmFtZXRlciBTdG9yZVxuICAgIG5ldyBQYXJhbWV0ZXJFbWFpbFN1YnNjcmliZXIodGhpcywgXCJOZXB0dW5lRW1haWxTdWJzY3JpYmVyXCIsIHtcbiAgICAgIHRvcGljQXJuOiBuZXB0dW5lU3RhdHVzVG9waWMudG9waWNBcm4sXG4gICAgICBwYXJhbWV0ZXJOYW1lOiBcIi9nbG9iYWwtYXBwLXBhcmFtcy9yZHNub3RpZmljYXRpb25lbWFpbHNcIixcbiAgICB9KTtcblxuICAgIC8vIFJEUyBFdmVudCBTdWJzY3JpcHRpb246IG5vdGlmeSBvbiBjbHVzdGVyIGZhaWxvdmVyLCBtYWludGVuYW5jZSwgYW5kIG5vdGlmaWNhdGlvbiBldmVudHNcbiAgICBuZXcgYXdzX3Jkcy5DZm5FdmVudFN1YnNjcmlwdGlvbih0aGlzLCBcIk5lcHR1bmVFdmVudFN1YnNjcmlwdGlvblwiLCB7XG4gICAgICBzbnNUb3BpY0FybjogbmVwdHVuZVN0YXR1c1RvcGljLnRvcGljQXJuLFxuICAgICAgc291cmNlVHlwZTogXCJkYi1jbHVzdGVyXCIsXG4gICAgICBzb3VyY2VJZHM6IFt0aGlzLmNsdXN0ZXIuY2x1c3RlcklkZW50aWZpZXJdLFxuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIGV2ZW50Q2F0ZWdvcmllczogW1wiZmFpbG92ZXJcIiwgXCJmYWlsdXJlXCIsIFwibWFpbnRlbmFuY2VcIiwgXCJub3RpZmljYXRpb25cIl0sXG4gICAgfSk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIEVDMiBJbnN0YW5jZSBTdGF0ZS1DaGFuZ2UgRW1haWwgTm90aWZpY2F0aW9uc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgY29uc3QgZWMyU3RhdHVzS2V5ID0gbmV3IGF3c19rbXMuS2V5KHRoaXMsIFwiRUMyU3RhdHVzVG9waWNLZXlcIiwge1xuICAgICAgZGVzY3JpcHRpb246IFwiS01TIGtleSBmb3IgRUMyIHN0YXR1cyBTTlMgdG9waWMgZW5jcnlwdGlvblwiLFxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBlYzJTdGF0dXNUb3BpYyA9IG5ldyBhd3Nfc25zLlRvcGljKHRoaXMsIFwiRUMyU3RhdHVzVG9waWNcIiwge1xuICAgICAgZGlzcGxheU5hbWU6IFwiRUMyIEluc3RhbmNlIFN0YXRlLUNoYW5nZSBOb3RpZmljYXRpb25zXCIsXG4gICAgICBtYXN0ZXJLZXk6IGVjMlN0YXR1c0tleSxcbiAgICB9KTtcblxuICAgIC8vIEVuZm9yY2UgU1NMLW9ubHkgYWNjZXNzIHRvIHRoZSB0b3BpYyAoQXdzU29sdXRpb25zLVNOUzMpXG4gICAgZWMyU3RhdHVzVG9waWMuYWRkVG9SZXNvdXJjZVBvbGljeShcbiAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHNpZDogXCJBbGxvd1B1Ymxpc2hUaHJvdWdoU1NMT25seVwiLFxuICAgICAgICBlZmZlY3Q6IGF3c19pYW0uRWZmZWN0LkRFTlksXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgYXdzX2lhbS5BbnlQcmluY2lwYWwoKV0sXG4gICAgICAgIGFjdGlvbnM6IFtcInNuczpQdWJsaXNoXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtlYzJTdGF0dXNUb3BpYy50b3BpY0Fybl0sXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICBCb29sOiB7IFwiYXdzOlNlY3VyZVRyYW5zcG9ydFwiOiBcImZhbHNlXCIgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIEFsbG93IEV2ZW50QnJpZGdlIHRvIHB1Ymxpc2ggdG8gdGhlIGVuY3J5cHRlZCB0b3BpY1xuICAgIGVjMlN0YXR1c1RvcGljLmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBzaWQ6IFwiQWxsb3dFdmVudEJyaWRnZVB1Ymxpc2hcIixcbiAgICAgICAgZWZmZWN0OiBhd3NfaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBhd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJldmVudHMuYW1hem9uYXdzLmNvbVwiKV0sXG4gICAgICAgIGFjdGlvbnM6IFtcInNuczpQdWJsaXNoXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtlYzJTdGF0dXNUb3BpYy50b3BpY0Fybl0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBlYzJTdGF0dXNLZXkuYWRkVG9SZXNvdXJjZVBvbGljeShcbiAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHNpZDogXCJBbGxvd0V2ZW50QnJpZGdlVXNlS2V5XCIsXG4gICAgICAgIGVmZmVjdDogYXdzX2lhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKFwiZXZlbnRzLmFtYXpvbmF3cy5jb21cIildLFxuICAgICAgICBhY3Rpb25zOiBbXCJrbXM6RGVjcnlwdFwiLCBcImttczpHZW5lcmF0ZURhdGFLZXkqXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBTdWJzY3JpYmUgdGhlIHNhbWUgZW1haWwgYWRkcmVzc2VzIGZyb20gUGFyYW1ldGVyIFN0b3JlXG4gICAgbmV3IFBhcmFtZXRlckVtYWlsU3Vic2NyaWJlcih0aGlzLCBcIkVDMkVtYWlsU3Vic2NyaWJlclwiLCB7XG4gICAgICB0b3BpY0FybjogZWMyU3RhdHVzVG9waWMudG9waWNBcm4sXG4gICAgICBwYXJhbWV0ZXJOYW1lOiBcIi9nbG9iYWwtYXBwLXBhcmFtcy9yZHNub3RpZmljYXRpb25lbWFpbHNcIixcbiAgICB9KTtcblxuICAgIC8vIEV2ZW50QnJpZGdlIHJ1bGU6IEVDMiBpbnN0YW5jZSBzdGF0ZS1jaGFuZ2UgKHN0YXJ0ZWQgLyBzdG9wcGVkKVxuICAgIG5ldyBhd3NfZXZlbnRzLlJ1bGUodGhpcywgXCJFQzJJbnN0YW5jZVN0YXRlQ2hhbmdlUnVsZVwiLCB7XG4gICAgICBydWxlTmFtZTogXCJlYzItaW5zdGFuY2Utc3RhdGUtY2hhbmdlLW5vdGlmaWNhdGlvbnNcIixcbiAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICBcIlNlbmQgZW1haWwgd2hlbiBhbnkgRUMyIGluc3RhbmNlIGluIHVzLWVhc3QtMSBpcyBzdGFydGVkIG9yIHN0b3BwZWRcIixcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFtcImF3cy5lYzJcIl0sXG4gICAgICAgIGRldGFpbFR5cGU6IFtcIkVDMiBJbnN0YW5jZSBTdGF0ZS1jaGFuZ2UgTm90aWZpY2F0aW9uXCJdLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBzdGF0ZTogW1wicnVubmluZ1wiLCBcInN0b3BwZWRcIl0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgdGFyZ2V0czogW1xuICAgICAgICBuZXcgYXdzX2V2ZW50c190YXJnZXRzLlNuc1RvcGljKGVjMlN0YXR1c1RvcGljLCB7XG4gICAgICAgICAgbWVzc2FnZTogYXdzX2V2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbVRleHQoXG4gICAgICAgICAgICBgRUMyIEluc3RhbmNlIFN0YXRlIENoYW5nZSDigJQgSW5zdGFuY2UgJHtcbiAgICAgICAgICAgICAgYXdzX2V2ZW50cy5FdmVudEZpZWxkLmZyb21QYXRoKFwiJC5kZXRhaWwuaW5zdGFuY2UtaWRcIilcbiAgICAgICAgICAgIH0gaXMgbm93ICR7XG4gICAgICAgICAgICAgIGF3c19ldmVudHMuRXZlbnRGaWVsZC5mcm9tUGF0aChcIiQuZGV0YWlsLnN0YXRlXCIpXG4gICAgICAgICAgICB9IChBY2NvdW50OiAke1xuICAgICAgICAgICAgICBhd3NfZXZlbnRzLkV2ZW50RmllbGQuZnJvbVBhdGgoXCIkLmFjY291bnRcIilcbiAgICAgICAgICAgIH0sIFJlZ2lvbjogJHtcbiAgICAgICAgICAgICAgYXdzX2V2ZW50cy5FdmVudEZpZWxkLmZyb21QYXRoKFwiJC5yZWdpb25cIilcbiAgICAgICAgICAgIH0pYFxuICAgICAgICAgICksXG4gICAgICAgIH0pLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gY2RrLW5hZyBzdGFjay1sZXZlbCBzdXBwcmVzc2lvbnNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRTdGFja1N1cHByZXNzaW9ucyh0aGlzLCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICAgIHJlYXNvbjpcbiAgICAgICAgICBcIkFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZSBpcyByZXF1aXJlZCBmb3IgQ2xvdWRXYXRjaCBMb2dzIGFjY2VzcyAtIENESyBtYW5hZ2VkIHJlc291cmNlXCIsXG4gICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgIFwiUG9saWN5Ojphcm46PEFXUzo6UGFydGl0aW9uPjppYW06OmF3czpwb2xpY3kvc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZVwiLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgcmVhc29uOiBcIldpbGRjYXJkIHBlcm1pc3Npb25zIHJlcXVpcmVkIGZvciBDREsgbWFuYWdlZCByZXNvdXJjZXNcIixcbiAgICAgICAgYXBwbGllc1RvOiBbXCJSZXNvdXJjZTo6KlwiXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1MMVwiLFxuICAgICAgICByZWFzb246IFwiTk9ERUpTXzIyX1ggaXMgdGhlIGxhdGVzdCBzdXBwb3J0ZWQgcnVudGltZSBhdCBkZXBsb3kgdGltZSAtIENESyBtYW5hZ2VkIHJlc291cmNlXCIsXG4gICAgICB9LFxuICAgIF0pO1xuICB9XG59XG4iXX0=