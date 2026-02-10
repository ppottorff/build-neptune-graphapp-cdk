"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Network = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
class Network extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { natSubnet, maxAz } = props;
        const cwLogs = new aws_cdk_lib_1.aws_logs.LogGroup(this, "vpc-logs", {
            logGroupName: `/${id}/vpc-logs/`,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            retention: aws_cdk_lib_1.aws_logs.RetentionDays.TWO_MONTHS,
        });
        const subnetConfiguration = [
            {
                subnetType: aws_cdk_lib_1.aws_ec2.SubnetType.PUBLIC,
                name: "public-subnet",
            },
            {
                subnetType: aws_cdk_lib_1.aws_ec2.SubnetType.PRIVATE_ISOLATED,
                name: "neptune-isolated-subnet",
            },
        ];
        if (natSubnet) {
            subnetConfiguration.push({
                subnetType: aws_cdk_lib_1.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
                name: "nat-subnet",
            });
        }
        const vpcBaseProps = {
            maxAzs: maxAz,
            subnetConfiguration,
            flowLogs: {
                s3: {
                    destination: aws_cdk_lib_1.aws_ec2.FlowLogDestination.toCloudWatchLogs(cwLogs),
                    trafficType: aws_cdk_lib_1.aws_ec2.FlowLogTrafficType.ALL,
                },
            },
            gatewayEndpoints: {
                S3: {
                    service: aws_cdk_lib_1.aws_ec2.GatewayVpcEndpointAwsService.S3,
                },
            },
        };
        if (props.natSubnet) {
            const eipAllocationForNat = [];
            const eipAllocationIds = [];
            for (let i = 0; i < maxAz; i++) {
                const eip = new aws_cdk_lib_1.aws_ec2.CfnEIP(this, `${id}-nat-eip${i}`, {});
                eipAllocationForNat.push(eip.attrPublicIp);
                eipAllocationIds.push(eip.attrAllocationId);
            }
            vpcBaseProps.natGatewayProvider = aws_cdk_lib_1.aws_ec2.NatProvider.gateway({
                eipAllocationIds,
            });
        }
        const vpcProps = vpcBaseProps;
        this.vpc = new aws_cdk_lib_1.aws_ec2.Vpc(this, "vpc", vpcProps);
        // Create endpoint
        const CWEndpoint = new aws_cdk_lib_1.aws_ec2.InterfaceVpcEndpoint(this, "cw-vep", {
            service: aws_cdk_lib_1.aws_ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
            vpc: this.vpc,
            privateDnsEnabled: true,
        });
        const CWLEndpoint = new aws_cdk_lib_1.aws_ec2.InterfaceVpcEndpoint(this, "cwl-vep", {
            service: aws_cdk_lib_1.aws_ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            vpc: this.vpc,
            privateDnsEnabled: true,
        });
        // Nag supressions
        cdk_nag_1.NagSuppressions.addResourceSuppressions([CWEndpoint, CWLEndpoint], [
            {
                id: "CdkNagValidationFailure",
                reason: "Suppressed: Managed by privatelink construct",
            },
        ], true);
    }
}
exports.Network = Network;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5ldHdvcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQTJFO0FBQzNFLHFDQUEwQztBQUUxQywyQ0FBdUM7QUFNdkMsTUFBYSxPQUFRLFNBQVEsc0JBQVM7SUFFcEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFtQjtRQUMzRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRW5DLE1BQU0sTUFBTSxHQUFHLElBQUksc0JBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNyRCxZQUFZLEVBQUUsSUFBSSxFQUFFLFlBQVk7WUFDaEMsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztZQUNwQyxTQUFTLEVBQUUsc0JBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVTtTQUM3QyxDQUFDLENBQUM7UUFFSCxNQUFNLG1CQUFtQixHQUFrQztZQUN6RDtnQkFDRSxVQUFVLEVBQUUscUJBQU8sQ0FBQyxVQUFVLENBQUMsTUFBTTtnQkFDckMsSUFBSSxFQUFFLGVBQWU7YUFDdEI7WUFDRDtnQkFDRSxVQUFVLEVBQUUscUJBQU8sQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO2dCQUMvQyxJQUFJLEVBQUUseUJBQXlCO2FBQ2hDO1NBQ0YsQ0FBQztRQUVGLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZCLFVBQVUsRUFBRSxxQkFBTyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7Z0JBQ2xELElBQUksRUFBRSxZQUFZO2FBQ25CLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBUTtZQUN4QixNQUFNLEVBQUUsS0FBSztZQUNiLG1CQUFtQjtZQUNuQixRQUFRLEVBQUU7Z0JBQ1IsRUFBRSxFQUFFO29CQUNGLFdBQVcsRUFBRSxxQkFBTyxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztvQkFDaEUsV0FBVyxFQUFFLHFCQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRztpQkFDNUM7YUFDRjtZQUNELGdCQUFnQixFQUFFO2dCQUNoQixFQUFFLEVBQUU7b0JBQ0YsT0FBTyxFQUFFLHFCQUFPLENBQUMsNEJBQTRCLENBQUMsRUFBRTtpQkFDakQ7YUFDRjtTQUNGLENBQUM7UUFDRixJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztZQUMvQixNQUFNLGdCQUFnQixHQUFhLEVBQUUsQ0FBQztZQUV0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQy9CLE1BQU0sR0FBRyxHQUFHLElBQUkscUJBQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RCxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUMzQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDOUMsQ0FBQztZQUVELFlBQVksQ0FBQyxrQkFBa0IsR0FBRyxxQkFBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUM7Z0JBQzVELGdCQUFnQjthQUNqQixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQXFCLFlBQVksQ0FBQztRQUNoRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUkscUJBQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVsRCxrQkFBa0I7UUFDbEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxxQkFBTyxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDbEUsT0FBTyxFQUFFLHFCQUFPLENBQUMsOEJBQThCLENBQUMscUJBQXFCO1lBQ3JFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLGlCQUFpQixFQUFFLElBQUk7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxXQUFXLEdBQUcsSUFBSSxxQkFBTyxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDcEUsT0FBTyxFQUFFLHFCQUFPLENBQUMsOEJBQThCLENBQUMsZUFBZTtZQUMvRCxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixpQkFBaUIsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQix5QkFBZSxDQUFDLHVCQUF1QixDQUNyQyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFDekI7WUFDRTtnQkFDRSxFQUFFLEVBQUUseUJBQXlCO2dCQUM3QixNQUFNLEVBQUUsOENBQThDO2FBQ3ZEO1NBQ0YsRUFDRCxJQUFJLENBQ0wsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXhGRCwwQkF3RkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZW1vdmFsUG9saWN5LCBTdGFja1Byb3BzLCBhd3NfZWMyLCBhd3NfbG9ncyB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcblxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuaW50ZXJmYWNlIE5ldHdvcmtQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICBuYXRTdWJuZXQ/OiBib29sZWFuO1xuICBtYXhBejogbnVtYmVyO1xufVxuZXhwb3J0IGNsYXNzIE5ldHdvcmsgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgdnBjOiBhd3NfZWMyLlZwYztcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE5ldHdvcmtQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgY29uc3QgeyBuYXRTdWJuZXQsIG1heEF6IH0gPSBwcm9wcztcblxuICAgIGNvbnN0IGN3TG9ncyA9IG5ldyBhd3NfbG9ncy5Mb2dHcm91cCh0aGlzLCBcInZwYy1sb2dzXCIsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC8ke2lkfS92cGMtbG9ncy9gLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgcmV0ZW50aW9uOiBhd3NfbG9ncy5SZXRlbnRpb25EYXlzLlRXT19NT05USFMsXG4gICAgfSk7XG5cbiAgICBjb25zdCBzdWJuZXRDb25maWd1cmF0aW9uOiBhd3NfZWMyLlN1Ym5ldENvbmZpZ3VyYXRpb25bXSA9IFtcbiAgICAgIHtcbiAgICAgICAgc3VibmV0VHlwZTogYXdzX2VjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgICAgbmFtZTogXCJwdWJsaWMtc3VibmV0XCIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBzdWJuZXRUeXBlOiBhd3NfZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcbiAgICAgICAgbmFtZTogXCJuZXB0dW5lLWlzb2xhdGVkLXN1Ym5ldFwiLFxuICAgICAgfSxcbiAgICBdO1xuXG4gICAgaWYgKG5hdFN1Ym5ldCkge1xuICAgICAgc3VibmV0Q29uZmlndXJhdGlvbi5wdXNoKHtcbiAgICAgICAgc3VibmV0VHlwZTogYXdzX2VjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICAgIG5hbWU6IFwibmF0LXN1Ym5ldFwiLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgdnBjQmFzZVByb3BzOiBhbnkgPSB7XG4gICAgICBtYXhBenM6IG1heEF6LFxuICAgICAgc3VibmV0Q29uZmlndXJhdGlvbixcbiAgICAgIGZsb3dMb2dzOiB7XG4gICAgICAgIHMzOiB7XG4gICAgICAgICAgZGVzdGluYXRpb246IGF3c19lYzIuRmxvd0xvZ0Rlc3RpbmF0aW9uLnRvQ2xvdWRXYXRjaExvZ3MoY3dMb2dzKSxcbiAgICAgICAgICB0cmFmZmljVHlwZTogYXdzX2VjMi5GbG93TG9nVHJhZmZpY1R5cGUuQUxMLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGdhdGV3YXlFbmRwb2ludHM6IHtcbiAgICAgICAgUzM6IHtcbiAgICAgICAgICBzZXJ2aWNlOiBhd3NfZWMyLkdhdGV3YXlWcGNFbmRwb2ludEF3c1NlcnZpY2UuUzMsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG4gICAgaWYgKHByb3BzLm5hdFN1Ym5ldCkge1xuICAgICAgY29uc3QgZWlwQWxsb2NhdGlvbkZvck5hdCA9IFtdO1xuICAgICAgY29uc3QgZWlwQWxsb2NhdGlvbklkczogc3RyaW5nW10gPSBbXTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYXhBejsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGVpcCA9IG5ldyBhd3NfZWMyLkNmbkVJUCh0aGlzLCBgJHtpZH0tbmF0LWVpcCR7aX1gLCB7fSk7XG4gICAgICAgIGVpcEFsbG9jYXRpb25Gb3JOYXQucHVzaChlaXAuYXR0clB1YmxpY0lwKTtcbiAgICAgICAgZWlwQWxsb2NhdGlvbklkcy5wdXNoKGVpcC5hdHRyQWxsb2NhdGlvbklkKTtcbiAgICAgIH1cblxuICAgICAgdnBjQmFzZVByb3BzLm5hdEdhdGV3YXlQcm92aWRlciA9IGF3c19lYzIuTmF0UHJvdmlkZXIuZ2F0ZXdheSh7XG4gICAgICAgIGVpcEFsbG9jYXRpb25JZHMsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB2cGNQcm9wczogYXdzX2VjMi5WcGNQcm9wcyA9IHZwY0Jhc2VQcm9wcztcbiAgICB0aGlzLnZwYyA9IG5ldyBhd3NfZWMyLlZwYyh0aGlzLCBcInZwY1wiLCB2cGNQcm9wcyk7XG5cbiAgICAvLyBDcmVhdGUgZW5kcG9pbnRcbiAgICBjb25zdCBDV0VuZHBvaW50ID0gbmV3IGF3c19lYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnQodGhpcywgXCJjdy12ZXBcIiwge1xuICAgICAgc2VydmljZTogYXdzX2VjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuQ0xPVURXQVRDSF9NT05JVE9SSU5HLFxuICAgICAgdnBjOiB0aGlzLnZwYyxcbiAgICAgIHByaXZhdGVEbnNFbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgQ1dMRW5kcG9pbnQgPSBuZXcgYXdzX2VjMi5JbnRlcmZhY2VWcGNFbmRwb2ludCh0aGlzLCBcImN3bC12ZXBcIiwge1xuICAgICAgc2VydmljZTogYXdzX2VjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuQ0xPVURXQVRDSF9MT0dTLFxuICAgICAgdnBjOiB0aGlzLnZwYyxcbiAgICAgIHByaXZhdGVEbnNFbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gTmFnIHN1cHJlc3Npb25zXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgW0NXRW5kcG9pbnQsIENXTEVuZHBvaW50XSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkNka05hZ1ZhbGlkYXRpb25GYWlsdXJlXCIsXG4gICAgICAgICAgcmVhc29uOiBcIlN1cHByZXNzZWQ6IE1hbmFnZWQgYnkgcHJpdmF0ZWxpbmsgY29uc3RydWN0XCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG4gIH1cbn1cbiJdfQ==