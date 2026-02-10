"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neptune = void 0;
const neptune = require("@aws-cdk/aws-neptune-alpha");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
class Neptune extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { vpc, neptuneServerlss, neptuneServerlssCapacity } = props;
        this.neptuneRole = new aws_cdk_lib_1.aws_iam.Role(this, "neptune-role", {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal("rds.amazonaws.com"),
        });
        this.neptuneRole.addToPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            actions: ["s3:Get*", "s3:List*"],
            resources: ["*"],
        }));
        let neptuneBaseClusterConfiguration = {
            iamAuthentication: true,
            cloudwatchLogsRetention: aws_cdk_lib_1.aws_logs.RetentionDays.ONE_MONTH,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            engineVersion: neptune.EngineVersion.V1_3_0_0,
            autoMinorVersionUpgrade: true,
            backupRetention: aws_cdk_lib_1.Duration.days(14),
            associatedRoles: [this.neptuneRole],
        };
        if (neptuneServerlss) {
            let serverlessScalingConfiguration = {
                minCapacity: 1,
                maxCapacity: 2.5,
            };
            if (neptuneServerlssCapacity) {
                (serverlessScalingConfiguration.minCapacity =
                    neptuneServerlssCapacity.minCapacity),
                    (serverlessScalingConfiguration.maxCapacity =
                        neptuneServerlssCapacity.maxCapacity);
            }
            neptuneBaseClusterConfiguration = {
                ...neptuneBaseClusterConfiguration,
                serverlessScalingConfiguration,
            };
        }
        // if (neptuneServerlss) {
        this.cluster = new neptune.DatabaseCluster(this, "cluster", {
            vpc: vpc,
            instanceType: neptuneServerlss
                ? neptune.InstanceType.SERVERLESS
                : neptune.InstanceType.R5_XLARGE,
            ...neptuneBaseClusterConfiguration,
            vpcSubnets: {
                subnets: vpc.isolatedSubnets,
            },
        });
        this.cluster.grantConnect(this.neptuneRole);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.neptuneRole, [
            {
                id: "AwsSolutions-IAM5",
                reason: "Need the permission for bulk load",
            },
        ], true);
    }
}
exports.Neptune = Neptune;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmVwdHVuZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5lcHR1bmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0RBQXNEO0FBQ3RELDZDQU9xQjtBQUNyQixxQ0FBMEM7QUFFMUMsMkNBQXVDO0FBUXZDLE1BQWEsT0FBUSxTQUFRLHNCQUFTO0lBR3BDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBbUI7UUFDM0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQixNQUFNLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLHdCQUF3QixFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxxQkFBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3hELFNBQVMsRUFBRSxJQUFJLHFCQUFPLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUM7U0FDN0QsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQzFCLElBQUkscUJBQU8sQ0FBQyxlQUFlLENBQUM7WUFDMUIsTUFBTSxFQUFFLHFCQUFPLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDNUIsT0FBTyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztZQUNoQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUNILENBQUM7UUFFRixJQUFJLCtCQUErQixHQUFRO1lBQ3pDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsdUJBQXVCLEVBQUUsc0JBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUztZQUN6RCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGFBQWEsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVE7WUFDN0MsdUJBQXVCLEVBQUUsSUFBSTtZQUM3QixlQUFlLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7U0FDcEMsQ0FBQztRQUVGLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUNyQixJQUFJLDhCQUE4QixHQUFHO2dCQUNuQyxXQUFXLEVBQUUsQ0FBQztnQkFDZCxXQUFXLEVBQUUsR0FBRzthQUNqQixDQUFDO1lBQ0YsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO2dCQUM3QixDQUFDLDhCQUE4QixDQUFDLFdBQVc7b0JBQ3pDLHdCQUF3QixDQUFDLFdBQVcsQ0FBQztvQkFDckMsQ0FBQyw4QkFBOEIsQ0FBQyxXQUFXO3dCQUN6Qyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM1QyxDQUFDO1lBQ0QsK0JBQStCLEdBQUc7Z0JBQ2hDLEdBQUcsK0JBQStCO2dCQUNsQyw4QkFBOEI7YUFDL0IsQ0FBQztRQUNKLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUMxRCxHQUFHLEVBQUUsR0FBRztZQUNSLFlBQVksRUFBRSxnQkFBZ0I7Z0JBQzVCLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFVBQVU7Z0JBQ2pDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVM7WUFDbEMsR0FBRywrQkFBK0I7WUFFbEMsVUFBVSxFQUFFO2dCQUNWLE9BQU8sRUFBRSxHQUFHLENBQUMsZUFBZTthQUM3QjtTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUU1Qyx5QkFBZSxDQUFDLHVCQUF1QixDQUNyQyxJQUFJLENBQUMsV0FBVyxFQUNoQjtZQUNFO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFBRSxtQ0FBbUM7YUFDNUM7U0FDRixFQUNELElBQUksQ0FDTCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBdEVELDBCQXNFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIG5lcHR1bmUgZnJvbSBcIkBhd3MtY2RrL2F3cy1uZXB0dW5lLWFscGhhXCI7XG5pbXBvcnQge1xuICBEdXJhdGlvbixcbiAgUmVtb3ZhbFBvbGljeSxcbiAgU3RhY2tQcm9wcyxcbiAgYXdzX2VjMixcbiAgYXdzX2lhbSxcbiAgYXdzX2xvZ3MsXG59IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcblxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuaW50ZXJmYWNlIE5lcHR1bmVQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICB2cGM6IGF3c19lYzIuVnBjO1xuICBuZXB0dW5lU2VydmVybHNzOiBib29sZWFuO1xuICBuZXB0dW5lU2VydmVybHNzQ2FwYWNpdHk/OiBuZXB0dW5lLlNlcnZlcmxlc3NTY2FsaW5nQ29uZmlndXJhdGlvbjtcbn1cblxuZXhwb3J0IGNsYXNzIE5lcHR1bmUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogbmVwdHVuZS5EYXRhYmFzZUNsdXN0ZXI7XG4gIHJlYWRvbmx5IG5lcHR1bmVSb2xlOiBhd3NfaWFtLlJvbGU7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBOZXB0dW5lUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIGNvbnN0IHsgdnBjLCBuZXB0dW5lU2VydmVybHNzLCBuZXB0dW5lU2VydmVybHNzQ2FwYWNpdHkgfSA9IHByb3BzO1xuICAgIHRoaXMubmVwdHVuZVJvbGUgPSBuZXcgYXdzX2lhbS5Sb2xlKHRoaXMsIFwibmVwdHVuZS1yb2xlXCIsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGF3c19pYW0uU2VydmljZVByaW5jaXBhbChcInJkcy5hbWF6b25hd3MuY29tXCIpLFxuICAgIH0pO1xuICAgIHRoaXMubmVwdHVuZVJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGF3c19pYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXCJzMzpHZXQqXCIsIFwiczM6TGlzdCpcIl0sXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGxldCBuZXB0dW5lQmFzZUNsdXN0ZXJDb25maWd1cmF0aW9uOiBhbnkgPSB7XG4gICAgICBpYW1BdXRoZW50aWNhdGlvbjogdHJ1ZSxcbiAgICAgIGNsb3Vkd2F0Y2hMb2dzUmV0ZW50aW9uOiBhd3NfbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGVuZ2luZVZlcnNpb246IG5lcHR1bmUuRW5naW5lVmVyc2lvbi5WMV8zXzBfMCxcbiAgICAgIGF1dG9NaW5vclZlcnNpb25VcGdyYWRlOiB0cnVlLFxuICAgICAgYmFja3VwUmV0ZW50aW9uOiBEdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgIGFzc29jaWF0ZWRSb2xlczogW3RoaXMubmVwdHVuZVJvbGVdLFxuICAgIH07XG5cbiAgICBpZiAobmVwdHVuZVNlcnZlcmxzcykge1xuICAgICAgbGV0IHNlcnZlcmxlc3NTY2FsaW5nQ29uZmlndXJhdGlvbiA9IHtcbiAgICAgICAgbWluQ2FwYWNpdHk6IDEsXG4gICAgICAgIG1heENhcGFjaXR5OiAyLjUsXG4gICAgICB9O1xuICAgICAgaWYgKG5lcHR1bmVTZXJ2ZXJsc3NDYXBhY2l0eSkge1xuICAgICAgICAoc2VydmVybGVzc1NjYWxpbmdDb25maWd1cmF0aW9uLm1pbkNhcGFjaXR5ID1cbiAgICAgICAgICBuZXB0dW5lU2VydmVybHNzQ2FwYWNpdHkubWluQ2FwYWNpdHkpLFxuICAgICAgICAgIChzZXJ2ZXJsZXNzU2NhbGluZ0NvbmZpZ3VyYXRpb24ubWF4Q2FwYWNpdHkgPVxuICAgICAgICAgICAgbmVwdHVuZVNlcnZlcmxzc0NhcGFjaXR5Lm1heENhcGFjaXR5KTtcbiAgICAgIH1cbiAgICAgIG5lcHR1bmVCYXNlQ2x1c3RlckNvbmZpZ3VyYXRpb24gPSB7XG4gICAgICAgIC4uLm5lcHR1bmVCYXNlQ2x1c3RlckNvbmZpZ3VyYXRpb24sXG4gICAgICAgIHNlcnZlcmxlc3NTY2FsaW5nQ29uZmlndXJhdGlvbixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gaWYgKG5lcHR1bmVTZXJ2ZXJsc3MpIHtcbiAgICB0aGlzLmNsdXN0ZXIgPSBuZXcgbmVwdHVuZS5EYXRhYmFzZUNsdXN0ZXIodGhpcywgXCJjbHVzdGVyXCIsIHtcbiAgICAgIHZwYzogdnBjLFxuICAgICAgaW5zdGFuY2VUeXBlOiBuZXB0dW5lU2VydmVybHNzXG4gICAgICAgID8gbmVwdHVuZS5JbnN0YW5jZVR5cGUuU0VSVkVSTEVTU1xuICAgICAgICA6IG5lcHR1bmUuSW5zdGFuY2VUeXBlLlI1X1hMQVJHRSxcbiAgICAgIC4uLm5lcHR1bmVCYXNlQ2x1c3RlckNvbmZpZ3VyYXRpb24sXG5cbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0czogdnBjLmlzb2xhdGVkU3VibmV0cyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmNsdXN0ZXIuZ3JhbnRDb25uZWN0KHRoaXMubmVwdHVuZVJvbGUpO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgdGhpcy5uZXB0dW5lUm9sZSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgcmVhc29uOiBcIk5lZWQgdGhlIHBlcm1pc3Npb24gZm9yIGJ1bGsgbG9hZFwiLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWVcbiAgICApO1xuICB9XG59XG4iXX0=