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
        // Store bastion config in SSM so the monitoring UI can recreate the instance
        // -----------------------------------------------------------------------
        const cfnInstanceProfile = this.instance.instance.node.findChild("InstanceProfile");
        const bastionSg = this.instance.connections.securityGroups[0];
        new aws_cdk_lib_1.aws_ssm.StringParameter(this, "bastion-instance-id-param", {
            parameterName: "/graphApp/bastion/instance-id",
            stringValue: this.instance.instanceId,
            description: "Current bastion host EC2 instance ID",
        });
        new aws_cdk_lib_1.aws_ssm.StringParameter(this, "bastion-subnet-id-param", {
            parameterName: "/graphApp/bastion/subnet-id",
            stringValue: vpc.publicSubnets[0].subnetId,
            description: "Public subnet for bastion host recreation",
        });
        new aws_cdk_lib_1.aws_ssm.StringParameter(this, "bastion-sg-id-param", {
            parameterName: "/graphApp/bastion/security-group-id",
            stringValue: bastionSg.securityGroupId,
            description: "Security group for bastion host (allows Neptune access)",
        });
        new aws_cdk_lib_1.aws_ssm.StringParameter(this, "bastion-profile-name-param", {
            parameterName: "/graphApp/bastion/instance-profile-name",
            stringValue: cfnInstanceProfile.ref,
            description: "IAM instance profile name for SSM-managed bastion",
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhc3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBVXFCO0FBRXJCLHFDQUEwQztBQUMxQywyQ0FBdUM7QUFDdkMsNkJBQTZCO0FBVzdCLE1BQWEsT0FBUSxTQUFRLHNCQUFTO0lBR3BDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBbUI7UUFDM0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLEdBQUcscUJBQXFCLEVBQUUsUUFBUSxHQUFHLENBQUMsRUFBRSxHQUNwRSxLQUFLLENBQUM7UUFFUiwwRUFBMEU7UUFDMUUsb0VBQW9FO1FBQ3BFLDBFQUEwRTtRQUMxRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUkscUJBQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2pFLEdBQUc7WUFDSCxlQUFlLEVBQUUsRUFBRSxVQUFVLEVBQUUscUJBQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFO1lBQzFELFlBQVksRUFBRSxxQkFBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQ25DLHFCQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFDeEIscUJBQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUMxQjtTQUNGLENBQUMsQ0FBQztRQUVILGtEQUFrRDtRQUNsRCxPQUFPLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV4RCwwRUFBMEU7UUFDMUUsNkVBQTZFO1FBQzdFLDBFQUEwRTtRQUMxRSxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQStCLENBQUM7UUFDbEgsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFB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RSxTQUFTLEVBQUU7b0JBQ1QsdUZBQXVGO2lCQUN4RjthQUNGO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsTUFBTSxFQUFFLDREQUE0RDthQUNyRTtTQUNGLEVBQ0QsSUFBSSxDQUNMLENBQUM7UUFFRix5QkFBZSxDQUFDLHVCQUF1QixDQUNyQyxhQUFhLEVBQ2I7WUFDRTtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQ0oscUZBQXFGO2FBQ3hGO1NBQ0YsRUFDRCxJQUFJLENBQ0wsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXhMRCwwQkF3TEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBEdXJhdGlvbixcbiAgU3RhY2ssXG4gIFN0YWNrUHJvcHMsXG4gIGF3c19lYzIsXG4gIGF3c19pYW0sXG4gIGF3c19sYW1iZGEsXG4gIGF3c19sYW1iZGFfbm9kZWpzLFxuICBhd3Nfc2NoZWR1bGVyLFxuICBhd3Nfc3NtLFxufSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIG5lcHR1bmUgZnJvbSBcIkBhd3MtY2RrL2F3cy1uZXB0dW5lLWFscGhhXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcblxuaW50ZXJmYWNlIEJhc3Rpb25Qcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICB2cGM6IGF3c19lYzIuVnBjO1xuICBjbHVzdGVyOiBuZXB0dW5lLkRhdGFiYXNlQ2x1c3RlcjtcbiAgLyoqIElBTkEgdGltZXpvbmUgZm9yIHRoZSBhdXRvLXN0b3Agc2NoZWR1bGUgKGRlZmF1bHQ6IEFtZXJpY2EvTG9zX0FuZ2VsZXMpICovXG4gIHRpbWV6b25lPzogc3RyaW5nO1xuICAvKiogQ3JvbiBob3VyICgwLTIzKSB0byBzdG9wIHRoZSBiYXN0aW9uIChkZWZhdWx0OiAwID0gbWlkbmlnaHQpICovXG4gIHN0b3BIb3VyPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgQmFzdGlvbiBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBpbnN0YW5jZTogYXdzX2VjMi5CYXN0aW9uSG9zdExpbnV4O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBCYXN0aW9uUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyB2cGMsIGNsdXN0ZXIsIHRpbWV6b25lID0gXCJBbWVyaWNhL0xvc19BbmdlbGVzXCIsIHN0b3BIb3VyID0gMCB9ID1cbiAgICAgIHByb3BzO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBCYXN0aW9uIEhvc3QgaW4gYSBwdWJsaWMgc3VibmV0LCBhY2Nlc3NpYmxlIHZpYSBTU00gKG5vIFNTSCBrZXlzKVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyBhd3NfZWMyLkJhc3Rpb25Ib3N0TGludXgodGhpcywgXCJiYXN0aW9uLWhvc3RcIiwge1xuICAgICAgdnBjLFxuICAgICAgc3VibmV0U2VsZWN0aW9uOiB7IHN1Ym5ldFR5cGU6IGF3c19lYzIuU3VibmV0VHlwZS5QVUJMSUMgfSxcbiAgICAgIGluc3RhbmNlVHlwZTogYXdzX2VjMi5JbnN0YW5jZVR5cGUub2YoXG4gICAgICAgIGF3c19lYzIuSW5zdGFuY2VDbGFzcy5UMyxcbiAgICAgICAgYXdzX2VjMi5JbnN0YW5jZVNpemUuTkFOT1xuICAgICAgKSxcbiAgICB9KTtcblxuICAgIC8vIEFsbG93IHRoZSBiYXN0aW9uIHRvIHJlYWNoIE5lcHR1bmUgb24gcG9ydCA4MTgyXG4gICAgY2x1c3Rlci5jb25uZWN0aW9ucy5hbGxvd0RlZmF1bHRQb3J0RnJvbSh0aGlzLmluc3RhbmNlKTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gU3RvcmUgYmFzdGlvbiBjb25maWcgaW4gU1NNIHNvIHRoZSBtb25pdG9yaW5nIFVJIGNhbiByZWNyZWF0ZSB0aGUgaW5zdGFuY2VcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGNvbnN0IGNmbkluc3RhbmNlUHJvZmlsZSA9IHRoaXMuaW5zdGFuY2UuaW5zdGFuY2Uubm9kZS5maW5kQ2hpbGQoXCJJbnN0YW5jZVByb2ZpbGVcIikgYXMgYXdzX2lhbS5DZm5JbnN0YW5jZVByb2ZpbGU7XG4gICAgY29uc3QgYmFzdGlvblNnID0gdGhpcy5pbnN0YW5jZS5jb25uZWN0aW9ucy5zZWN1cml0eUdyb3Vwc1swXTtcblxuICAgIG5ldyBhd3Nfc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCBcImJhc3Rpb24taW5zdGFuY2UtaWQtcGFyYW1cIiwge1xuICAgICAgcGFyYW1ldGVyTmFtZTogXCIvZ3JhcGhBcHAvYmFzdGlvbi9pbnN0YW5jZS1pZFwiLFxuICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuaW5zdGFuY2UuaW5zdGFuY2VJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkN1cnJlbnQgYmFzdGlvbiBob3N0IEVDMiBpbnN0YW5jZSBJRFwiLFxuICAgIH0pO1xuICAgIG5ldyBhd3Nfc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCBcImJhc3Rpb24tc3VibmV0LWlkLXBhcmFtXCIsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IFwiL2dyYXBoQXBwL2Jhc3Rpb24vc3VibmV0LWlkXCIsXG4gICAgICBzdHJpbmdWYWx1ZTogdnBjLnB1YmxpY1N1Ym5ldHNbMF0uc3VibmV0SWQsXG4gICAgICBkZXNjcmlwdGlvbjogXCJQdWJsaWMgc3VibmV0IGZvciBiYXN0aW9uIGhvc3QgcmVjcmVhdGlvblwiLFxuICAgIH0pO1xuICAgIG5ldyBhd3Nfc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCBcImJhc3Rpb24tc2ctaWQtcGFyYW1cIiwge1xuICAgICAgcGFyYW1ldGVyTmFtZTogXCIvZ3JhcGhBcHAvYmFzdGlvbi9zZWN1cml0eS1ncm91cC1pZFwiLFxuICAgICAgc3RyaW5nVmFsdWU6IGJhc3Rpb25TZy5zZWN1cml0eUdyb3VwSWQsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTZWN1cml0eSBncm91cCBmb3IgYmFzdGlvbiBob3N0IChhbGxvd3MgTmVwdHVuZSBhY2Nlc3MpXCIsXG4gICAgfSk7XG4gICAgbmV3IGF3c19zc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsIFwiYmFzdGlvbi1wcm9maWxlLW5hbWUtcGFyYW1cIiwge1xuICAgICAgcGFyYW1ldGVyTmFtZTogXCIvZ3JhcGhBcHAvYmFzdGlvbi9pbnN0YW5jZS1wcm9maWxlLW5hbWVcIixcbiAgICAgIHN0cmluZ1ZhbHVlOiBjZm5JbnN0YW5jZVByb2ZpbGUucmVmLFxuICAgICAgZGVzY3JpcHRpb246IFwiSUFNIGluc3RhbmNlIHByb2ZpbGUgbmFtZSBmb3IgU1NNLW1hbmFnZWQgYmFzdGlvblwiLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBMYW1iZGEgdGhhdCBzdG9wcyB0aGUgYmFzdGlvbiBpbnN0YW5jZVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgY29uc3Qgc3RvcEZuID0gbmV3IGF3c19sYW1iZGFfbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKFxuICAgICAgdGhpcyxcbiAgICAgIFwiYmFzdGlvbi1zdG9wLWZuXCIsXG4gICAgICB7XG4gICAgICAgIHJ1bnRpbWU6IGF3c19sYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgICAgdHJhY2luZzogYXdzX2xhbWJkYS5UcmFjaW5nLkFDVElWRSxcbiAgICAgICAgZW50cnk6IHBhdGguam9pbihcbiAgICAgICAgICBfX2Rpcm5hbWUsXG4gICAgICAgICAgXCIuLlwiLFxuICAgICAgICAgIFwiLi5cIixcbiAgICAgICAgICBcImFwaVwiLFxuICAgICAgICAgIFwibGFtYmRhXCIsXG4gICAgICAgICAgXCJiYXN0aW9uU2NoZWR1bGVyXCIsXG4gICAgICAgICAgXCJpbmRleC50c1wiXG4gICAgICAgICksXG4gICAgICAgIGhhbmRsZXI6IFwiaGFuZGxlclwiLFxuICAgICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBJTlNUQU5DRV9JRDogdGhpcy5pbnN0YW5jZS5pbnN0YW5jZUlkLFxuICAgICAgICB9LFxuICAgICAgICBidW5kbGluZzoge1xuICAgICAgICAgIGV4dGVybmFsTW9kdWxlczogW1wiQGF3cy1zZGsvKlwiXSxcbiAgICAgICAgICBtaW5pZnk6IHRydWUsXG4gICAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG5cbiAgICBzdG9wRm4uYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBhd3NfaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1wiZWMyOlN0b3BJbnN0YW5jZXNcIiwgXCJlYzI6RGVzY3JpYmVJbnN0YW5jZXNcIl0sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIFN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XG4gICAgICAgICAgICBzZXJ2aWNlOiBcImVjMlwiLFxuICAgICAgICAgICAgcmVzb3VyY2U6IFwiaW5zdGFuY2VcIixcbiAgICAgICAgICAgIHJlc291cmNlTmFtZTogdGhpcy5pbnN0YW5jZS5pbnN0YW5jZUlkLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBFdmVudEJyaWRnZSBTY2hlZHVsZXIgcm9sZVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgY29uc3Qgc2NoZWR1bGVyUm9sZSA9IG5ldyBhd3NfaWFtLlJvbGUodGhpcywgXCJiYXN0aW9uLXNjaGVkdWxlci1yb2xlXCIsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGF3c19pYW0uU2VydmljZVByaW5jaXBhbChcInNjaGVkdWxlci5hbWF6b25hd3MuY29tXCIpLFxuICAgIH0pO1xuICAgIHN0b3BGbi5ncmFudEludm9rZShzY2hlZHVsZXJSb2xlKTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gU2NoZWR1bGU6IHN0b3AgYmFzdGlvbiBkYWlseSBhdCB0aGUgY29uZmlndXJlZCBob3VyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBuZXcgYXdzX3NjaGVkdWxlci5DZm5TY2hlZHVsZSh0aGlzLCBcImJhc3Rpb24tc3RvcC1zY2hlZHVsZVwiLCB7XG4gICAgICBuYW1lOiBcImJhc3Rpb24tc3RvcC1zY2hlZHVsZVwiLFxuICAgICAgZGVzY3JpcHRpb246IGBTdG9wIGJhc3Rpb24gaG9zdCBhdCAke3N0b3BIb3VyfTowMCAke3RpbWV6b25lfWAsXG4gICAgICBzY2hlZHVsZUV4cHJlc3Npb25UaW1lem9uZTogdGltZXpvbmUsXG4gICAgICBzY2hlZHVsZUV4cHJlc3Npb246IGBjcm9uKDAgJHtzdG9wSG91cn0gKiAqID8gKilgLFxuICAgICAgZmxleGlibGVUaW1lV2luZG93OiB7IG1vZGU6IFwiT0ZGXCIgfSxcbiAgICAgIHRhcmdldDoge1xuICAgICAgICBhcm46IHN0b3BGbi5mdW5jdGlvbkFybixcbiAgICAgICAgcm9sZUFybjogc2NoZWR1bGVyUm9sZS5yb2xlQXJuLFxuICAgICAgICBpbnB1dDogSlNPTi5zdHJpbmdpZnkoeyBhY3Rpb246IFwic3RvcFwiIH0pLFxuICAgICAgfSxcbiAgICAgIHN0YXRlOiBcIkVOQUJMRURcIixcbiAgICB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gY2RrLW5hZyBzdXBwcmVzc2lvbnNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIHRoaXMuaW5zdGFuY2UsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtRUMyNlwiLFxuICAgICAgICAgIHJlYXNvbjogXCJCYXN0aW9uIGhvc3QgaXMgZXBoZW1lcmFsIGRldiB0b29saW5nOyBFQlMgZW5jcnlwdGlvbiBub3QgcmVxdWlyZWRcIixcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1FQzI4XCIsXG4gICAgICAgICAgcmVhc29uOiBcIkRldGFpbGVkIG1vbml0b3Jpbmcgbm90IHJlcXVpcmVkIGZvciBkZXYgYmFzdGlvblwiLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUVDMjlcIixcbiAgICAgICAgICByZWFzb246IFwiVGVybWluYXRpb24gcHJvdGVjdGlvbiBub3QgcmVxdWlyZWQgZm9yIGRldiBiYXN0aW9uXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICAgIHJlYXNvbjpcbiAgICAgICAgICAgIFwiU1NNIG1hbmFnZWQgcG9saWNpZXMgYXJlIHJlcXVpcmVkIGZvciBTZXNzaW9uIE1hbmFnZXIgYWNjZXNzIG9uIHRoZSBiYXN0aW9uIGhvc3RcIixcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgcmVhc29uOlxuICAgICAgICAgICAgXCJXaWxkY2FyZCBwZXJtaXNzaW9ucyBhcmUgcmVxdWlyZWQgYnkgU1NNIG1hbmFnZWQgcG9saWNpZXMgb24gdGhlIGJhc3Rpb24gaG9zdFwiLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWVcbiAgICApO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgc3RvcEZuLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICBcIkFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZSBpcyByZXF1aXJlZCBmb3IgQ2xvdWRXYXRjaCBMb2dzIGFjY2Vzc1wiLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgXCJQb2xpY3k6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmlhbTo6YXdzOnBvbGljeS9zZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1MMVwiLFxuICAgICAgICAgIHJlYXNvbjogXCJOT0RFSlNfMjJfWCBpcyB0aGUgbGF0ZXN0IHN1cHBvcnRlZCBydW50aW1lIGF0IGRlcGxveSB0aW1lXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBzY2hlZHVsZXJSb2xlLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICBcIldpbGRjYXJkIG9uIExhbWJkYSBBUk4gdmVyc2lvbiBpcyByZXF1aXJlZCBieSBncmFudEludm9rZSBmb3IgRXZlbnRCcmlkZ2UgU2NoZWR1bGVyXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG4gIH1cbn1cbiJdfQ==