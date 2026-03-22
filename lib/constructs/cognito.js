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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvZ25pdG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQU1xQjtBQUVyQixtRUFJc0M7QUFFdEMsbUZBRzhDO0FBQzlDLHFDQUEwQztBQWMxQyxNQUFhLE9BQVEsU0FBUSxzQkFBUztJQUlwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRO1lBQUUsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUkseUJBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUN6RCxZQUFZLEVBQUUsR0FBRyxFQUFFLGVBQWU7WUFDbEMsYUFBYSxFQUFFO2dCQUNiLFFBQVEsRUFBRSxJQUFJO2dCQUNkLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxlQUFlLEVBQUUseUJBQVcsQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUN2RCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsK0dBQStHO1lBQy9HLDRCQUE0QixFQUFFLHlCQUFXLENBQUMsNEJBQTRCLENBQUMsYUFBYTtZQUNwRixtSEFBbUg7WUFDbkgsVUFBVSxFQUFFO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxJQUFJO2FBQ3JCO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCLEtBQUss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O2dCQUN6QixVQUFVLEVBQUU7b0JBQ1YsVUFBVSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVTtvQkFDckMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO29CQUN4QixjQUFjLEVBQUU7d0JBQ2Q7NEJBQ0UsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO3lCQUNuQjt3QkFDRDs0QkFDRSxJQUFJLEVBQUUsZ0JBQWdCOzRCQUN0QixLQUFLLEVBQUUsTUFBTTt5QkFDZDtxQkFDRjtpQkFDRjtnQkFDRCxrQkFBa0IsRUFBRSxxQ0FBa0IsQ0FBQyxFQUFFLENBQ3ZDLGNBQWMsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FDckM7YUFDRjtZQUNELFFBQVEsRUFBRTtnQkFDUixPQUFPLEVBQUUsZ0NBQWdDO2dCQUN6QyxNQUFNLEVBQUUsaUJBQWlCO2dCQUN6QixVQUFVLEVBQUU7b0JBQ1YsVUFBVSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVTtvQkFDckMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO2lCQUN6QjthQUNGO1lBQ0QsTUFBTSxFQUFFLDBDQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzVELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQge1xuICBEdXJhdGlvbixcbiAgUmVtb3ZhbFBvbGljeSxcbiAgYXdzX2NvZ25pdG8sXG4gIGF3c19pYW0sXG4gIENmbk91dHB1dCxcbn0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5cbmltcG9ydCB7XG4gIEF3c0N1c3RvbVJlc291cmNlLFxuICBBd3NDdXN0b21SZXNvdXJjZVBvbGljeSxcbiAgUGh5c2ljYWxSZXNvdXJjZUlkLFxufSBmcm9tIFwiYXdzLWNkay1saWIvY3VzdG9tLXJlc291cmNlc1wiO1xuXG5pbXBvcnQge1xuICBJZGVudGl0eVBvb2wsXG4gIFVzZXJQb29sQXV0aGVudGljYXRpb25Qcm92aWRlcixcbn0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2duaXRvLWlkZW50aXR5cG9vbFwiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb2duaXRvUHJvcHMge1xuICBhZG1pbkVtYWlsOiBzdHJpbmc7XG4gIHVzZXJOYW1lPzogc3RyaW5nO1xuICByZWZyZXNoVG9rZW5WYWxpZGl0eT86IER1cmF0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZ25pdG9QYXJhbXMge1xuICB1c2VyUG9vbElkOiBzdHJpbmc7XG4gIHVzZXJQb29sQ2xpZW50SWQ6IHN0cmluZztcbiAgaWRlbnRpdHlQb29sSWQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIENvZ25pdG8gZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgY29nbml0b1BhcmFtczogQ29nbml0b1BhcmFtcztcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBhd3NfY29nbml0by5Vc2VyUG9vbDtcbiAgcHVibGljIHJlYWRvbmx5IGF1dGhlbnRpY2F0ZWRSb2xlOiBhd3NfaWFtLklSb2xlO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ29nbml0b1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGlmICghcHJvcHMudXNlck5hbWUpIHByb3BzLnVzZXJOYW1lID0gcHJvcHMuYWRtaW5FbWFpbC5zcGxpdChcIkBcIilbMF07XG5cbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGF3c19jb2duaXRvLlVzZXJQb29sKHRoaXMsIFwidXNlcnBvb2xcIiwge1xuICAgICAgdXNlclBvb2xOYW1lOiBgJHtpZH0tYXBwLXVzZXJwb29sYCxcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcbiAgICAgICAgdXNlcm5hbWU6IHRydWUsXG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIGFjY291bnRSZWNvdmVyeTogYXdzX2NvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcbiAgICAgIC8vIGFkdmFuY2VkU2VjdXJpdHlNb2RlIGlzIGRlcHJlY2F0ZWQuIFVzZSBTdGFuZGFyZFRocmVhdFByb3RlY3Rpb25Nb2RlIGFuZCBDdXN0b21UaHJlYXRQcm90ZWN0aW9uTW9kZSBpbnN0ZWFkLlxuICAgICAgc3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZTogYXdzX2NvZ25pdG8uU3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZS5GVUxMX0ZVTkNUSU9OLFxuICAgICAgLy8gY3VzdG9tVGhyZWF0UHJvdGVjdGlvbk1vZGU6IGF3c19jb2duaXRvLkN1c3RvbVRocmVhdFByb3RlY3Rpb25Nb2RlLkVOQUJMRUQsIC8vIFVuY29tbWVudCBhbmQgY29uZmlndXJlIGFzIG5lZWRlZFxuICAgICAgYXV0b1ZlcmlmeToge1xuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBwYXNzd29yZFBvbGljeToge1xuICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcbiAgICAgICAgdGhlbWU6IG5ldyBhd3NfY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtdXRhYmxlOiB0cnVlIH0pLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gdGhpcy51c2VyUG9vbC5hZGRDbGllbnQoXCJ3ZWJhcHBDbGllbnRcIiwge1xuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJTcnA6IHRydWUsXG4gICAgICAgIGFkbWluVXNlclBhc3N3b3JkOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxuICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IHByb3BzLnJlZnJlc2hUb2tlblZhbGlkaXR5LFxuICAgICAgcmVhZEF0dHJpYnV0ZXM6IG5ldyBhd3NfY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKCkud2l0aEN1c3RvbUF0dHJpYnV0ZXMoXCJ0aGVtZVwiKSxcbiAgICAgIHdyaXRlQXR0cmlidXRlczogbmV3IGF3c19jb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKS53aXRoQ3VzdG9tQXR0cmlidXRlcyhcInRoZW1lXCIpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaWRlbnRpdHlQb29sID0gbmV3IElkZW50aXR5UG9vbCh0aGlzLCBcImlkZW50aXR5UG9vbFwiLCB7XG4gICAgICBhbGxvd1VuYXV0aGVudGljYXRlZElkZW50aXRpZXM6IGZhbHNlLFxuICAgICAgYXV0aGVudGljYXRpb25Qcm92aWRlcnM6IHtcbiAgICAgICAgdXNlclBvb2xzOiBbXG4gICAgICAgICAgbmV3IFVzZXJQb29sQXV0aGVudGljYXRpb25Qcm92aWRlcih7XG4gICAgICAgICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICAgICAgICAgIHVzZXJQb29sQ2xpZW50LFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXV0aGVudGljYXRlZFJvbGUgPSBpZGVudGl0eVBvb2wuYXV0aGVudGljYXRlZFJvbGU7XG5cbiAgICBuZXcgQ3JlYXRlUG9vbFVzZXIodGhpcywgXCJhZG1pbi11c2VyXCIsIHtcbiAgICAgIGVtYWlsOiBwcm9wcy5hZG1pbkVtYWlsLFxuICAgICAgdXNlcm5hbWU6IHByb3BzLnVzZXJOYW1lLFxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgfSk7XG5cbiAgICB0aGlzLmNvZ25pdG9QYXJhbXMgPSB7XG4gICAgICB1c2VyUG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICB1c2VyUG9vbENsaWVudElkOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgaWRlbnRpdHlQb29sSWQ6IGlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICB9O1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sSWRcIiwge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICB9KTtcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xDbGllbnRJZFwiLCB7XG4gICAgICB2YWx1ZTogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICB9KTtcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiSWRlbnRpdHlQb29sSWRcIiwge1xuICAgICAgdmFsdWU6IGlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICB9KTtcblxuICAgIC8vIFN1cHByZXNzaW9uc1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyh0aGlzLnVzZXJQb29sLCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1DT0cyXCIsXG4gICAgICAgIHJlYXNvbjogXCJObyBuZWVkIE1GQSBmb3Igc2FtcGxlXCIsXG4gICAgICB9LFxuICAgIF0pO1xuICB9XG59XG5cbmNsYXNzIENyZWF0ZVBvb2xVc2VyIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHNjb3BlOiBDb25zdHJ1Y3QsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBwcm9wczoge1xuICAgICAgdXNlclBvb2w6IGF3c19jb2duaXRvLklVc2VyUG9vbDtcbiAgICAgIHVzZXJuYW1lOiBzdHJpbmc7XG4gICAgICBlbWFpbDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHN0YXRlbWVudCA9IG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXCJjb2duaXRvLWlkcDpBZG1pbkRlbGV0ZVVzZXJcIiwgXCJjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXJcIl0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy51c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgfSk7XG5cbiAgICBuZXcgQXdzQ3VzdG9tUmVzb3VyY2UodGhpcywgYENyZWF0ZVVzZXItJHtpZH1gLCB7XG4gICAgICBvbkNyZWF0ZToge1xuICAgICAgICBzZXJ2aWNlOiBcIkNvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlclwiLFxuICAgICAgICBhY3Rpb246IFwiYWRtaW5DcmVhdGVVc2VyXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBVc2VyUG9vbElkOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICAgIFVzZXJuYW1lOiBwcm9wcy51c2VybmFtZSxcbiAgICAgICAgICBVc2VyQXR0cmlidXRlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiBcImVtYWlsXCIsXG4gICAgICAgICAgICAgIFZhbHVlOiBwcm9wcy5lbWFpbCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6IFwiZW1haWxfdmVyaWZpZWRcIixcbiAgICAgICAgICAgICAgVmFsdWU6IFwidHJ1ZVwiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwaHlzaWNhbFJlc291cmNlSWQ6IFBoeXNpY2FsUmVzb3VyY2VJZC5vZihcbiAgICAgICAgICBgQ3JlYXRlVXNlci0ke2lkfS0ke3Byb3BzLnVzZXJuYW1lfWBcbiAgICAgICAgKSxcbiAgICAgIH0sXG4gICAgICBvbkRlbGV0ZToge1xuICAgICAgICBzZXJ2aWNlOiBcIkNvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlclwiLFxuICAgICAgICBhY3Rpb246IFwiYWRtaW5EZWxldGVVc2VyXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBVc2VyUG9vbElkOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICAgIFVzZXJuYW1lOiBwcm9wcy51c2VybmFtZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwb2xpY3k6IEF3c0N1c3RvbVJlc291cmNlUG9saWN5LmZyb21TdGF0ZW1lbnRzKFtzdGF0ZW1lbnRdKSxcbiAgICB9KTtcbiAgfVxufVxuIl19