"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cognito = void 0;
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const custom_resources_1 = require("aws-cdk-lib/custom-resources");
const aws_cognito_identitypool_1 = require("aws-cdk-lib/aws-cognito-identitypool");
const cdk_nag_1 = require("cdk-nag");
class Cognito extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        if (!props.userName)
            props.userName = props.adminEmail.split("@")[0];
        this.userPool = new aws_cdk_lib_1.aws_cognito.UserPool(this, "userpool", {
            userPoolName: `${id}-app-userpool`,
            signInAliases: {
                email: true,
            },
            accountRecovery: aws_cdk_lib_1.aws_cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            selfSignUpEnabled: true,
            // advancedSecurityMode is deprecated. Use StandardThreatProtectionMode and CustomThreatProtectionMode instead.
            standardThreatProtectionMode: aws_cdk_lib_1.aws_cognito.StandardThreatProtectionMode.FULL_FUNCTION,
            // customThreatProtectionMode: aws_cognito.CustomThreatProtectionMode.ENABLED, // Uncomment and configure as needed
            autoVerify: {
                email: true,
            },
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            customAttributes: {
                theme: new aws_cdk_lib_1.aws_cognito.StringAttribute({ mutable: true }),
            },
        });
        const userPoolClient = this.userPool.addClient("webappClient", {
            authFlows: {
                userSrp: true,
                adminUserPassword: true,
            },
            preventUserExistenceErrors: true,
            refreshTokenValidity: props.refreshTokenValidity,
            readAttributes: new aws_cdk_lib_1.aws_cognito.ClientAttributes().withCustomAttributes("theme"),
            writeAttributes: new aws_cdk_lib_1.aws_cognito.ClientAttributes().withCustomAttributes("theme"),
        });
        const identityPool = new aws_cognito_identitypool_1.IdentityPool(this, "identityPool", {
            allowUnauthenticatedIdentities: false,
            authenticationProviders: {
                userPools: [
                    new aws_cognito_identitypool_1.UserPoolAuthenticationProvider({
                        userPool: this.userPool,
                        userPoolClient,
                    }),
                ],
            },
        });
        this.authenticatedRole = identityPool.authenticatedRole;
        new CreatePoolUser(this, "admin-user", {
            email: props.adminEmail,
            username: props.userName,
            userPool: this.userPool,
        });
        this.cognitoParams = {
            userPoolId: this.userPool.userPoolId,
            userPoolClientId: userPoolClient.userPoolClientId,
            identityPoolId: identityPool.identityPoolId,
        };
        new aws_cdk_lib_1.CfnOutput(this, "UserPoolId", {
            value: this.userPool.userPoolId,
        });
        new aws_cdk_lib_1.CfnOutput(this, "UserPoolClientId", {
            value: userPoolClient.userPoolClientId,
        });
        new aws_cdk_lib_1.CfnOutput(this, "IdentityPoolId", {
            value: identityPool.identityPoolId,
        });
        // Suppressions
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.userPool, [
            {
                id: "AwsSolutions-COG2",
                reason: "No need MFA for sample",
            },
        ]);
    }
}
exports.Cognito = Cognito;
class CreatePoolUser extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const statement = new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: ["cognito-idp:AdminDeleteUser", "cognito-idp:AdminCreateUser"],
            resources: [props.userPool.userPoolArn],
        });
        new custom_resources_1.AwsCustomResource(this, `CreateUser-${id}`, {
            onCreate: {
                service: "CognitoIdentityServiceProvider",
                action: "adminCreateUser",
                parameters: {
                    UserPoolId: props.userPool.userPoolId,
                    Username: props.username,
                    UserAttributes: [
                        {
                            Name: "email",
                            Value: props.email,
                        },
                        {
                            Name: "email_verified",
                            Value: "true",
                        },
                    ],
                },
                physicalResourceId: custom_resources_1.PhysicalResourceId.of(`CreateUser-${id}-${props.username}`),
            },
            onDelete: {
                service: "CognitoIdentityServiceProvider",
                action: "adminDeleteUser",
                parameters: {
                    UserPoolId: props.userPool.userPoolId,
                    Username: props.username,
                },
            },
            policy: custom_resources_1.AwsCustomResourcePolicy.fromStatements([statement]),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvZ25pdG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQU1xQjtBQUVyQixtRUFJc0M7QUFFdEMsbUZBRzhDO0FBQzlDLHFDQUEwQztBQWMxQyxNQUFhLE9BQVEsU0FBUSxzQkFBUztJQUlwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRO1lBQUUsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUkseUJBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUN6RCxZQUFZLEVBQUUsR0FBRyxFQUFFLGVBQWU7WUFDbEMsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxlQUFlLEVBQUUseUJBQVcsQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUN2RCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsK0dBQStHO1lBQy9HLDRCQUE0QixFQUFFLHlCQUFXLENBQUMsNEJBQTRCLENBQUMsYUFBYTtZQUNwRixtSEFBbUg7WUFDbkgsVUFBVSxFQUFFO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxJQUFJO2FBQ3JCO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxJQUFJLHlCQUFXLENBQUMs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Q1YsVUFBVSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVTtvQkFDckMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO29CQUN4QixjQUFjLEVBQUU7d0JBQ2Q7NEJBQ0UsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO3lCQUNuQjt3QkFDRDs0QkFDRSxJQUFJLEVBQUUsZ0JBQWdCOzRCQUN0QixLQUFLLEVBQUUsTUFBTTt5QkFDZDtxQkFDRjtpQkFDRjtnQkFDRCxrQkFBa0IsRUFBRSxxQ0FBa0IsQ0FBQyxFQUFFLENBQ3ZDLGNBQWMsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FDckM7YUFDRjtZQUNELFFBQVEsRUFBRTtnQkFDUixPQUFPLEVBQUUsZ0NBQWdDO2dCQUN6QyxNQUFNLEVBQUUsaUJBQWlCO2dCQUN6QixVQUFVLEVBQUU7b0JBQ1YsVUFBVSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVTtvQkFDckMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO2lCQUN6QjthQUNGO1lBQ0QsTUFBTSxFQUFFLDBDQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzVELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQge1xuICBEdXJhdGlvbixcbiAgUmVtb3ZhbFBvbGljeSxcbiAgYXdzX2NvZ25pdG8sXG4gIGF3c19pYW0sXG4gIENmbk91dHB1dCxcbn0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5cbmltcG9ydCB7XG4gIEF3c0N1c3RvbVJlc291cmNlLFxuICBBd3NDdXN0b21SZXNvdXJjZVBvbGljeSxcbiAgUGh5c2ljYWxSZXNvdXJjZUlkLFxufSBmcm9tIFwiYXdzLWNkay1saWIvY3VzdG9tLXJlc291cmNlc1wiO1xuXG5pbXBvcnQge1xuICBJZGVudGl0eVBvb2wsXG4gIFVzZXJQb29sQXV0aGVudGljYXRpb25Qcm92aWRlcixcbn0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2duaXRvLWlkZW50aXR5cG9vbFwiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb2duaXRvUHJvcHMge1xuICBhZG1pbkVtYWlsOiBzdHJpbmc7XG4gIHVzZXJOYW1lPzogc3RyaW5nO1xuICByZWZyZXNoVG9rZW5WYWxpZGl0eT86IER1cmF0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZ25pdG9QYXJhbXMge1xuICB1c2VyUG9vbElkOiBzdHJpbmc7XG4gIHVzZXJQb29sQ2xpZW50SWQ6IHN0cmluZztcbiAgaWRlbnRpdHlQb29sSWQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIENvZ25pdG8gZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgY29nbml0b1BhcmFtczogQ29nbml0b1BhcmFtcztcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBhd3NfY29nbml0by5Vc2VyUG9vbDtcbiAgcHVibGljIHJlYWRvbmx5IGF1dGhlbnRpY2F0ZWRSb2xlOiBhd3NfaWFtLklSb2xlO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ29nbml0b1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGlmICghcHJvcHMudXNlck5hbWUpIHByb3BzLnVzZXJOYW1lID0gcHJvcHMuYWRtaW5FbWFpbC5zcGxpdChcIkBcIilbMF07XG5cbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGF3c19jb2duaXRvLlVzZXJQb29sKHRoaXMsIFwidXNlcnBvb2xcIiwge1xuICAgICAgdXNlclBvb2xOYW1lOiBgJHtpZH0tYXBwLXVzZXJwb29sYCxcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICB9LFxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBhd3NfY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgLy8gYWR2YW5jZWRTZWN1cml0eU1vZGUgaXMgZGVwcmVjYXRlZC4gVXNlIFN0YW5kYXJkVGhyZWF0UHJvdGVjdGlvbk1vZGUgYW5kIEN1c3RvbVRocmVhdFByb3RlY3Rpb25Nb2RlIGluc3RlYWQuXG4gICAgICBzdGFuZGFyZFRocmVhdFByb3RlY3Rpb25Nb2RlOiBhd3NfY29nbml0by5TdGFuZGFyZFRocmVhdFByb3RlY3Rpb25Nb2RlLkZVTExfRlVOQ1RJT04sXG4gICAgICAvLyBjdXN0b21UaHJlYXRQcm90ZWN0aW9uTW9kZTogYXdzX2NvZ25pdG8uQ3VzdG9tVGhyZWF0UHJvdGVjdGlvbk1vZGUuRU5BQkxFRCwgLy8gVW5jb21tZW50IGFuZCBjb25maWd1cmUgYXMgbmVlZGVkXG4gICAgICBhdXRvVmVyaWZ5OiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHBhc3N3b3JkUG9saWN5OiB7XG4gICAgICAgIG1pbkxlbmd0aDogOCxcbiAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IHRydWUsXG4gICAgICB9LFxuICAgICAgY3VzdG9tQXR0cmlidXRlczoge1xuICAgICAgICB0aGVtZTogbmV3IGF3c19jb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IG11dGFibGU6IHRydWUgfSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSB0aGlzLnVzZXJQb29sLmFkZENsaWVudChcIndlYmFwcENsaWVudFwiLCB7XG4gICAgICBhdXRoRmxvd3M6IHtcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICB9LFxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogcHJvcHMucmVmcmVzaFRva2VuVmFsaWRpdHksXG4gICAgICByZWFkQXR0cmlidXRlczogbmV3IGF3c19jb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKS53aXRoQ3VzdG9tQXR0cmlidXRlcyhcInRoZW1lXCIpLFxuICAgICAgd3JpdGVBdHRyaWJ1dGVzOiBuZXcgYXdzX2NvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpLndpdGhDdXN0b21BdHRyaWJ1dGVzKFwidGhlbWVcIiksXG4gICAgfSk7XG5cbiAgICBjb25zdCBpZGVudGl0eVBvb2wgPSBuZXcgSWRlbnRpdHlQb29sKHRoaXMsIFwiaWRlbnRpdHlQb29sXCIsIHtcbiAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXG4gICAgICBhdXRoZW50aWNhdGlvblByb3ZpZGVyczoge1xuICAgICAgICB1c2VyUG9vbHM6IFtcbiAgICAgICAgICBuZXcgVXNlclBvb2xBdXRoZW50aWNhdGlvblByb3ZpZGVyKHtcbiAgICAgICAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgICAgICAgICAgdXNlclBvb2xDbGllbnQsXG4gICAgICAgICAgfSksXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hdXRoZW50aWNhdGVkUm9sZSA9IGlkZW50aXR5UG9vbC5hdXRoZW50aWNhdGVkUm9sZTtcblxuICAgIG5ldyBDcmVhdGVQb29sVXNlcih0aGlzLCBcImFkbWluLXVzZXJcIiwge1xuICAgICAgZW1haWw6IHByb3BzLmFkbWluRW1haWwsXG4gICAgICB1c2VybmFtZTogcHJvcHMudXNlck5hbWUsXG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICB9KTtcblxuICAgIHRoaXMuY29nbml0b1BhcmFtcyA9IHtcbiAgICAgIHVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIHVzZXJQb29sQ2xpZW50SWQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBpZGVudGl0eVBvb2xJZDogaWRlbnRpdHlQb29sLmlkZW50aXR5UG9vbElkLFxuICAgIH07XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xJZFwiLCB7XG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgIH0pO1xuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbENsaWVudElkXCIsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgIH0pO1xuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJJZGVudGl0eVBvb2xJZFwiLCB7XG4gICAgICB2YWx1ZTogaWRlbnRpdHlQb29sLmlkZW50aXR5UG9vbElkLFxuICAgIH0pO1xuXG4gICAgLy8gU3VwcHJlc3Npb25zXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKHRoaXMudXNlclBvb2wsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUNPRzJcIixcbiAgICAgICAgcmVhc29uOiBcIk5vIG5lZWQgTUZBIGZvciBzYW1wbGVcIixcbiAgICAgIH0sXG4gICAgXSk7XG4gIH1cbn1cblxuY2xhc3MgQ3JlYXRlUG9vbFVzZXIgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlcm5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgY29uc3RydWN0b3IoXG4gICAgc2NvcGU6IENvbnN0cnVjdCxcbiAgICBpZDogc3RyaW5nLFxuICAgIHByb3BzOiB7XG4gICAgICB1c2VyUG9vbDogYXdzX2NvZ25pdG8uSVVzZXJQb29sO1xuICAgICAgdXNlcm5hbWU6IHN0cmluZztcbiAgICAgIGVtYWlsOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgfVxuICApIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3Qgc3RhdGVtZW50ID0gbmV3IGF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFtcImNvZ25pdG8taWRwOkFkbWluRGVsZXRlVXNlclwiLCBcImNvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlclwiXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLnVzZXJQb29sLnVzZXJQb29sQXJuXSxcbiAgICB9KTtcblxuICAgIG5ldyBBd3NDdXN0b21SZXNvdXJjZSh0aGlzLCBgQ3JlYXRlVXNlci0ke2lkfWAsIHtcbiAgICAgIG9uQ3JlYXRlOiB7XG4gICAgICAgIHNlcnZpY2U6IFwiQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyXCIsXG4gICAgICAgIGFjdGlvbjogXCJhZG1pbkNyZWF0ZVVzZXJcIixcbiAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgIFVzZXJQb29sSWQ6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgICAgVXNlcm5hbWU6IHByb3BzLnVzZXJuYW1lLFxuICAgICAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6IFwiZW1haWxcIixcbiAgICAgICAgICAgICAgVmFsdWU6IHByb3BzLmVtYWlsLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogXCJlbWFpbF92ZXJpZmllZFwiLFxuICAgICAgICAgICAgICBWYWx1ZTogXCJ0cnVlXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHBoeXNpY2FsUmVzb3VyY2VJZDogUGh5c2ljYWxSZXNvdXJjZUlkLm9mKFxuICAgICAgICAgIGBDcmVhdGVVc2VyLSR7aWR9LSR7cHJvcHMudXNlcm5hbWV9YFxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIG9uRGVsZXRlOiB7XG4gICAgICAgIHNlcnZpY2U6IFwiQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyXCIsXG4gICAgICAgIGFjdGlvbjogXCJhZG1pbkRlbGV0ZVVzZXJcIixcbiAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgIFVzZXJQb29sSWQ6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgICAgVXNlcm5hbWU6IHByb3BzLnVzZXJuYW1lLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHBvbGljeTogQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3kuZnJvbVN0YXRlbWVudHMoW3N0YXRlbWVudF0pLFxuICAgIH0pO1xuICB9XG59XG4iXX0=