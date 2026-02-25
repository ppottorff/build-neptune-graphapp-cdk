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
                username: true,
                email: true,
            },
            accountRecovery: aws_cdk_lib_1.aws_cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            selfSignUpEnabled: false,
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
        });
        const userPoolClient = this.userPool.addClient("webappClient", {
            authFlows: {
                userSrp: true,
                adminUserPassword: true,
            },
            preventUserExistenceErrors: true,
            refreshTokenValidity: props.refreshTokenValidity,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvZ25pdG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQU1xQjtBQUVyQixtRUFJc0M7QUFFdEMsbUZBRzhDO0FBQzlDLHFDQUEwQztBQWMxQyxNQUFhLE9BQVEsU0FBUSxzQkFBUztJQUlwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRO1lBQUUsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUkseUJBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUN6RCxZQUFZLEVBQUUsR0FBRyxFQUFFLGVBQWU7WUFDbEMsYUFBYSxFQUFFO2dCQUNiLFFBQVEsRUFBRSxJQUFJO2dCQUNkLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxlQUFlLEVBQUUseUJBQVcsQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUN2RCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsK0dBQStHO1lBQy9HLDRCQUE0QixFQUFFLHlCQUFXLENBQUMsNEJBQTRCLENBQUMsYUFBYTtZQUNwRixtSEFBbUg7WUFDbkgsVUFBVSxFQUFFO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxJQUFJO2FBQ3JCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFj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QUNGO2dCQUNELGtCQUFrQixFQUFFLHFDQUFrQixDQUFDLEVBQUUsQ0FDdkMsY0FBYyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUNyQzthQUNGO1lBQ0QsUUFBUSxFQUFFO2dCQUNSLE9BQU8sRUFBRSxnQ0FBZ0M7Z0JBQ3pDLE1BQU0sRUFBRSxpQkFBaUI7Z0JBQ3pCLFVBQVUsRUFBRTtvQkFDVixVQUFVLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVO29CQUNyQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7aUJBQ3pCO2FBQ0Y7WUFDRCxNQUFNLEVBQUUsMENBQXVCLENBQUMsY0FBYyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDNUQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7XG4gIER1cmF0aW9uLFxuICBSZW1vdmFsUG9saWN5LFxuICBhd3NfY29nbml0byxcbiAgYXdzX2lhbSxcbiAgQ2ZuT3V0cHV0LFxufSBmcm9tIFwiYXdzLWNkay1saWJcIjtcblxuaW1wb3J0IHtcbiAgQXdzQ3VzdG9tUmVzb3VyY2UsXG4gIEF3c0N1c3RvbVJlc291cmNlUG9saWN5LFxuICBQaHlzaWNhbFJlc291cmNlSWQsXG59IGZyb20gXCJhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzXCI7XG5cbmltcG9ydCB7XG4gIElkZW50aXR5UG9vbCxcbiAgVXNlclBvb2xBdXRoZW50aWNhdGlvblByb3ZpZGVyLFxufSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG8taWRlbnRpdHlwb29sXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvZ25pdG9Qcm9wcyB7XG4gIGFkbWluRW1haWw6IHN0cmluZztcbiAgdXNlck5hbWU/OiBzdHJpbmc7XG4gIHJlZnJlc2hUb2tlblZhbGlkaXR5PzogRHVyYXRpb247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29nbml0b1BhcmFtcyB7XG4gIHVzZXJQb29sSWQ6IHN0cmluZztcbiAgdXNlclBvb2xDbGllbnRJZDogc3RyaW5nO1xuICBpZGVudGl0eVBvb2xJZDogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgQ29nbml0byBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBjb2duaXRvUGFyYW1zOiBDb2duaXRvUGFyYW1zO1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGF3c19jb2duaXRvLlVzZXJQb29sO1xuICBwdWJsaWMgcmVhZG9ubHkgYXV0aGVudGljYXRlZFJvbGU6IGF3c19pYW0uSVJvbGU7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDb2duaXRvUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgaWYgKCFwcm9wcy51c2VyTmFtZSkgcHJvcHMudXNlck5hbWUgPSBwcm9wcy5hZG1pbkVtYWlsLnNwbGl0KFwiQFwiKVswXTtcblxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgYXdzX2NvZ25pdG8uVXNlclBvb2wodGhpcywgXCJ1c2VycG9vbFwiLCB7XG4gICAgICB1c2VyUG9vbE5hbWU6IGAke2lkfS1hcHAtdXNlcnBvb2xgLFxuICAgICAgc2lnbkluQWxpYXNlczoge1xuICAgICAgICB1c2VybmFtZTogdHJ1ZSxcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICB9LFxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBhd3NfY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSxcbiAgICAgIC8vIGFkdmFuY2VkU2VjdXJpdHlNb2RlIGlzIGRlcHJlY2F0ZWQuIFVzZSBTdGFuZGFyZFRocmVhdFByb3RlY3Rpb25Nb2RlIGFuZCBDdXN0b21UaHJlYXRQcm90ZWN0aW9uTW9kZSBpbnN0ZWFkLlxuICAgICAgc3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZTogYXdzX2NvZ25pdG8uU3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZS5GVUxMX0ZVTkNUSU9OLFxuICAgICAgLy8gY3VzdG9tVGhyZWF0UHJvdGVjdGlvbk1vZGU6IGF3c19jb2duaXRvLkN1c3RvbVRocmVhdFByb3RlY3Rpb25Nb2RlLkVOQUJMRUQsIC8vIFVuY29tbWVudCBhbmQgY29uZmlndXJlIGFzIG5lZWRlZFxuICAgICAgYXV0b1ZlcmlmeToge1xuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBwYXNzd29yZFBvbGljeToge1xuICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gdGhpcy51c2VyUG9vbC5hZGRDbGllbnQoXCJ3ZWJhcHBDbGllbnRcIiwge1xuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJTcnA6IHRydWUsXG4gICAgICAgIGFkbWluVXNlclBhc3N3b3JkOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxuICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IHByb3BzLnJlZnJlc2hUb2tlblZhbGlkaXR5LFxuICAgIH0pO1xuXG4gICAgY29uc3QgaWRlbnRpdHlQb29sID0gbmV3IElkZW50aXR5UG9vbCh0aGlzLCBcImlkZW50aXR5UG9vbFwiLCB7XG4gICAgICBhbGxvd1VuYXV0aGVudGljYXRlZElkZW50aXRpZXM6IGZhbHNlLFxuICAgICAgYXV0aGVudGljYXRpb25Qcm92aWRlcnM6IHtcbiAgICAgICAgdXNlclBvb2xzOiBbXG4gICAgICAgICAgbmV3IFVzZXJQb29sQXV0aGVudGljYXRpb25Qcm92aWRlcih7XG4gICAgICAgICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICAgICAgICAgIHVzZXJQb29sQ2xpZW50LFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXV0aGVudGljYXRlZFJvbGUgPSBpZGVudGl0eVBvb2wuYXV0aGVudGljYXRlZFJvbGU7XG5cbiAgICBuZXcgQ3JlYXRlUG9vbFVzZXIodGhpcywgXCJhZG1pbi11c2VyXCIsIHtcbiAgICAgIGVtYWlsOiBwcm9wcy5hZG1pbkVtYWlsLFxuICAgICAgdXNlcm5hbWU6IHByb3BzLnVzZXJOYW1lLFxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgfSk7XG5cbiAgICB0aGlzLmNvZ25pdG9QYXJhbXMgPSB7XG4gICAgICB1c2VyUG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICB1c2VyUG9vbENsaWVudElkOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgaWRlbnRpdHlQb29sSWQ6IGlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICB9O1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sSWRcIiwge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICB9KTtcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xDbGllbnRJZFwiLCB7XG4gICAgICB2YWx1ZTogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICB9KTtcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiSWRlbnRpdHlQb29sSWRcIiwge1xuICAgICAgdmFsdWU6IGlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICB9KTtcblxuICAgIC8vIFN1cHByZXNzaW9uc1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyh0aGlzLnVzZXJQb29sLCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1DT0cyXCIsXG4gICAgICAgIHJlYXNvbjogXCJObyBuZWVkIE1GQSBmb3Igc2FtcGxlXCIsXG4gICAgICB9LFxuICAgIF0pO1xuICB9XG59XG5cbmNsYXNzIENyZWF0ZVBvb2xVc2VyIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHNjb3BlOiBDb25zdHJ1Y3QsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBwcm9wczoge1xuICAgICAgdXNlclBvb2w6IGF3c19jb2duaXRvLklVc2VyUG9vbDtcbiAgICAgIHVzZXJuYW1lOiBzdHJpbmc7XG4gICAgICBlbWFpbDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHN0YXRlbWVudCA9IG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXCJjb2duaXRvLWlkcDpBZG1pbkRlbGV0ZVVzZXJcIiwgXCJjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXJcIl0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy51c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgfSk7XG5cbiAgICBuZXcgQXdzQ3VzdG9tUmVzb3VyY2UodGhpcywgYENyZWF0ZVVzZXItJHtpZH1gLCB7XG4gICAgICBvbkNyZWF0ZToge1xuICAgICAgICBzZXJ2aWNlOiBcIkNvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlclwiLFxuICAgICAgICBhY3Rpb246IFwiYWRtaW5DcmVhdGVVc2VyXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBVc2VyUG9vbElkOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICAgIFVzZXJuYW1lOiBwcm9wcy51c2VybmFtZSxcbiAgICAgICAgICBVc2VyQXR0cmlidXRlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiBcImVtYWlsXCIsXG4gICAgICAgICAgICAgIFZhbHVlOiBwcm9wcy5lbWFpbCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6IFwiZW1haWxfdmVyaWZpZWRcIixcbiAgICAgICAgICAgICAgVmFsdWU6IFwidHJ1ZVwiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwaHlzaWNhbFJlc291cmNlSWQ6IFBoeXNpY2FsUmVzb3VyY2VJZC5vZihcbiAgICAgICAgICBgQ3JlYXRlVXNlci0ke2lkfS0ke3Byb3BzLnVzZXJuYW1lfWBcbiAgICAgICAgKSxcbiAgICAgIH0sXG4gICAgICBvbkRlbGV0ZToge1xuICAgICAgICBzZXJ2aWNlOiBcIkNvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlclwiLFxuICAgICAgICBhY3Rpb246IFwiYWRtaW5EZWxldGVVc2VyXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBVc2VyUG9vbElkOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICAgIFVzZXJuYW1lOiBwcm9wcy51c2VybmFtZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwb2xpY3k6IEF3c0N1c3RvbVJlc291cmNlUG9saWN5LmZyb21TdGF0ZW1lbnRzKFtzdGF0ZW1lbnRdKSxcbiAgICB9KTtcbiAgfVxufVxuIl19