import { Stack, StackProps, aws_ec2, aws_iam } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as neptune from "@aws-cdk/aws-neptune-alpha";
interface NeptuneNetworkStackProps extends StackProps {
    natSubnet?: boolean;
    maxAz: number;
    neptuneServerlss: boolean;
    neptuneServerlssCapacity?: neptune.ServerlessScalingConfiguration;
}
export declare class NeptuneNetworkStack extends Stack {
    readonly vpc: aws_ec2.Vpc;
    readonly cluster: neptune.DatabaseCluster;
    readonly neptuneRole: aws_iam.Role;
    constructor(scope: Construct, id: string, props: NeptuneNetworkStackProps);
}
export {};
