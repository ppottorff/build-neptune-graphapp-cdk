import { Stack, StackProps, aws_route53 } from "aws-cdk-lib";
import { Construct } from "constructs";
export interface DnsStackProps extends StackProps {
    /** The domain name for the hosted zone (e.g. "mucker.io") */
    domainName: string;
    /** Optional MX records for email routing */
    mxRecords?: {
        hostName: string;
        priority: number;
    }[];
    /** Optional TXT records (e.g. SPF, domain verification) */
    txtRecords?: {
        name?: string;
        values: string[];
    }[];
}
export declare class DnsStack extends Stack {
    /** The public hosted zone — export for use by other stacks */
    readonly hostedZone: aws_route53.PublicHostedZone;
    constructor(scope: Construct, id: string, props: DnsStackProps);
}
