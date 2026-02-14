"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParameterEmailSubscriber = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const CustomResourceSDK = require("aws-cdk-lib/custom-resources");
const constructs_1 = require("constructs");
const aws_iam = require("aws-cdk-lib/aws-iam");
const aws_lambda = require("aws-cdk-lib/aws-lambda");
const aws_logs = require("aws-cdk-lib/aws-logs");
const cdk_nag_1 = require("cdk-nag");
/**
 * Custom resource that reads email addresses from SSM Parameter Store
 * and subscribes them to an SNS topic.
 *
 * The parameter should contain comma-separated email addresses:
 * email1@example.com,email2@example.com
 *
 * On stack deletion, all subscriptions created by this resource are removed.
 */
class ParameterEmailSubscriber extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { topicArn, parameterName, region } = props;
        const stack = aws_cdk_lib_1.Stack.of(this);
        const effectiveRegion = region || stack.region;
        // Create Lambda function for custom resource handler
        const handler = new aws_lambda.SingletonFunction(this, "EmailSubscriberHandler", {
            uuid: "parameter-email-subscriber-handler",
            runtime: aws_lambda.Runtime.NODEJS_22_X,
            handler: "index.handler",
            code: aws_lambda.Code.fromInline(`
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { SNSClient, SubscribeCommand, UnsubscribeCommand, ListSubscriptionsByTopicCommand } = require("@aws-sdk/client-sns");

const ssm = new SSMClient();
const sns = new SNSClient();

async function getEmailsFromParameter(parameterName) {
  try {
    const command = new GetParameterCommand({ Name: parameterName });
    const response = await ssm.send(command);
    const value = response.Parameter?.Value || "";
    
    // Split by comma and trim whitespace
    const emails = value
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    console.log(\`Found \${emails.length} email(s) in parameter: \${emails.join(", ")}\`);
    return emails;
  } catch (error) {
    // If parameter doesn't exist, return empty array (deployment can proceed)
    if (error.name === "ParameterNotFound" || error.Code === "ParameterNotFound") {
      console.warn(\`Parameter \${parameterName} not found. No email subscriptions will be created.\`);
      return [];
    }
    console.error("Error reading parameter:", error);
    throw new Error(\`Failed to read parameter \${parameterName}: \${error.message}\`);
  }
}

async function subscribeEmails(topicArn, emails) {
  const subscriptionArns = [];
  
  for (const email of emails) {
    try {
      const command = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: "email",
        Endpoint: email,
      });
      const response = await sns.send(command);
      console.log(\`Subscribed \${email} to topic. Subscription ARN: \${response.SubscriptionArn}\`);
      subscriptionArns.push(response.SubscriptionArn);
    } catch (error) {
      console.error(\`Error subscribing \${email}:\`, error);
      // Continue with other emails even if one fails
    }
  }
  
  return subscriptionArns;
}

async function unsubscribeEmails(subscriptionArns) {
  for (const arn of subscriptionArns) {
    // Skip pending confirmations (they auto-expire)
    if (arn === "pending confirmation") {
      console.log("Skipping pending confirmation subscription");
      continue;
    }
    
    try {
      const command = new UnsubscribeCommand({ SubscriptionArn: arn });
      await sns.send(command);
      console.log(\`Unsubscribed: \${arn}\`);
    } catch (error) {
      console.error(\`Error unsubscribing \${arn}:\`, error);
    }
  }
}

async function listTopicSubscriptions(topicArn) {
  try {
    const command = new ListSubscriptionsByTopicCommand({ TopicArn: topicArn });
    const response = await sns.send(command);
    return response.Subscriptions || [];
  } catch (error) {
    console.error("Error listing subscriptions:", error);
    return [];
  }
}

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  const { RequestType, ResourceProperties, PhysicalResourceId } = event;
  const { TopicArn, ParameterName } = ResourceProperties;
  
  try {
    if (RequestType === "Create" || RequestType === "Update") {
      const emails = await getEmailsFromParameter(ParameterName);
      
      if (emails.length === 0) {
        console.warn("No emails found in parameter. No subscriptions created.");
        return {
          PhysicalResourceId: PhysicalResourceId || \`email-subscriber-\${Date.now()}\`,
          Data: {
            SubscriptionCount: 0,
            Emails: "",
          },
        };
      }
      
      const subscriptionArns = await subscribeEmails(TopicArn, emails);
      
      return {
        PhysicalResourceId: PhysicalResourceId || \`email-subscriber-\${Date.now()}\`,
        Data: {
          SubscriptionCount: subscriptionArns.length,
          Emails: emails.join(","),
          SubscriptionArns: subscriptionArns.join(","),
        },
      };
    } else if (RequestType === "Delete") {
      // On deletion, remove all email subscriptions from the topic
      // Note: We remove all email subscriptions since we can't reliably track
      // which ones we created (SNS returns "pending confirmation" initially).
      // This is acceptable for a dedicated Neptune notification topic.
      console.log("Delete request - cleaning up email subscriptions");
      
      const allSubscriptions = await listTopicSubscriptions(TopicArn);
      const emailSubscriptions = allSubscriptions
        .filter(sub => sub.Protocol === "email")
        .map(sub => sub.SubscriptionArn);
      
      console.log(\`Found \${emailSubscriptions.length} email subscription(s) to remove\`);
      await unsubscribeEmails(emailSubscriptions);
      
      return {
        PhysicalResourceId: PhysicalResourceId,
      };
    }
    
    return {
      PhysicalResourceId: PhysicalResourceId || \`email-subscriber-\${Date.now()}\`,
    };
  } catch (error) {
    console.error("Handler error:", error);
    throw error;
  }
};
        `),
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            logRetention: aws_logs.RetentionDays.ONE_WEEK,
        });
        // Grant permissions to read SSM parameter
        handler.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ["ssm:GetParameter"],
            resources: [
                aws_cdk_lib_1.Arn.format({
                    service: "ssm",
                    region: effectiveRegion,
                    resource: "parameter",
                    resourceName: parameterName.startsWith("/")
                        ? parameterName.slice(1)
                        : parameterName,
                }, stack),
            ],
        }));
        // Grant permissions to manage SNS subscriptions
        handler.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: [
                "sns:Subscribe",
                "sns:Unsubscribe",
                "sns:ListSubscriptionsByTopic",
            ],
            resources: [topicArn],
        }));
        // -----------------------------------------------------------------------
        // cdk-nag suppressions for handler (must be before provider creation)
        // -----------------------------------------------------------------------
        cdk_nag_1.NagSuppressions.addResourceSuppressions(handler, [
            {
                id: "AwsSolutions-IAM4",
                reason: "AWSLambdaBasicExecutionRole is required for CloudWatch Logs access - CDK managed resource",
                appliesTo: [
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                ],
            },
            {
                id: "AwsSolutions-L1",
                reason: "NODEJS_22_X is the latest supported runtime at deploy time",
            },
        ], true);
        // Create the custom resource
        const provider = new CustomResourceSDK.Provider(this, "EmailSubscriberProvider", {
            onEventHandler: handler,
            logRetention: aws_logs.RetentionDays.ONE_WEEK,
        });
        new aws_cdk_lib_1.CustomResource(this, "EmailSubscriberResource", {
            serviceToken: provider.serviceToken,
            properties: {
                TopicArn: topicArn,
                ParameterName: parameterName,
            },
        });
        // -----------------------------------------------------------------------
        // cdk-nag suppressions for provider
        // -----------------------------------------------------------------------
        cdk_nag_1.NagSuppressions.addResourceSuppressions(provider, [
            {
                id: "AwsSolutions-IAM4",
                reason: "AWSLambdaBasicExecutionRole is required for CloudWatch Logs access - CDK managed resource",
                appliesTo: [
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                ],
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "Wildcard permissions required for custom resource provider framework - CDK managed resource",
            },
            {
                id: "AwsSolutions-L1",
                reason: "Custom resource provider uses CDK-managed Lambda runtime - CDK managed resource",
            },
        ], true);
    }
}
exports.ParameterEmailSubscriber = ParameterEmailSubscriber;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVyLWVtYWlsLXN1YnNjcmliZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwYXJhbWV0ZXItZW1haWwtc3Vic2NyaWJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBbUU7QUFDbkUsa0VBQWtFO0FBQ2xFLDJDQUF1QztBQUN2QywrQ0FBK0M7QUFDL0MscURBQXFEO0FBQ3JELGlEQUFpRDtBQUNqRCxxQ0FBMEM7QUFxQjFDOzs7Ozs7OztHQVFHO0FBQ0gsTUFBYSx3QkFBeUIsU0FBUSxzQkFBUztJQUNyRCxZQUNFLEtBQWdCLEVBQ2hCLEVBQVUsRUFDVixLQUFvQztRQUVwQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztRQUNsRCxNQUFNLEtBQUssR0FBRyxtQkFBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUUvQyxxREFBcUQ7UUFDckQsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQzlDLElBQUksRUFDSix3QkFBd0IsRUFDeEI7WUFDRSxJQUFJLEVBQUUsb0NBQW9DO1lBQzFDLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDdkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1NBOEloQyxDQUFDO1lBQ0YsT0FBTyxFQUFFLHNCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM3QixZQUFZLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRO1NBQzlDLENBQ0YsQ0FBQztRQUVGLDBDQUEwQztRQUMxQyxPQUFPLENBQUMsZUFBZSxDQUNyQixJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7WUFDMUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSztZQUM1QixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztZQUM3QixTQUFTLEVBQUU7Z0JBQ1QsaUJBQUcsQ0FBQyxNQUFNLENBQ1I7b0JBQ0UsT0FBTyxFQUFFLEtBQUs7b0JBQ2QsTUFBTSxFQUFFLGVBQWU7b0JBQ3ZCLFFBQVEsRUFBRSxXQUFXO29CQUNyQixZQUFZLEVBQUUsYUFBYSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7d0JBQ3pDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDeEIsQ0FBQyxDQUFDLGFBQWE7aUJBQ2xCLEVBQ0QsS0FBSyxDQUNOO2FBQ0Y7U0FDRixDQUFDLENBQ0gsQ0FBQztRQUVGLGdEQUFnRDtRQUNoRCxPQUFPLENBQUMsZUFBZSxDQUNyQixJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7WUFDMUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSztZQUM1QixPQUFPLEVBQUU7Z0JBQ1AsZUFBZTtnQkFDZixpQkFBaUI7Z0JBQ2pCLDhCQUE4QjthQUMvQjtZQUNELFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztTQUN0QixDQUFDLENBQ0gsQ0FBQztRQUVGLDBFQUEwRTtRQUMxRSxzRUFBc0U7UUFDdEUsMEVBQTBFO1FBQzFFLHlCQUFlLENBQUMsdUJBQXVCLENBQ3JDLE9BQU8sRUFDUDtZQUNFO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFDSiwyRkFBMkY7Z0JBQzdGLFNBQVMsRUFBRTtvQkFDVCx1RkFBdUY7aUJBQ3hGO2FBQ0Y7WUFDRDtnQkFDRSxFQUFFLEVBQUUsaUJBQWlCO2dCQUNyQixNQUFNLEVBQUUsNERBQTREO2FBQ3JFO1NBQ0YsRUFDRCxJQUFJLENBQ0wsQ0FBQztRQUVGLDZCQUE2QjtRQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FDN0MsSUFBSSxFQUNKLHlCQUF5QixFQUN6QjtZQUNFLGNBQWMsRUFBRSxPQUFPO1lBQ3ZCLFlBQVksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVE7U0FDOUMsQ0FDRixDQUFDO1FBRUYsSUFBSSw0QkFBYyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNsRCxZQUFZLEVBQUUsUUFBUSxDQUFDLFlBQVk7WUFDbkMsVUFBVSxFQUFFO2dCQUNWLFFBQVEsRUFBRSxRQUFRO2dCQUNsQixhQUFhLEVBQUUsYUFBYTthQUM3QjtTQUNGLENBQUMsQ0FBQztRQUVILDBFQUEwRTtRQUMxRSxvQ0FBb0M7UUFDcEMsMEVBQTBFO1FBQzFFLHlCQUFlLENBQUMsdUJBQXVCLENBQ3JDLFFBQVEsRUFDUjtZQUNFO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFDSiwyRkFBMkY7Z0JBQzdGLFNBQVMsRUFBRTtvQkFDVCx1RkFBdUY7aUJBQ3hGO2FBQ0Y7WUFDRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQ0osNkZBQTZGO2FBQ2hHO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsTUFBTSxFQUNKLGlGQUFpRjthQUNwRjtTQUNGLEVBQ0QsSUFBSSxDQUNMLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE5UUQsNERBOFFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXJuLCBTdGFjaywgQ3VzdG9tUmVzb3VyY2UsIER1cmF0aW9uIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBDdXN0b21SZXNvdXJjZVNESyBmcm9tIFwiYXdzLWNkay1saWIvY3VzdG9tLXJlc291cmNlc1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCAqIGFzIGF3c19pYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIGF3c19sYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIGF3c19sb2dzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtbG9nc1wiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXJFbWFpbFN1YnNjcmliZXJQcm9wcyB7XG4gIC8qKlxuICAgKiBBUk4gb2YgdGhlIFNOUyB0b3BpYyB0byBzdWJzY3JpYmUgZW1haWxzIHRvXG4gICAqL1xuICB0b3BpY0Fybjogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBGdWxsIHBhdGggdG8gdGhlIFNTTSBQYXJhbWV0ZXIgY29udGFpbmluZyBjb21tYS1zZXBhcmF0ZWQgZW1haWwgYWRkcmVzc2VzXG4gICAqIEV4YW1wbGU6IC9nbG9iYWwtYXBwLXBhcmFtcy9yZHNub3RpZmljYXRpb25lbWFpbHNcbiAgICovXG4gIHBhcmFtZXRlck5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogUmVnaW9uIHdoZXJlIHRoZSBwYXJhbWV0ZXIgaXMgc3RvcmVkIChkZWZhdWx0OiBjdXJyZW50IHJlZ2lvbilcbiAgICovXG4gIHJlZ2lvbj86IHN0cmluZztcbn1cblxuLyoqXG4gKiBDdXN0b20gcmVzb3VyY2UgdGhhdCByZWFkcyBlbWFpbCBhZGRyZXNzZXMgZnJvbSBTU00gUGFyYW1ldGVyIFN0b3JlXG4gKiBhbmQgc3Vic2NyaWJlcyB0aGVtIHRvIGFuIFNOUyB0b3BpYy5cbiAqIFxuICogVGhlIHBhcmFtZXRlciBzaG91bGQgY29udGFpbiBjb21tYS1zZXBhcmF0ZWQgZW1haWwgYWRkcmVzc2VzOlxuICogZW1haWwxQGV4YW1wbGUuY29tLGVtYWlsMkBleGFtcGxlLmNvbVxuICogXG4gKiBPbiBzdGFjayBkZWxldGlvbiwgYWxsIHN1YnNjcmlwdGlvbnMgY3JlYXRlZCBieSB0aGlzIHJlc291cmNlIGFyZSByZW1vdmVkLlxuICovXG5leHBvcnQgY2xhc3MgUGFyYW1ldGVyRW1haWxTdWJzY3JpYmVyIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgY29uc3RydWN0b3IoXG4gICAgc2NvcGU6IENvbnN0cnVjdCxcbiAgICBpZDogc3RyaW5nLFxuICAgIHByb3BzOiBQYXJhbWV0ZXJFbWFpbFN1YnNjcmliZXJQcm9wc1xuICApIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyB0b3BpY0FybiwgcGFyYW1ldGVyTmFtZSwgcmVnaW9uIH0gPSBwcm9wcztcbiAgICBjb25zdCBzdGFjayA9IFN0YWNrLm9mKHRoaXMpO1xuICAgIGNvbnN0IGVmZmVjdGl2ZVJlZ2lvbiA9IHJlZ2lvbiB8fCBzdGFjay5yZWdpb247XG5cbiAgICAvLyBDcmVhdGUgTGFtYmRhIGZ1bmN0aW9uIGZvciBjdXN0b20gcmVzb3VyY2UgaGFuZGxlclxuICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgYXdzX2xhbWJkYS5TaW5nbGV0b25GdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICBcIkVtYWlsU3Vic2NyaWJlckhhbmRsZXJcIixcbiAgICAgIHtcbiAgICAgICAgdXVpZDogXCJwYXJhbWV0ZXItZW1haWwtc3Vic2NyaWJlci1oYW5kbGVyXCIsXG4gICAgICAgIHJ1bnRpbWU6IGF3c19sYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXG4gICAgICAgIGNvZGU6IGF3c19sYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcbmNvbnN0IHsgU1NNQ2xpZW50LCBHZXRQYXJhbWV0ZXJDb21tYW5kIH0gPSByZXF1aXJlKFwiQGF3cy1zZGsvY2xpZW50LXNzbVwiKTtcbmNvbnN0IHsgU05TQ2xpZW50LCBTdWJzY3JpYmVDb21tYW5kLCBVbnN1YnNjcmliZUNvbW1hbmQsIExpc3RTdWJzY3JpcHRpb25zQnlUb3BpY0NvbW1hbmQgfSA9IHJlcXVpcmUoXCJAYXdzLXNkay9jbGllbnQtc25zXCIpO1xuXG5jb25zdCBzc20gPSBuZXcgU1NNQ2xpZW50KCk7XG5jb25zdCBzbnMgPSBuZXcgU05TQ2xpZW50KCk7XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEVtYWlsc0Zyb21QYXJhbWV0ZXIocGFyYW1ldGVyTmFtZSkge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0UGFyYW1ldGVyQ29tbWFuZCh7IE5hbWU6IHBhcmFtZXRlck5hbWUgfSk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzc20uc2VuZChjb21tYW5kKTtcbiAgICBjb25zdCB2YWx1ZSA9IHJlc3BvbnNlLlBhcmFtZXRlcj8uVmFsdWUgfHwgXCJcIjtcbiAgICBcbiAgICAvLyBTcGxpdCBieSBjb21tYSBhbmQgdHJpbSB3aGl0ZXNwYWNlXG4gICAgY29uc3QgZW1haWxzID0gdmFsdWVcbiAgICAgIC5zcGxpdChcIixcIilcbiAgICAgIC5tYXAoZW1haWwgPT4gZW1haWwudHJpbSgpKVxuICAgICAgLmZpbHRlcihlbWFpbCA9PiBlbWFpbC5sZW5ndGggPiAwKTtcbiAgICBcbiAgICBjb25zb2xlLmxvZyhcXGBGb3VuZCBcXCR7ZW1haWxzLmxlbmd0aH0gZW1haWwocykgaW4gcGFyYW1ldGVyOiBcXCR7ZW1haWxzLmpvaW4oXCIsIFwiKX1cXGApO1xuICAgIHJldHVybiBlbWFpbHM7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gSWYgcGFyYW1ldGVyIGRvZXNuJ3QgZXhpc3QsIHJldHVybiBlbXB0eSBhcnJheSAoZGVwbG95bWVudCBjYW4gcHJvY2VlZClcbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gXCJQYXJhbWV0ZXJOb3RGb3VuZFwiIHx8IGVycm9yLkNvZGUgPT09IFwiUGFyYW1ldGVyTm90Rm91bmRcIikge1xuICAgICAgY29uc29sZS53YXJuKFxcYFBhcmFtZXRlciBcXCR7cGFyYW1ldGVyTmFtZX0gbm90IGZvdW5kLiBObyBlbWFpbCBzdWJzY3JpcHRpb25zIHdpbGwgYmUgY3JlYXRlZC5cXGApO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgcmVhZGluZyBwYXJhbWV0ZXI6XCIsIGVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXFxgRmFpbGVkIHRvIHJlYWQgcGFyYW1ldGVyIFxcJHtwYXJhbWV0ZXJOYW1lfTogXFwke2Vycm9yLm1lc3NhZ2V9XFxgKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzdWJzY3JpYmVFbWFpbHModG9waWNBcm4sIGVtYWlscykge1xuICBjb25zdCBzdWJzY3JpcHRpb25Bcm5zID0gW107XG4gIFxuICBmb3IgKGNvbnN0IGVtYWlsIG9mIGVtYWlscykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFN1YnNjcmliZUNvbW1hbmQoe1xuICAgICAgICBUb3BpY0FybjogdG9waWNBcm4sXG4gICAgICAgIFByb3RvY29sOiBcImVtYWlsXCIsXG4gICAgICAgIEVuZHBvaW50OiBlbWFpbCxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzbnMuc2VuZChjb21tYW5kKTtcbiAgICAgIGNvbnNvbGUubG9nKFxcYFN1YnNjcmliZWQgXFwke2VtYWlsfSB0byB0b3BpYy4gU3Vic2NyaXB0aW9uIEFSTjogXFwke3Jlc3BvbnNlLlN1YnNjcmlwdGlvbkFybn1cXGApO1xuICAgICAgc3Vic2NyaXB0aW9uQXJucy5wdXNoKHJlc3BvbnNlLlN1YnNjcmlwdGlvbkFybik7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXFxgRXJyb3Igc3Vic2NyaWJpbmcgXFwke2VtYWlsfTpcXGAsIGVycm9yKTtcbiAgICAgIC8vIENvbnRpbnVlIHdpdGggb3RoZXIgZW1haWxzIGV2ZW4gaWYgb25lIGZhaWxzXG4gICAgfVxuICB9XG4gIFxuICByZXR1cm4gc3Vic2NyaXB0aW9uQXJucztcbn1cblxuYXN5bmMgZnVuY3Rpb24gdW5zdWJzY3JpYmVFbWFpbHMoc3Vic2NyaXB0aW9uQXJucykge1xuICBmb3IgKGNvbnN0IGFybiBvZiBzdWJzY3JpcHRpb25Bcm5zKSB7XG4gICAgLy8gU2tpcCBwZW5kaW5nIGNvbmZpcm1hdGlvbnMgKHRoZXkgYXV0by1leHBpcmUpXG4gICAgaWYgKGFybiA9PT0gXCJwZW5kaW5nIGNvbmZpcm1hdGlvblwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIlNraXBwaW5nIHBlbmRpbmcgY29uZmlybWF0aW9uIHN1YnNjcmlwdGlvblwiKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVbnN1YnNjcmliZUNvbW1hbmQoeyBTdWJzY3JpcHRpb25Bcm46IGFybiB9KTtcbiAgICAgIGF3YWl0IHNucy5zZW5kKGNvbW1hbmQpO1xuICAgICAgY29uc29sZS5sb2coXFxgVW5zdWJzY3JpYmVkOiBcXCR7YXJufVxcYCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXFxgRXJyb3IgdW5zdWJzY3JpYmluZyBcXCR7YXJufTpcXGAsIGVycm9yKTtcbiAgICB9XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gbGlzdFRvcGljU3Vic2NyaXB0aW9ucyh0b3BpY0Fybikge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgTGlzdFN1YnNjcmlwdGlvbnNCeVRvcGljQ29tbWFuZCh7IFRvcGljQXJuOiB0b3BpY0FybiB9KTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHNucy5zZW5kKGNvbW1hbmQpO1xuICAgIHJldHVybiByZXNwb25zZS5TdWJzY3JpcHRpb25zIHx8IFtdO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBsaXN0aW5nIHN1YnNjcmlwdGlvbnM6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gIGNvbnNvbGUubG9nKFwiRXZlbnQ6XCIsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XG4gIFxuICBjb25zdCB7IFJlcXVlc3RUeXBlLCBSZXNvdXJjZVByb3BlcnRpZXMsIFBoeXNpY2FsUmVzb3VyY2VJZCB9ID0gZXZlbnQ7XG4gIGNvbnN0IHsgVG9waWNBcm4sIFBhcmFtZXRlck5hbWUgfSA9IFJlc291cmNlUHJvcGVydGllcztcbiAgXG4gIHRyeSB7XG4gICAgaWYgKFJlcXVlc3RUeXBlID09PSBcIkNyZWF0ZVwiIHx8IFJlcXVlc3RUeXBlID09PSBcIlVwZGF0ZVwiKSB7XG4gICAgICBjb25zdCBlbWFpbHMgPSBhd2FpdCBnZXRFbWFpbHNGcm9tUGFyYW1ldGVyKFBhcmFtZXRlck5hbWUpO1xuICAgICAgXG4gICAgICBpZiAoZW1haWxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJObyBlbWFpbHMgZm91bmQgaW4gcGFyYW1ldGVyLiBObyBzdWJzY3JpcHRpb25zIGNyZWF0ZWQuXCIpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogUGh5c2ljYWxSZXNvdXJjZUlkIHx8IFxcYGVtYWlsLXN1YnNjcmliZXItXFwke0RhdGUubm93KCl9XFxgLFxuICAgICAgICAgIERhdGE6IHtcbiAgICAgICAgICAgIFN1YnNjcmlwdGlvbkNvdW50OiAwLFxuICAgICAgICAgICAgRW1haWxzOiBcIlwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbkFybnMgPSBhd2FpdCBzdWJzY3JpYmVFbWFpbHMoVG9waWNBcm4sIGVtYWlscyk7XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogUGh5c2ljYWxSZXNvdXJjZUlkIHx8IFxcYGVtYWlsLXN1YnNjcmliZXItXFwke0RhdGUubm93KCl9XFxgLFxuICAgICAgICBEYXRhOiB7XG4gICAgICAgICAgU3Vic2NyaXB0aW9uQ291bnQ6IHN1YnNjcmlwdGlvbkFybnMubGVuZ3RoLFxuICAgICAgICAgIEVtYWlsczogZW1haWxzLmpvaW4oXCIsXCIpLFxuICAgICAgICAgIFN1YnNjcmlwdGlvbkFybnM6IHN1YnNjcmlwdGlvbkFybnMuam9pbihcIixcIiksXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoUmVxdWVzdFR5cGUgPT09IFwiRGVsZXRlXCIpIHtcbiAgICAgIC8vIE9uIGRlbGV0aW9uLCByZW1vdmUgYWxsIGVtYWlsIHN1YnNjcmlwdGlvbnMgZnJvbSB0aGUgdG9waWNcbiAgICAgIC8vIE5vdGU6IFdlIHJlbW92ZSBhbGwgZW1haWwgc3Vic2NyaXB0aW9ucyBzaW5jZSB3ZSBjYW4ndCByZWxpYWJseSB0cmFja1xuICAgICAgLy8gd2hpY2ggb25lcyB3ZSBjcmVhdGVkIChTTlMgcmV0dXJucyBcInBlbmRpbmcgY29uZmlybWF0aW9uXCIgaW5pdGlhbGx5KS5cbiAgICAgIC8vIFRoaXMgaXMgYWNjZXB0YWJsZSBmb3IgYSBkZWRpY2F0ZWQgTmVwdHVuZSBub3RpZmljYXRpb24gdG9waWMuXG4gICAgICBjb25zb2xlLmxvZyhcIkRlbGV0ZSByZXF1ZXN0IC0gY2xlYW5pbmcgdXAgZW1haWwgc3Vic2NyaXB0aW9uc1wiKTtcbiAgICAgIFxuICAgICAgY29uc3QgYWxsU3Vic2NyaXB0aW9ucyA9IGF3YWl0IGxpc3RUb3BpY1N1YnNjcmlwdGlvbnMoVG9waWNBcm4pO1xuICAgICAgY29uc3QgZW1haWxTdWJzY3JpcHRpb25zID0gYWxsU3Vic2NyaXB0aW9uc1xuICAgICAgICAuZmlsdGVyKHN1YiA9PiBzdWIuUHJvdG9jb2wgPT09IFwiZW1haWxcIilcbiAgICAgICAgLm1hcChzdWIgPT4gc3ViLlN1YnNjcmlwdGlvbkFybik7XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKFxcYEZvdW5kIFxcJHtlbWFpbFN1YnNjcmlwdGlvbnMubGVuZ3RofSBlbWFpbCBzdWJzY3JpcHRpb24ocykgdG8gcmVtb3ZlXFxgKTtcbiAgICAgIGF3YWl0IHVuc3Vic2NyaWJlRW1haWxzKGVtYWlsU3Vic2NyaXB0aW9ucyk7XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogUGh5c2ljYWxSZXNvdXJjZUlkLFxuICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogUGh5c2ljYWxSZXNvdXJjZUlkIHx8IFxcYGVtYWlsLXN1YnNjcmliZXItXFwke0RhdGUubm93KCl9XFxgLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkhhbmRsZXIgZXJyb3I6XCIsIGVycm9yKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcbiAgICAgICAgYCksXG4gICAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgICBsb2dSZXRlbnRpb246IGF3c19sb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICB9XG4gICAgKTtcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIHJlYWQgU1NNIHBhcmFtZXRlclxuICAgIGhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBhd3NfaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1wic3NtOkdldFBhcmFtZXRlclwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgQXJuLmZvcm1hdChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc2VydmljZTogXCJzc21cIixcbiAgICAgICAgICAgICAgcmVnaW9uOiBlZmZlY3RpdmVSZWdpb24sXG4gICAgICAgICAgICAgIHJlc291cmNlOiBcInBhcmFtZXRlclwiLFxuICAgICAgICAgICAgICByZXNvdXJjZU5hbWU6IHBhcmFtZXRlck5hbWUuc3RhcnRzV2l0aChcIi9cIilcbiAgICAgICAgICAgICAgICA/IHBhcmFtZXRlck5hbWUuc2xpY2UoMSlcbiAgICAgICAgICAgICAgICA6IHBhcmFtZXRlck5hbWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhY2tcbiAgICAgICAgICApLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gbWFuYWdlIFNOUyBzdWJzY3JpcHRpb25zXG4gICAgaGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGF3c19pYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgXCJzbnM6U3Vic2NyaWJlXCIsXG4gICAgICAgICAgXCJzbnM6VW5zdWJzY3JpYmVcIixcbiAgICAgICAgICBcInNuczpMaXN0U3Vic2NyaXB0aW9uc0J5VG9waWNcIixcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbdG9waWNBcm5dLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBjZGstbmFnIHN1cHByZXNzaW9ucyBmb3IgaGFuZGxlciAobXVzdCBiZSBiZWZvcmUgcHJvdmlkZXIgY3JlYXRpb24pXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBoYW5kbGVyLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICBcIkFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZSBpcyByZXF1aXJlZCBmb3IgQ2xvdWRXYXRjaCBMb2dzIGFjY2VzcyAtIENESyBtYW5hZ2VkIHJlc291cmNlXCIsXG4gICAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgICBcIlBvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGVcIixcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUwxXCIsXG4gICAgICAgICAgcmVhc29uOiBcIk5PREVKU18yMl9YIGlzIHRoZSBsYXRlc3Qgc3VwcG9ydGVkIHJ1bnRpbWUgYXQgZGVwbG95IHRpbWVcIixcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICB0cnVlXG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgY3VzdG9tIHJlc291cmNlXG4gICAgY29uc3QgcHJvdmlkZXIgPSBuZXcgQ3VzdG9tUmVzb3VyY2VTREsuUHJvdmlkZXIoXG4gICAgICB0aGlzLFxuICAgICAgXCJFbWFpbFN1YnNjcmliZXJQcm92aWRlclwiLFxuICAgICAge1xuICAgICAgICBvbkV2ZW50SGFuZGxlcjogaGFuZGxlcixcbiAgICAgICAgbG9nUmV0ZW50aW9uOiBhd3NfbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBuZXcgQ3VzdG9tUmVzb3VyY2UodGhpcywgXCJFbWFpbFN1YnNjcmliZXJSZXNvdXJjZVwiLCB7XG4gICAgICBzZXJ2aWNlVG9rZW46IHByb3ZpZGVyLnNlcnZpY2VUb2tlbixcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgVG9waWNBcm46IHRvcGljQXJuLFxuICAgICAgICBQYXJhbWV0ZXJOYW1lOiBwYXJhbWV0ZXJOYW1lLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gY2RrLW5hZyBzdXBwcmVzc2lvbnMgZm9yIHByb3ZpZGVyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBwcm92aWRlcixcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICAgICAgcmVhc29uOlxuICAgICAgICAgICAgXCJBV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUgaXMgcmVxdWlyZWQgZm9yIENsb3VkV2F0Y2ggTG9ncyBhY2Nlc3MgLSBDREsgbWFuYWdlZCByZXNvdXJjZVwiLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgXCJQb2xpY3k6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmlhbTo6YXdzOnBvbGljeS9zZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgcmVhc29uOlxuICAgICAgICAgICAgXCJXaWxkY2FyZCBwZXJtaXNzaW9ucyByZXF1aXJlZCBmb3IgY3VzdG9tIHJlc291cmNlIHByb3ZpZGVyIGZyYW1ld29yayAtIENESyBtYW5hZ2VkIHJlc291cmNlXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtTDFcIixcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICBcIkN1c3RvbSByZXNvdXJjZSBwcm92aWRlciB1c2VzIENESy1tYW5hZ2VkIExhbWJkYSBydW50aW1lIC0gQ0RLIG1hbmFnZWQgcmVzb3VyY2VcIixcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICB0cnVlXG4gICAgKTtcbiAgfVxufVxuIl19