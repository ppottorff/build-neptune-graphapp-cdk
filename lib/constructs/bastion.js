"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bastion = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const path = require("path");
class Bastion extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { vpc, cluster, timezone = "America/Los_Angeles", stopHour = 0 } = props;
        // -----------------------------------------------------------------------
        // Bastion Host in a public subnet, accessible via SSM (no SSH keys)
        // -----------------------------------------------------------------------
        this.instance = new aws_cdk_lib_1.aws_ec2.BastionHostLinux(this, "bastion-host", {
            vpc,
            subnetSelection: { subnetType: aws_cdk_lib_1.aws_ec2.SubnetType.PUBLIC },
            instanceType: aws_cdk_lib_1.aws_ec2.InstanceType.of(aws_cdk_lib_1.aws_ec2.InstanceClass.T3, aws_cdk_lib_1.aws_ec2.InstanceSize.NANO),
        });
        // Allow the bastion to reach Neptune on port 8182
        cluster.connections.allowDefaultPortFrom(this.instance);
        // -----------------------------------------------------------------------
        // Lambda that stops the bastion instance
        // -----------------------------------------------------------------------
        const stopFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, "bastion-stop-fn", {
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_22_X,
            tracing: aws_cdk_lib_1.aws_lambda.Tracing.ACTIVE,
            entry: path.join(__dirname, "..", "..", "api", "lambda", "bastionScheduler", "index.ts"),
            handler: "handler",
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            environment: {
                INSTANCE_ID: this.instance.instanceId,
            },
            bundling: {
                externalModules: ["@aws-sdk/*"],
                minify: true,
                sourceMap: true,
            },
        });
        stopFn.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            actions: ["ec2:StopInstances", "ec2:DescribeInstances"],
            resources: [
                aws_cdk_lib_1.Stack.of(this).formatArn({
                    service: "ec2",
                    resource: "instance",
                    resourceName: this.instance.instanceId,
                }),
            ],
        }));
        // -----------------------------------------------------------------------
        // EventBridge Scheduler role
        // -----------------------------------------------------------------------
        const schedulerRole = new aws_cdk_lib_1.aws_iam.Role(this, "bastion-scheduler-role", {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal("scheduler.amazonaws.com"),
        });
        stopFn.grantInvoke(schedulerRole);
        // -----------------------------------------------------------------------
        // Schedule: stop bastion daily at the configured hour
        // -----------------------------------------------------------------------
        new aws_cdk_lib_1.aws_scheduler.CfnSchedule(this, "bastion-stop-schedule", {
            name: "bastion-stop-schedule",
            description: `Stop bastion host at ${stopHour}:00 ${timezone}`,
            scheduleExpressionTimezone: timezone,
            scheduleExpression: `cron(0 ${stopHour} * * ? *)`,
            flexibleTimeWindow: { mode: "OFF" },
            target: {
                arn: stopFn.functionArn,
                roleArn: schedulerRole.roleArn,
                input: JSON.stringify({ action: "stop" }),
            },
            state: "ENABLED",
        });
        // -----------------------------------------------------------------------
        // cdk-nag suppressions
        // -----------------------------------------------------------------------
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.instance, [
            {
                id: "AwsSolutions-EC26",
                reason: "Bastion host is ephemeral dev tooling; EBS encryption not required",
            },
            {
                id: "AwsSolutions-EC28",
                reason: "Detailed monitoring not required for dev bastion",
            },
            {
                id: "AwsSolutions-EC29",
                reason: "Termination protection not required for dev bastion",
            },
            {
                id: "AwsSolutions-IAM4",
                reason: "SSM managed policies are required for Session Manager access on the bastion host",
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "Wildcard permissions are required by SSM managed policies on the bastion host",
            },
        ], true);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(stopFn, [
            {
                id: "AwsSolutions-IAM4",
                reason: "AWSLambdaBasicExecutionRole is required for CloudWatch Logs access",
                appliesTo: [
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                ],
            },
            {
                id: "AwsSolutions-L1",
                reason: "NODEJS_22_X is the latest supported runtime at deploy time",
            },
        ], true);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(schedulerRole, [
            {
                id: "AwsSolutions-IAM5",
                reason: "Wildcard on Lambda ARN version is required by grantInvoke for EventBridge Scheduler",
            },
        ], true);
    }
}
exports.Bastion = Bastion;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhc3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBU3FCO0FBRXJCLHFDQUEwQztBQUMxQywyQ0FBdUM7QUFDdkMsNkJBQTZCO0FBVzdCLE1BQWEsT0FBUSxTQUFRLHNCQUFTO0lBR3BDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBbUI7UUFDM0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLEdBQUcscUJBQXFCLEVBQUUsUUFBUSxHQUFHLENBQUMsRUFBRSxHQUNwRSxLQUFLLENBQUM7UUFFUiwwRUFBMEU7UUFDMUUsb0VBQW9FO1FBQ3BFLDBFQUEwRTtRQUMxRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUkscUJBQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2pFLEdBQUc7WUFDSCxlQUFlLEVBQUUsRUFBRSxVQUFVLEVBQUUscUJBQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFO1lBQzFELFlBQVksRUFBRSxxQkFBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQ25DLHFCQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFDeEIscUJBQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUMxQjtTQUNGLENBQUMsQ0FBQztRQUVILGtEQUFrRDtRQUNsRCxPQUFPLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV4RCwwRUFBMEU7UUFDMUUseUNBQXlDO1FBQ3pDLDBFQUEwRTtRQUMxRSxNQUFNLE1BQU0sR0FBRyxJQUFJLCtCQUFpQixDQUFDLGNBQWMsQ0FDakQsSUFBSSxFQUNKLGlCQUFpQixFQUNqQjtZQUNFLE9BQU8sRUFBRSx3QkFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ3ZDLE9BQU8s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Q0FDckMsTUFBTSxFQUNOO1lBQ0U7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLG9FQUFvRTtnQkFDdEUsU0FBUyxFQUFFO29CQUNULHVGQUF1RjtpQkFDeEY7YUFDRjtZQUNEO2dCQUNFLEVBQUUsRUFBRSxpQkFBaUI7Z0JBQ3JCLE1BQU0sRUFBRSw0REFBNEQ7YUFDckU7U0FDRixFQUNELElBQUksQ0FDTCxDQUFDO1FBRUYseUJBQWUsQ0FBQyx1QkFBdUIsQ0FDckMsYUFBYSxFQUNiO1lBQ0U7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLHFGQUFxRjthQUN4RjtTQUNGLEVBQ0QsSUFBSSxDQUNMLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE3SkQsMEJBNkpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgRHVyYXRpb24sXG4gIFN0YWNrLFxuICBTdGFja1Byb3BzLFxuICBhd3NfZWMyLFxuICBhd3NfaWFtLFxuICBhd3NfbGFtYmRhLFxuICBhd3NfbGFtYmRhX25vZGVqcyxcbiAgYXdzX3NjaGVkdWxlcixcbn0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBuZXB0dW5lIGZyb20gXCJAYXdzLWNkay9hd3MtbmVwdHVuZS1hbHBoYVwiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmludGVyZmFjZSBCYXN0aW9uUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgdnBjOiBhd3NfZWMyLlZwYztcbiAgY2x1c3RlcjogbmVwdHVuZS5EYXRhYmFzZUNsdXN0ZXI7XG4gIC8qKiBJQU5BIHRpbWV6b25lIGZvciB0aGUgYXV0by1zdG9wIHNjaGVkdWxlIChkZWZhdWx0OiBBbWVyaWNhL0xvc19BbmdlbGVzKSAqL1xuICB0aW1lem9uZT86IHN0cmluZztcbiAgLyoqIENyb24gaG91ciAoMC0yMykgdG8gc3RvcCB0aGUgYmFzdGlvbiAoZGVmYXVsdDogMCA9IG1pZG5pZ2h0KSAqL1xuICBzdG9wSG91cj86IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIEJhc3Rpb24gZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgaW5zdGFuY2U6IGF3c19lYzIuQmFzdGlvbkhvc3RMaW51eDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQmFzdGlvblByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHsgdnBjLCBjbHVzdGVyLCB0aW1lem9uZSA9IFwiQW1lcmljYS9Mb3NfQW5nZWxlc1wiLCBzdG9wSG91ciA9IDAgfSA9XG4gICAgICBwcm9wcztcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gQmFzdGlvbiBIb3N0IGluIGEgcHVibGljIHN1Ym5ldCwgYWNjZXNzaWJsZSB2aWEgU1NNIChubyBTU0gga2V5cylcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgYXdzX2VjMi5CYXN0aW9uSG9zdExpbnV4KHRoaXMsIFwiYmFzdGlvbi1ob3N0XCIsIHtcbiAgICAgIHZwYyxcbiAgICAgIHN1Ym5ldFNlbGVjdGlvbjogeyBzdWJuZXRUeXBlOiBhd3NfZWMyLlN1Ym5ldFR5cGUuUFVCTElDIH0sXG4gICAgICBpbnN0YW5jZVR5cGU6IGF3c19lYzIuSW5zdGFuY2VUeXBlLm9mKFxuICAgICAgICBhd3NfZWMyLkluc3RhbmNlQ2xhc3MuVDMsXG4gICAgICAgIGF3c19lYzIuSW5zdGFuY2VTaXplLk5BTk9cbiAgICAgICksXG4gICAgfSk7XG5cbiAgICAvLyBBbGxvdyB0aGUgYmFzdGlvbiB0byByZWFjaCBOZXB0dW5lIG9uIHBvcnQgODE4MlxuICAgIGNsdXN0ZXIuY29ubmVjdGlvbnMuYWxsb3dEZWZhdWx0UG9ydEZyb20odGhpcy5pbnN0YW5jZSk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIExhbWJkYSB0aGF0IHN0b3BzIHRoZSBiYXN0aW9uIGluc3RhbmNlXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBjb25zdCBzdG9wRm4gPSBuZXcgYXdzX2xhbWJkYV9ub2RlanMuTm9kZWpzRnVuY3Rpb24oXG4gICAgICB0aGlzLFxuICAgICAgXCJiYXN0aW9uLXN0b3AtZm5cIixcbiAgICAgIHtcbiAgICAgICAgcnVudGltZTogYXdzX2xhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgICB0cmFjaW5nOiBhd3NfbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgICBlbnRyeTogcGF0aC5qb2luKFxuICAgICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgICBcIi4uXCIsXG4gICAgICAgICAgXCIuLlwiLFxuICAgICAgICAgIFwiYXBpXCIsXG4gICAgICAgICAgXCJsYW1iZGFcIixcbiAgICAgICAgICBcImJhc3Rpb25TY2hlZHVsZXJcIixcbiAgICAgICAgICBcImluZGV4LnRzXCJcbiAgICAgICAgKSxcbiAgICAgICAgaGFuZGxlcjogXCJoYW5kbGVyXCIsXG4gICAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIElOU1RBTkNFX0lEOiB0aGlzLmluc3RhbmNlLmluc3RhbmNlSWQsXG4gICAgICAgIH0sXG4gICAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbXCJAYXdzLXNkay8qXCJdLFxuICAgICAgICAgIG1pbmlmeTogdHJ1ZSxcbiAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcblxuICAgIHN0b3BGbi5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGF3c19pYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXCJlYzI6U3RvcEluc3RhbmNlc1wiLCBcImVjMjpEZXNjcmliZUluc3RhbmNlc1wiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgU3RhY2sub2YodGhpcykuZm9ybWF0QXJuKHtcbiAgICAgICAgICAgIHNlcnZpY2U6IFwiZWMyXCIsXG4gICAgICAgICAgICByZXNvdXJjZTogXCJpbnN0YW5jZVwiLFxuICAgICAgICAgICAgcmVzb3VyY2VOYW1lOiB0aGlzLmluc3RhbmNlLmluc3RhbmNlSWQsXG4gICAgICAgICAgfSksXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIEV2ZW50QnJpZGdlIFNjaGVkdWxlciByb2xlXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBjb25zdCBzY2hlZHVsZXJSb2xlID0gbmV3IGF3c19pYW0uUm9sZSh0aGlzLCBcImJhc3Rpb24tc2NoZWR1bGVyLXJvbGVcIiwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKFwic2NoZWR1bGVyLmFtYXpvbmF3cy5jb21cIiksXG4gICAgfSk7XG4gICAgc3RvcEZuLmdyYW50SW52b2tlKHNjaGVkdWxlclJvbGUpO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBTY2hlZHVsZTogc3RvcCBiYXN0aW9uIGRhaWx5IGF0IHRoZSBjb25maWd1cmVkIGhvdXJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIG5ldyBhd3Nfc2NoZWR1bGVyLkNmblNjaGVkdWxlKHRoaXMsIFwiYmFzdGlvbi1zdG9wLXNjaGVkdWxlXCIsIHtcbiAgICAgIG5hbWU6IFwiYmFzdGlvbi1zdG9wLXNjaGVkdWxlXCIsXG4gICAgICBkZXNjcmlwdGlvbjogYFN0b3AgYmFzdGlvbiBob3N0IGF0ICR7c3RvcEhvdXJ9OjAwICR7dGltZXpvbmV9YCxcbiAgICAgIHNjaGVkdWxlRXhwcmVzc2lvblRpbWV6b25lOiB0aW1lem9uZSxcbiAgICAgIHNjaGVkdWxlRXhwcmVzc2lvbjogYGNyb24oMCAke3N0b3BIb3VyfSAqICogPyAqKWAsXG4gICAgICBmbGV4aWJsZVRpbWVXaW5kb3c6IHsgbW9kZTogXCJPRkZcIiB9LFxuICAgICAgdGFyZ2V0OiB7XG4gICAgICAgIGFybjogc3RvcEZuLmZ1bmN0aW9uQXJuLFxuICAgICAgICByb2xlQXJuOiBzY2hlZHVsZXJSb2xlLnJvbGVBcm4sXG4gICAgICAgIGlucHV0OiBKU09OLnN0cmluZ2lmeSh7IGFjdGlvbjogXCJzdG9wXCIgfSksXG4gICAgICB9LFxuICAgICAgc3RhdGU6IFwiRU5BQkxFRFwiLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBjZGstbmFnIHN1cHByZXNzaW9uc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgdGhpcy5pbnN0YW5jZSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1FQzI2XCIsXG4gICAgICAgICAgcmVhc29uOiBcIkJhc3Rpb24gaG9zdCBpcyBlcGhlbWVyYWwgZGV2IHRvb2xpbmc7IEVCUyBlbmNyeXB0aW9uIG5vdCByZXF1aXJlZFwiLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUVDMjhcIixcbiAgICAgICAgICByZWFzb246IFwiRGV0YWlsZWQgbW9uaXRvcmluZyBub3QgcmVxdWlyZWQgZm9yIGRldiBiYXN0aW9uXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtRUMyOVwiLFxuICAgICAgICAgIHJlYXNvbjogXCJUZXJtaW5hdGlvbiBwcm90ZWN0aW9uIG5vdCByZXF1aXJlZCBmb3IgZGV2IGJhc3Rpb25cIixcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICAgICAgcmVhc29uOlxuICAgICAgICAgICAgXCJTU00gbWFuYWdlZCBwb2xpY2llcyBhcmUgcmVxdWlyZWQgZm9yIFNlc3Npb24gTWFuYWdlciBhY2Nlc3Mgb24gdGhlIGJhc3Rpb24gaG9zdFwiLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICBcIldpbGRjYXJkIHBlcm1pc3Npb25zIGFyZSByZXF1aXJlZCBieSBTU00gbWFuYWdlZCBwb2xpY2llcyBvbiB0aGUgYmFzdGlvbiBob3N0XCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBzdG9wRm4sXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICAgIHJlYXNvbjpcbiAgICAgICAgICAgIFwiQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlIGlzIHJlcXVpcmVkIGZvciBDbG91ZFdhdGNoIExvZ3MgYWNjZXNzXCIsXG4gICAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgICBcIlBvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGVcIixcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUwxXCIsXG4gICAgICAgICAgcmVhc29uOiBcIk5PREVKU18yMl9YIGlzIHRoZSBsYXRlc3Qgc3VwcG9ydGVkIHJ1bnRpbWUgYXQgZGVwbG95IHRpbWVcIixcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICB0cnVlXG4gICAgKTtcblxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIHNjaGVkdWxlclJvbGUsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICAgIHJlYXNvbjpcbiAgICAgICAgICAgIFwiV2lsZGNhcmQgb24gTGFtYmRhIEFSTiB2ZXJzaW9uIGlzIHJlcXVpcmVkIGJ5IGdyYW50SW52b2tlIGZvciBFdmVudEJyaWRnZSBTY2hlZHVsZXJcIixcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICB0cnVlXG4gICAgKTtcbiAgfVxufVxuIl19