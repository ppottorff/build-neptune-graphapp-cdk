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
            advancedSecurityMode: aws_cdk_lib_1.aws_cognito.AdvancedSecurityMode.ENFORCED,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvZ25pdG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQU1xQjtBQUVyQixtRUFJc0M7QUFFdEMsbUZBRzhDO0FBQzlDLHFDQUEwQztBQWMxQyxNQUFhLE9BQVEsU0FBUSxzQkFBUztJQUdwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRO1lBQUUsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUkseUJBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUN6RCxZQUFZLEVBQUUsR0FBRyxFQUFFLGVBQWU7WUFDbEMsYUFBYSxFQUFFO2dCQUNiLFFBQVEsRUFBRSxJQUFJO2dCQUNkLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxlQUFlLEVBQUUseUJBQVcsQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUN2RCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsb0JBQW9CLEVBQUUseUJBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRO1lBQy9ELFVBQVUsRUFBRTtnQkFDVixLQUFLLEVBQUUsSUFBSTthQUNaO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixjQUFjLEVBQUUsSUFBSTthQUNyQjtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMs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QUFFLENBQ3JDO2FBQ0Y7WUFDRCxRQUFRLEVBQUU7Z0JBQ1IsT0FBTyxFQUFFLGdDQUFnQztnQkFDekMsTUFBTSxFQUFFLGlCQUFpQjtnQkFDekIsVUFBVSxFQUFFO29CQUNWLFVBQVUsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVU7b0JBQ3JDLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtpQkFDekI7YUFDRjtZQUNELE1BQU0sRUFBRSwwQ0FBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM1RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHtcbiAgRHVyYXRpb24sXG4gIFJlbW92YWxQb2xpY3ksXG4gIGF3c19jb2duaXRvLFxuICBhd3NfaWFtLFxuICBDZm5PdXRwdXQsXG59IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuXG5pbXBvcnQge1xuICBBd3NDdXN0b21SZXNvdXJjZSxcbiAgQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3ksXG4gIFBoeXNpY2FsUmVzb3VyY2VJZCxcbn0gZnJvbSBcImF3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXNcIjtcblxuaW1wb3J0IHtcbiAgSWRlbnRpdHlQb29sLFxuICBVc2VyUG9vbEF1dGhlbnRpY2F0aW9uUHJvdmlkZXIsXG59IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY29nbml0by1pZGVudGl0eXBvb2xcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29nbml0b1Byb3BzIHtcbiAgYWRtaW5FbWFpbDogc3RyaW5nO1xuICB1c2VyTmFtZT86IHN0cmluZztcbiAgcmVmcmVzaFRva2VuVmFsaWRpdHk/OiBEdXJhdGlvbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2duaXRvUGFyYW1zIHtcbiAgdXNlclBvb2xJZDogc3RyaW5nO1xuICB1c2VyUG9vbENsaWVudElkOiBzdHJpbmc7XG4gIGlkZW50aXR5UG9vbElkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBDb2duaXRvIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGNvZ25pdG9QYXJhbXM6IENvZ25pdG9QYXJhbXM7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogYXdzX2NvZ25pdG8uVXNlclBvb2w7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDb2duaXRvUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgaWYgKCFwcm9wcy51c2VyTmFtZSkgcHJvcHMudXNlck5hbWUgPSBwcm9wcy5hZG1pbkVtYWlsLnNwbGl0KFwiQFwiKVswXTtcblxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgYXdzX2NvZ25pdG8uVXNlclBvb2wodGhpcywgXCJ1c2VycG9vbFwiLCB7XG4gICAgICB1c2VyUG9vbE5hbWU6IGAke2lkfS1hcHAtdXNlcnBvb2xgLFxuICAgICAgc2lnbkluQWxpYXNlczoge1xuICAgICAgICB1c2VybmFtZTogdHJ1ZSxcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICB9LFxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBhd3NfY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSxcbiAgICAgIGFkdmFuY2VkU2VjdXJpdHlNb2RlOiBhd3NfY29nbml0by5BZHZhbmNlZFNlY3VyaXR5TW9kZS5FTkZPUkNFRCxcbiAgICAgIGF1dG9WZXJpZnk6IHtcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICB9LFxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgbWluTGVuZ3RoOiA4LFxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxuICAgICAgICByZXF1aXJlU3ltYm9sczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IHRoaXMudXNlclBvb2wuYWRkQ2xpZW50KFwid2ViYXBwQ2xpZW50XCIsIHtcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyU3JwOiB0cnVlLFxuICAgICAgICBhZG1pblVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBwcmV2ZW50VXNlckV4aXN0ZW5jZUVycm9yczogdHJ1ZSxcbiAgICAgIHJlZnJlc2hUb2tlblZhbGlkaXR5OiBwcm9wcy5yZWZyZXNoVG9rZW5WYWxpZGl0eSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlkZW50aXR5UG9vbCA9IG5ldyBJZGVudGl0eVBvb2wodGhpcywgXCJpZGVudGl0eVBvb2xcIiwge1xuICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiBmYWxzZSxcbiAgICAgIGF1dGhlbnRpY2F0aW9uUHJvdmlkZXJzOiB7XG4gICAgICAgIHVzZXJQb29sczogW1xuICAgICAgICAgIG5ldyBVc2VyUG9vbEF1dGhlbnRpY2F0aW9uUHJvdmlkZXIoe1xuICAgICAgICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgICAgICAgICB1c2VyUG9vbENsaWVudCxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBuZXcgQ3JlYXRlUG9vbFVzZXIodGhpcywgXCJhZG1pbi11c2VyXCIsIHtcbiAgICAgIGVtYWlsOiBwcm9wcy5hZG1pbkVtYWlsLFxuICAgICAgdXNlcm5hbWU6IHByb3BzLnVzZXJOYW1lLFxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgfSk7XG5cbiAgICB0aGlzLmNvZ25pdG9QYXJhbXMgPSB7XG4gICAgICB1c2VyUG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICB1c2VyUG9vbENsaWVudElkOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgaWRlbnRpdHlQb29sSWQ6IGlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICB9O1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sSWRcIiwge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICB9KTtcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xDbGllbnRJZFwiLCB7XG4gICAgICB2YWx1ZTogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICB9KTtcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiSWRlbnRpdHlQb29sSWRcIiwge1xuICAgICAgdmFsdWU6IGlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICB9KTtcblxuICAgIC8vIFN1cHByZXNzaW9uc1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyh0aGlzLnVzZXJQb29sLCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1DT0cyXCIsXG4gICAgICAgIHJlYXNvbjogXCJObyBuZWVkIE1GQSBmb3Igc2FtcGxlXCIsXG4gICAgICB9LFxuICAgIF0pO1xuICB9XG59XG5cbmNsYXNzIENyZWF0ZVBvb2xVc2VyIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHNjb3BlOiBDb25zdHJ1Y3QsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBwcm9wczoge1xuICAgICAgdXNlclBvb2w6IGF3c19jb2duaXRvLklVc2VyUG9vbDtcbiAgICAgIHVzZXJuYW1lOiBzdHJpbmc7XG4gICAgICBlbWFpbDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHN0YXRlbWVudCA9IG5ldyBhd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXCJjb2duaXRvLWlkcDpBZG1pbkRlbGV0ZVVzZXJcIiwgXCJjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXJcIl0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy51c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgfSk7XG5cbiAgICBuZXcgQXdzQ3VzdG9tUmVzb3VyY2UodGhpcywgYENyZWF0ZVVzZXItJHtpZH1gLCB7XG4gICAgICBvbkNyZWF0ZToge1xuICAgICAgICBzZXJ2aWNlOiBcIkNvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlclwiLFxuICAgICAgICBhY3Rpb246IFwiYWRtaW5DcmVhdGVVc2VyXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBVc2VyUG9vbElkOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICAgIFVzZXJuYW1lOiBwcm9wcy51c2VybmFtZSxcbiAgICAgICAgICBVc2VyQXR0cmlidXRlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiBcImVtYWlsXCIsXG4gICAgICAgICAgICAgIFZhbHVlOiBwcm9wcy5lbWFpbCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6IFwiZW1haWxfdmVyaWZpZWRcIixcbiAgICAgICAgICAgICAgVmFsdWU6IFwidHJ1ZVwiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwaHlzaWNhbFJlc291cmNlSWQ6IFBoeXNpY2FsUmVzb3VyY2VJZC5vZihcbiAgICAgICAgICBgQ3JlYXRlVXNlci0ke2lkfS0ke3Byb3BzLnVzZXJuYW1lfWBcbiAgICAgICAgKSxcbiAgICAgIH0sXG4gICAgICBvbkRlbGV0ZToge1xuICAgICAgICBzZXJ2aWNlOiBcIkNvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlclwiLFxuICAgICAgICBhY3Rpb246IFwiYWRtaW5EZWxldGVVc2VyXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBVc2VyUG9vbElkOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICAgIFVzZXJuYW1lOiBwcm9wcy51c2VybmFtZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwb2xpY3k6IEF3c0N1c3RvbVJlc291cmNlUG9saWN5LmZyb21TdGF0ZW1lbnRzKFtzdGF0ZW1lbnRdKSxcbiAgICB9KTtcbiAgfVxufVxuIl19