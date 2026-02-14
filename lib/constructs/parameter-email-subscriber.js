"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParameterEmailSubscriber = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const CustomResourceSDK = require("aws-cdk-lib/custom-resources");
const constructs_1 = require("constructs");
const aws_iam = require("aws-cdk-lib/aws-iam");
const aws_lambda = require("aws-cdk-lib/aws-lambda");
const aws_logs = require("aws-cdk-lib/aws-logs");
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
            runtime: aws_lambda.Runtime.NODEJS_18_X,
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
    }
}
exports.ParameterEmailSubscriber = ParameterEmailSubscriber;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVyLWVtYWlsLXN1YnNjcmliZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwYXJhbWV0ZXItZW1haWwtc3Vic2NyaWJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBbUU7QUFDbkUsa0VBQWtFO0FBQ2xFLDJDQUF1QztBQUN2QywrQ0FBK0M7QUFDL0MscURBQXFEO0FBQ3JELGlEQUFpRDtBQXFCakQ7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLHdCQUF5QixTQUFRLHNCQUFTO0lBQ3JELFlBQ0UsS0FBZ0IsRUFDaEIsRUFBVSxFQUNWLEtBQW9DO1FBRXBDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ2xELE1BQU0sS0FBSyxHQUFHLG1CQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDO1FBRS9DLHFEQUFxRDtRQUNyRCxNQUFNLE9BQU8sR0FBRyxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FDOUMsSUFBSSxFQUNKLHdCQUF3QixFQUN4QjtZQUNFLElBQUksRUFBRSxvQ0FBb0M7WUFDMUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsV0FBVztZQUN2QyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1NBeUloQyxDQUFDO1lBQ0YsT0FBTyxFQUFFLHNCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM3QixZQUFZLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRO1NBQzlDLENBQ0YsQ0FBQztRQUVGLDBDQUEwQztRQUMxQyxPQUFPLENBQUMsZUFBZSxDQUNyQixJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7WUFDMUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSztZQUM1QixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztZQUM3QixTQUFTLEVBQUU7Z0JBQ1QsaUJBQUcsQ0FBQyxNQUFNLENBQ1I7b0JBQ0UsT0FBTyxFQUFFLEtBQUs7b0JBQ2QsTUFBTSxFQUFFLGVBQWU7b0JBQ3ZCLFFBQVEsRUFBRSxXQUFXO29CQUNyQixZQUFZLEVBQUUsYUFBYSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7d0JBQ3pDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDeEIsQ0FBQyxDQUFDLGFBQWE7aUJBQ2xCLEVBQ0QsS0FBSyxDQUNOO2FBQ0Y7U0FDRixDQUFDLENBQ0gsQ0FBQztRQUVGLGdEQUFnRDtRQUNoRCxPQUFPLENBQUMsZUFBZSxDQUNyQixJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7WUFDMUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSztZQUM1QixPQUFPLEVBQUU7Z0JBQ1AsZUFBZTtnQkFDZixpQkFBaUI7Z0JBQ2pCLDhCQUE4QjthQUMvQjtZQUNELFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztTQUN0QixDQUFDLENBQ0gsQ0FBQztRQUVGLDZCQUE2QjtRQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FDN0MsSUFBSSxFQUNKLHlCQUF5QixFQUN6QjtZQUNFLGNBQWMsRUFBRSxPQUFPO1lBQ3ZCLFlBQVksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVE7U0FDOUMsQ0FDRixDQUFDO1FBRUYsSUFBSSw0QkFBYyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNsRCxZQUFZLEVBQUUsUUFBUSxDQUFDLFlBQVk7WUFDbkMsVUFBVSxFQUFFO2dCQUNWLFFBQVEsRUFBRSxRQUFRO2dCQUNsQixhQUFhLEVBQUUsYUFBYTthQUM3QjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXZORCw0REF1TkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcm4sIFN0YWNrLCBDdXN0b21SZXNvdXJjZSwgRHVyYXRpb24gfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIEN1c3RvbVJlc291cmNlU0RLIGZyb20gXCJhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0ICogYXMgYXdzX2lhbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0ICogYXMgYXdzX2xhbWJkYSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xuaW1wb3J0ICogYXMgYXdzX2xvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyRW1haWxTdWJzY3JpYmVyUHJvcHMge1xuICAvKipcbiAgICogQVJOIG9mIHRoZSBTTlMgdG9waWMgdG8gc3Vic2NyaWJlIGVtYWlscyB0b1xuICAgKi9cbiAgdG9waWNBcm46IHN0cmluZztcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBTU00gUGFyYW1ldGVyIGNvbnRhaW5pbmcgY29tbWEtc2VwYXJhdGVkIGVtYWlsIGFkZHJlc3Nlc1xuICAgKiBFeGFtcGxlOiAvZ2xvYmFsLWFwcC1wYXJhbXMvcmRzbm90aWZpY2F0aW9uZW1haWxzXG4gICAqL1xuICBwYXJhbWV0ZXJOYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFJlZ2lvbiB3aGVyZSB0aGUgcGFyYW1ldGVyIGlzIHN0b3JlZCAoZGVmYXVsdDogY3VycmVudCByZWdpb24pXG4gICAqL1xuICByZWdpb24/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQ3VzdG9tIHJlc291cmNlIHRoYXQgcmVhZHMgZW1haWwgYWRkcmVzc2VzIGZyb20gU1NNIFBhcmFtZXRlciBTdG9yZVxuICogYW5kIHN1YnNjcmliZXMgdGhlbSB0byBhbiBTTlMgdG9waWMuXG4gKiBcbiAqIFRoZSBwYXJhbWV0ZXIgc2hvdWxkIGNvbnRhaW4gY29tbWEtc2VwYXJhdGVkIGVtYWlsIGFkZHJlc3NlczpcbiAqIGVtYWlsMUBleGFtcGxlLmNvbSxlbWFpbDJAZXhhbXBsZS5jb21cbiAqIFxuICogT24gc3RhY2sgZGVsZXRpb24sIGFsbCBzdWJzY3JpcHRpb25zIGNyZWF0ZWQgYnkgdGhpcyByZXNvdXJjZSBhcmUgcmVtb3ZlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhcmFtZXRlckVtYWlsU3Vic2NyaWJlciBleHRlbmRzIENvbnN0cnVjdCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHNjb3BlOiBDb25zdHJ1Y3QsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBwcm9wczogUGFyYW1ldGVyRW1haWxTdWJzY3JpYmVyUHJvcHNcbiAgKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHsgdG9waWNBcm4sIHBhcmFtZXRlck5hbWUsIHJlZ2lvbiB9ID0gcHJvcHM7XG4gICAgY29uc3Qgc3RhY2sgPSBTdGFjay5vZih0aGlzKTtcbiAgICBjb25zdCBlZmZlY3RpdmVSZWdpb24gPSByZWdpb24gfHwgc3RhY2sucmVnaW9uO1xuXG4gICAgLy8gQ3JlYXRlIExhbWJkYSBmdW5jdGlvbiBmb3IgY3VzdG9tIHJlc291cmNlIGhhbmRsZXJcbiAgICBjb25zdCBoYW5kbGVyID0gbmV3IGF3c19sYW1iZGEuU2luZ2xldG9uRnVuY3Rpb24oXG4gICAgICB0aGlzLFxuICAgICAgXCJFbWFpbFN1YnNjcmliZXJIYW5kbGVyXCIsXG4gICAgICB7XG4gICAgICAgIHV1aWQ6IFwicGFyYW1ldGVyLWVtYWlsLXN1YnNjcmliZXItaGFuZGxlclwiLFxuICAgICAgICBydW50aW1lOiBhd3NfbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxuICAgICAgICBjb2RlOiBhd3NfbGFtYmRhLkNvZGUuZnJvbUlubGluZShgXG5jb25zdCB7IFNTTUNsaWVudCwgR2V0UGFyYW1ldGVyQ29tbWFuZCB9ID0gcmVxdWlyZShcIkBhd3Mtc2RrL2NsaWVudC1zc21cIik7XG5jb25zdCB7IFNOU0NsaWVudCwgU3Vic2NyaWJlQ29tbWFuZCwgVW5zdWJzY3JpYmVDb21tYW5kLCBMaXN0U3Vic2NyaXB0aW9uc0J5VG9waWNDb21tYW5kIH0gPSByZXF1aXJlKFwiQGF3cy1zZGsvY2xpZW50LXNuc1wiKTtcblxuY29uc3Qgc3NtID0gbmV3IFNTTUNsaWVudCgpO1xuY29uc3Qgc25zID0gbmV3IFNOU0NsaWVudCgpO1xuXG5hc3luYyBmdW5jdGlvbiBnZXRFbWFpbHNGcm9tUGFyYW1ldGVyKHBhcmFtZXRlck5hbWUpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldFBhcmFtZXRlckNvbW1hbmQoeyBOYW1lOiBwYXJhbWV0ZXJOYW1lIH0pO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc3NtLnNlbmQoY29tbWFuZCk7XG4gICAgY29uc3QgdmFsdWUgPSByZXNwb25zZS5QYXJhbWV0ZXI/LlZhbHVlIHx8IFwiXCI7XG4gICAgXG4gICAgLy8gU3BsaXQgYnkgY29tbWEgYW5kIHRyaW0gd2hpdGVzcGFjZVxuICAgIGNvbnN0IGVtYWlscyA9IHZhbHVlXG4gICAgICAuc3BsaXQoXCIsXCIpXG4gICAgICAubWFwKGVtYWlsID0+IGVtYWlsLnRyaW0oKSlcbiAgICAgIC5maWx0ZXIoZW1haWwgPT4gZW1haWwubGVuZ3RoID4gMCk7XG4gICAgXG4gICAgY29uc29sZS5sb2coXFxgRm91bmQgXFwke2VtYWlscy5sZW5ndGh9IGVtYWlsKHMpIGluIHBhcmFtZXRlcjogXFwke2VtYWlscy5qb2luKFwiLCBcIil9XFxgKTtcbiAgICByZXR1cm4gZW1haWxzO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciByZWFkaW5nIHBhcmFtZXRlcjpcIiwgZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcihcXGBGYWlsZWQgdG8gcmVhZCBwYXJhbWV0ZXIgXFwke3BhcmFtZXRlck5hbWV9OiBcXCR7ZXJyb3IubWVzc2FnZX1cXGApO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHN1YnNjcmliZUVtYWlscyh0b3BpY0FybiwgZW1haWxzKSB7XG4gIGNvbnN0IHN1YnNjcmlwdGlvbkFybnMgPSBbXTtcbiAgXG4gIGZvciAoY29uc3QgZW1haWwgb2YgZW1haWxzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgU3Vic2NyaWJlQ29tbWFuZCh7XG4gICAgICAgIFRvcGljQXJuOiB0b3BpY0FybixcbiAgICAgICAgUHJvdG9jb2w6IFwiZW1haWxcIixcbiAgICAgICAgRW5kcG9pbnQ6IGVtYWlsLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHNucy5zZW5kKGNvbW1hbmQpO1xuICAgICAgY29uc29sZS5sb2coXFxgU3Vic2NyaWJlZCBcXCR7ZW1haWx9IHRvIHRvcGljLiBTdWJzY3JpcHRpb24gQVJOOiBcXCR7cmVzcG9uc2UuU3Vic2NyaXB0aW9uQXJufVxcYCk7XG4gICAgICBzdWJzY3JpcHRpb25Bcm5zLnB1c2gocmVzcG9uc2UuU3Vic2NyaXB0aW9uQXJuKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcXGBFcnJvciBzdWJzY3JpYmluZyBcXCR7ZW1haWx9OlxcYCwgZXJyb3IpO1xuICAgICAgLy8gQ29udGludWUgd2l0aCBvdGhlciBlbWFpbHMgZXZlbiBpZiBvbmUgZmFpbHNcbiAgICB9XG4gIH1cbiAgXG4gIHJldHVybiBzdWJzY3JpcHRpb25Bcm5zO1xufVxuXG5hc3luYyBmdW5jdGlvbiB1bnN1YnNjcmliZUVtYWlscyhzdWJzY3JpcHRpb25Bcm5zKSB7XG4gIGZvciAoY29uc3QgYXJuIG9mIHN1YnNjcmlwdGlvbkFybnMpIHtcbiAgICAvLyBTa2lwIHBlbmRpbmcgY29uZmlybWF0aW9ucyAodGhleSBhdXRvLWV4cGlyZSlcbiAgICBpZiAoYXJuID09PSBcInBlbmRpbmcgY29uZmlybWF0aW9uXCIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiU2tpcHBpbmcgcGVuZGluZyBjb25maXJtYXRpb24gc3Vic2NyaXB0aW9uXCIpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIFxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFVuc3Vic2NyaWJlQ29tbWFuZCh7IFN1YnNjcmlwdGlvbkFybjogYXJuIH0pO1xuICAgICAgYXdhaXQgc25zLnNlbmQoY29tbWFuZCk7XG4gICAgICBjb25zb2xlLmxvZyhcXGBVbnN1YnNjcmliZWQ6IFxcJHthcm59XFxgKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcXGBFcnJvciB1bnN1YnNjcmliaW5nIFxcJHthcm59OlxcYCwgZXJyb3IpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0VG9waWNTdWJzY3JpcHRpb25zKHRvcGljQXJuKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBMaXN0U3Vic2NyaXB0aW9uc0J5VG9waWNDb21tYW5kKHsgVG9waWNBcm46IHRvcGljQXJuIH0pO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc25zLnNlbmQoY29tbWFuZCk7XG4gICAgcmV0dXJuIHJlc3BvbnNlLlN1YnNjcmlwdGlvbnMgfHwgW107XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGxpc3Rpbmcgc3Vic2NyaXB0aW9uczpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuXG5leHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgY29uc29sZS5sb2coXCJFdmVudDpcIiwgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcbiAgXG4gIGNvbnN0IHsgUmVxdWVzdFR5cGUsIFJlc291cmNlUHJvcGVydGllcywgUGh5c2ljYWxSZXNvdXJjZUlkIH0gPSBldmVudDtcbiAgY29uc3QgeyBUb3BpY0FybiwgUGFyYW1ldGVyTmFtZSB9ID0gUmVzb3VyY2VQcm9wZXJ0aWVzO1xuICBcbiAgdHJ5IHtcbiAgICBpZiAoUmVxdWVzdFR5cGUgPT09IFwiQ3JlYXRlXCIgfHwgUmVxdWVzdFR5cGUgPT09IFwiVXBkYXRlXCIpIHtcbiAgICAgIGNvbnN0IGVtYWlscyA9IGF3YWl0IGdldEVtYWlsc0Zyb21QYXJhbWV0ZXIoUGFyYW1ldGVyTmFtZSk7XG4gICAgICBcbiAgICAgIGlmIChlbWFpbHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIk5vIGVtYWlscyBmb3VuZCBpbiBwYXJhbWV0ZXIuIE5vIHN1YnNjcmlwdGlvbnMgY3JlYXRlZC5cIik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgUGh5c2ljYWxSZXNvdXJjZUlkOiBQaHlzaWNhbFJlc291cmNlSWQgfHwgXFxgZW1haWwtc3Vic2NyaWJlci1cXCR7RGF0ZS5ub3coKX1cXGAsXG4gICAgICAgICAgRGF0YToge1xuICAgICAgICAgICAgU3Vic2NyaXB0aW9uQ291bnQ6IDAsXG4gICAgICAgICAgICBFbWFpbHM6IFwiXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uQXJucyA9IGF3YWl0IHN1YnNjcmliZUVtYWlscyhUb3BpY0FybiwgZW1haWxzKTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgUGh5c2ljYWxSZXNvdXJjZUlkOiBQaHlzaWNhbFJlc291cmNlSWQgfHwgXFxgZW1haWwtc3Vic2NyaWJlci1cXCR7RGF0ZS5ub3coKX1cXGAsXG4gICAgICAgIERhdGE6IHtcbiAgICAgICAgICBTdWJzY3JpcHRpb25Db3VudDogc3Vic2NyaXB0aW9uQXJucy5sZW5ndGgsXG4gICAgICAgICAgRW1haWxzOiBlbWFpbHMuam9pbihcIixcIiksXG4gICAgICAgICAgU3Vic2NyaXB0aW9uQXJuczogc3Vic2NyaXB0aW9uQXJucy5qb2luKFwiLFwiKSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChSZXF1ZXN0VHlwZSA9PT0gXCJEZWxldGVcIikge1xuICAgICAgLy8gT24gZGVsZXRpb24sIHJlbW92ZSBhbGwgZW1haWwgc3Vic2NyaXB0aW9ucyBmcm9tIHRoZSB0b3BpY1xuICAgICAgLy8gTm90ZTogV2UgcmVtb3ZlIGFsbCBlbWFpbCBzdWJzY3JpcHRpb25zIHNpbmNlIHdlIGNhbid0IHJlbGlhYmx5IHRyYWNrXG4gICAgICAvLyB3aGljaCBvbmVzIHdlIGNyZWF0ZWQgKFNOUyByZXR1cm5zIFwicGVuZGluZyBjb25maXJtYXRpb25cIiBpbml0aWFsbHkpLlxuICAgICAgLy8gVGhpcyBpcyBhY2NlcHRhYmxlIGZvciBhIGRlZGljYXRlZCBOZXB0dW5lIG5vdGlmaWNhdGlvbiB0b3BpYy5cbiAgICAgIGNvbnNvbGUubG9nKFwiRGVsZXRlIHJlcXVlc3QgLSBjbGVhbmluZyB1cCBlbWFpbCBzdWJzY3JpcHRpb25zXCIpO1xuICAgICAgXG4gICAgICBjb25zdCBhbGxTdWJzY3JpcHRpb25zID0gYXdhaXQgbGlzdFRvcGljU3Vic2NyaXB0aW9ucyhUb3BpY0Fybik7XG4gICAgICBjb25zdCBlbWFpbFN1YnNjcmlwdGlvbnMgPSBhbGxTdWJzY3JpcHRpb25zXG4gICAgICAgIC5maWx0ZXIoc3ViID0+IHN1Yi5Qcm90b2NvbCA9PT0gXCJlbWFpbFwiKVxuICAgICAgICAubWFwKHN1YiA9PiBzdWIuU3Vic2NyaXB0aW9uQXJuKTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coXFxgRm91bmQgXFwke2VtYWlsU3Vic2NyaXB0aW9ucy5sZW5ndGh9IGVtYWlsIHN1YnNjcmlwdGlvbihzKSB0byByZW1vdmVcXGApO1xuICAgICAgYXdhaXQgdW5zdWJzY3JpYmVFbWFpbHMoZW1haWxTdWJzY3JpcHRpb25zKTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgUGh5c2ljYWxSZXNvdXJjZUlkOiBQaHlzaWNhbFJlc291cmNlSWQsXG4gICAgICB9O1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgUGh5c2ljYWxSZXNvdXJjZUlkOiBQaHlzaWNhbFJlc291cmNlSWQgfHwgXFxgZW1haWwtc3Vic2NyaWJlci1cXCR7RGF0ZS5ub3coKX1cXGAsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiSGFuZGxlciBlcnJvcjpcIiwgZXJyb3IpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuICAgICAgICBgKSxcbiAgICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICAgIGxvZ1JldGVudGlvbjogYXdzX2xvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gcmVhZCBTU00gcGFyYW1ldGVyXG4gICAgaGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGF3c19pYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXCJzc206R2V0UGFyYW1ldGVyXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBBcm4uZm9ybWF0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzZXJ2aWNlOiBcInNzbVwiLFxuICAgICAgICAgICAgICByZWdpb246IGVmZmVjdGl2ZVJlZ2lvbixcbiAgICAgICAgICAgICAgcmVzb3VyY2U6IFwicGFyYW1ldGVyXCIsXG4gICAgICAgICAgICAgIHJlc291cmNlTmFtZTogcGFyYW1ldGVyTmFtZS5zdGFydHNXaXRoKFwiL1wiKVxuICAgICAgICAgICAgICAgID8gcGFyYW1ldGVyTmFtZS5zbGljZSgxKVxuICAgICAgICAgICAgICAgIDogcGFyYW1ldGVyTmFtZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGFja1xuICAgICAgICAgICksXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBtYW5hZ2UgU05TIHN1YnNjcmlwdGlvbnNcbiAgICBoYW5kbGVyLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogYXdzX2lhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBcInNuczpTdWJzY3JpYmVcIixcbiAgICAgICAgICBcInNuczpVbnN1YnNjcmliZVwiLFxuICAgICAgICAgIFwic25zOkxpc3RTdWJzY3JpcHRpb25zQnlUb3BpY1wiLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFt0b3BpY0Fybl0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgdGhlIGN1c3RvbSByZXNvdXJjZVxuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IEN1c3RvbVJlc291cmNlU0RLLlByb3ZpZGVyKFxuICAgICAgdGhpcyxcbiAgICAgIFwiRW1haWxTdWJzY3JpYmVyUHJvdmlkZXJcIixcbiAgICAgIHtcbiAgICAgICAgb25FdmVudEhhbmRsZXI6IGhhbmRsZXIsXG4gICAgICAgIGxvZ1JldGVudGlvbjogYXdzX2xvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgbmV3IEN1c3RvbVJlc291cmNlKHRoaXMsIFwiRW1haWxTdWJzY3JpYmVyUmVzb3VyY2VcIiwge1xuICAgICAgc2VydmljZVRva2VuOiBwcm92aWRlci5zZXJ2aWNlVG9rZW4sXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIFRvcGljQXJuOiB0b3BpY0FybixcbiAgICAgICAgUGFyYW1ldGVyTmFtZTogcGFyYW1ldGVyTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==