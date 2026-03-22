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
        // ─── Cognito Groups (roles) ──────────────────────────────────────
        const adminGroup = new aws_cdk_lib_1.aws_cognito.CfnUserPoolGroup(this, "AdminGroup", {
            userPoolId: this.userPool.userPoolId,
            groupName: "Admin",
            description: "Full access — can mutate data, manage users, and view monitoring",
            precedence: 0,
        });
        new aws_cdk_lib_1.aws_cognito.CfnUserPoolGroup(this, "EditorGroup", {
            userPoolId: this.userPool.userPoolId,
            groupName: "Editor",
            description: "Can add and modify graph data",
            precedence: 10,
        });
        new aws_cdk_lib_1.aws_cognito.CfnUserPoolGroup(this, "ViewerGroup", {
            userPoolId: this.userPool.userPoolId,
            groupName: "Viewer",
            description: "Read-only access to dashboards and graph visualization",
            precedence: 20,
        });
        // Add the initial admin user to the Admin group
        const adminGroupMembership = new custom_resources_1.AwsCustomResource(this, "AdminGroupMembership", {
            onCreate: {
                service: "CognitoIdentityServiceProvider",
                action: "adminAddUserToGroup",
                parameters: {
                    UserPoolId: this.userPool.userPoolId,
                    Username: props.userName,
                    GroupName: "Admin",
                },
                physicalResourceId: custom_resources_1.PhysicalResourceId.of(`AdminGroupMembership-${props.userName}`),
            },
            onDelete: {
                service: "CognitoIdentityServiceProvider",
                action: "adminRemoveUserFromGroup",
                parameters: {
                    UserPoolId: this.userPool.userPoolId,
                    Username: props.userName,
                    GroupName: "Admin",
                },
            },
            policy: custom_resources_1.AwsCustomResourcePolicy.fromStatements([
                new aws_cdk_lib_1.aws_iam.PolicyStatement({
                    actions: [
                        "cognito-idp:AdminAddUserToGroup",
                        "cognito-idp:AdminRemoveUserFromGroup",
                    ],
                    resources: [this.userPool.userPoolArn],
                }),
            ]),
        });
        adminGroupMembership.node.addDependency(adminGroup);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvZ25pdG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQU1xQjtBQUVyQixtRUFJc0M7QUFFdEMsbUZBRzhDO0FBQzlDLHFDQUEwQztBQWMxQyxNQUFhLE9BQVEsU0FBUSxzQkFBUztJQUlwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRO1lBQUUsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUkseUJBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUN6RCxZQUFZLEVBQUUsR0FBRyxFQUFFLGVBQWU7WUFDbEMsYUFBYSxFQUFFO2dCQUNiLFFBQVEsRUFBRSxJQUFJO2dCQUNkLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxlQUFlLEVBQUUseUJBQVcsQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUN2RCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsK0dBQStHO1lBQy9HLDRCQUE0QixFQUFFLHlCQUFXLENBQUMsNEJBQTRCLENBQUMsYUFBYTtZQUNwRixtSEFBbUg7WUFDbkgsVUFBVSxFQUFFO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxJQUFJO2FBQ3JCO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCLEtBQUss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QUFLLENBQUMsUUFBUTtpQkFDekI7YUFDRjtZQUNELE1BQU0sRUFBRSwwQ0FBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM1RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHtcbiAgRHVyYXRpb24sXG4gIFJlbW92YWxQb2xpY3ksXG4gIGF3c19jb2duaXRvLFxuICBhd3NfaWFtLFxuICBDZm5PdXRwdXQsXG59IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuXG5pbXBvcnQge1xuICBBd3NDdXN0b21SZXNvdXJjZSxcbiAgQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3ksXG4gIFBoeXNpY2FsUmVzb3VyY2VJZCxcbn0gZnJvbSBcImF3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXNcIjtcblxuaW1wb3J0IHtcbiAgSWRlbnRpdHlQb29sLFxuICBVc2VyUG9vbEF1dGhlbnRpY2F0aW9uUHJvdmlkZXIsXG59IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY29nbml0by1pZGVudGl0eXBvb2xcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29nbml0b1Byb3BzIHtcbiAgYWRtaW5FbWFpbDogc3RyaW5nO1xuICB1c2VyTmFtZT86IHN0cmluZztcbiAgcmVmcmVzaFRva2VuVmFsaWRpdHk/OiBEdXJhdGlvbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2duaXRvUGFyYW1zIHtcbiAgdXNlclBvb2xJZDogc3RyaW5nO1xuICB1c2VyUG9vbENsaWVudElkOiBzdHJpbmc7XG4gIGlkZW50aXR5UG9vbElkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBDb2duaXRvIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGNvZ25pdG9QYXJhbXM6IENvZ25pdG9QYXJhbXM7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogYXdzX2NvZ25pdG8uVXNlclBvb2w7XG4gIHB1YmxpYyByZWFkb25seSBhdXRoZW50aWNhdGVkUm9sZTogYXdzX2lhbS5JUm9sZTtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENvZ25pdG9Qcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBpZiAoIXByb3BzLnVzZXJOYW1lKSBwcm9wcy51c2VyTmFtZSA9IHByb3BzLmFkbWluRW1haWwuc3BsaXQoXCJAXCIpWzBdO1xuXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBhd3NfY29nbml0by5Vc2VyUG9vbCh0aGlzLCBcInVzZXJwb29sXCIsIHtcbiAgICAgIHVzZXJQb29sTmFtZTogYCR7aWR9LWFwcC11c2VycG9vbGAsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XG4gICAgICAgIHVzZXJuYW1lOiB0cnVlLFxuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGF3c19jb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICAvLyBhZHZhbmNlZFNlY3VyaXR5TW9kZSBpcyBkZXByZWNhdGVkLiBVc2UgU3RhbmRhcmRUaHJlYXRQcm90ZWN0aW9uTW9kZSBhbmQgQ3VzdG9tVGhyZWF0UHJvdGVjdGlvbk1vZGUgaW5zdGVhZC5cbiAgICAgIHN0YW5kYXJkVGhyZWF0UHJvdGVjdGlvbk1vZGU6IGF3c19jb2duaXRvLlN0YW5kYXJkVGhyZWF0UHJvdGVjdGlvbk1vZGUuRlVMTF9GVU5DVElPTixcbiAgICAgIC8vIGN1c3RvbVRocmVhdFByb3RlY3Rpb25Nb2RlOiBhd3NfY29nbml0by5DdXN0b21UaHJlYXRQcm90ZWN0aW9uTW9kZS5FTkFCTEVELCAvLyBVbmNvbW1lbnQgYW5kIGNvbmZpZ3VyZSBhcyBuZWVkZWRcbiAgICAgIGF1dG9WZXJpZnk6IHtcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICB9LFxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgbWluTGVuZ3RoOiA4LFxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxuICAgICAgICByZXF1aXJlU3ltYm9sczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XG4gICAgICAgIHRoZW1lOiBuZXcgYXdzX2NvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbXV0YWJsZTogdHJ1ZSB9KSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IHRoaXMudXNlclBvb2wuYWRkQ2xpZW50KFwid2ViYXBwQ2xpZW50XCIsIHtcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyU3JwOiB0cnVlLFxuICAgICAgICBhZG1pblVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBwcmV2ZW50VXNlckV4aXN0ZW5jZUVycm9yczogdHJ1ZSxcbiAgICAgIHJlZnJlc2hUb2tlblZhbGlkaXR5OiBwcm9wcy5yZWZyZXNoVG9rZW5WYWxpZGl0eSxcbiAgICAgIHJlYWRBdHRyaWJ1dGVzOiBuZXcgYXdzX2NvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpLndpdGhDdXN0b21BdHRyaWJ1dGVzKFwidGhlbWVcIiksXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBhd3NfY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKCkud2l0aEN1c3RvbUF0dHJpYnV0ZXMoXCJ0aGVtZVwiKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlkZW50aXR5UG9vbCA9IG5ldyBJZGVudGl0eVBvb2wodGhpcywgXCJpZGVudGl0eVBvb2xcIiwge1xuICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiBmYWxzZSxcbiAgICAgIGF1dGhlbnRpY2F0aW9uUHJvdmlkZXJzOiB7XG4gICAgICAgIHVzZXJQb29sczogW1xuICAgICAgICAgIG5ldyBVc2VyUG9vbEF1dGhlbnRpY2F0aW9uUHJvdmlkZXIoe1xuICAgICAgICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgICAgICAgICB1c2VyUG9vbENsaWVudCxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmF1dGhlbnRpY2F0ZWRSb2xlID0gaWRlbnRpdHlQb29sLmF1dGhlbnRpY2F0ZWRSb2xlO1xuXG4gICAgbmV3IENyZWF0ZVBvb2xVc2VyKHRoaXMsIFwiYWRtaW4tdXNlclwiLCB7XG4gICAgICBlbWFpbDogcHJvcHMuYWRtaW5FbWFpbCxcbiAgICAgIHVzZXJuYW1lOiBwcm9wcy51c2VyTmFtZSxcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgIH0pO1xuXG4gICAgdGhpcy5jb2duaXRvUGFyYW1zID0ge1xuICAgICAgdXNlclBvb2xJZDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgdXNlclBvb2xDbGllbnRJZDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGlkZW50aXR5UG9vbElkOiBpZGVudGl0eVBvb2wuaWRlbnRpdHlQb29sSWQsXG4gICAgfTtcblxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbElkXCIsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgfSk7XG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sQ2xpZW50SWRcIiwge1xuICAgICAgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgfSk7XG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIklkZW50aXR5UG9vbElkXCIsIHtcbiAgICAgIHZhbHVlOiBpZGVudGl0eVBvb2wuaWRlbnRpdHlQb29sSWQsXG4gICAgfSk7XG5cbiAgICAvLyBTdXBwcmVzc2lvbnNcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnModGhpcy51c2VyUG9vbCwgW1xuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtQ09HMlwiLFxuICAgICAgICByZWFzb246IFwiTm8gbmVlZCBNRkEgZm9yIHNhbXBsZVwiLFxuICAgICAgfSxcbiAgICBdKTtcblxuICAgIC8vIOKUgOKUgOKUgCBDb2duaXRvIEdyb3VwcyAocm9sZXMpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuICAgIGNvbnN0IGFkbWluR3JvdXAgPSBuZXcgYXdzX2NvZ25pdG8uQ2ZuVXNlclBvb2xHcm91cCh0aGlzLCBcIkFkbWluR3JvdXBcIiwge1xuICAgICAgdXNlclBvb2xJZDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZ3JvdXBOYW1lOiBcIkFkbWluXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJGdWxsIGFjY2VzcyDigJQgY2FuIG11dGF0ZSBkYXRhLCBtYW5hZ2UgdXNlcnMsIGFuZCB2aWV3IG1vbml0b3JpbmdcIixcbiAgICAgIHByZWNlZGVuY2U6IDAsXG4gICAgfSk7XG5cbiAgICBuZXcgYXdzX2NvZ25pdG8uQ2ZuVXNlclBvb2xHcm91cCh0aGlzLCBcIkVkaXRvckdyb3VwXCIsIHtcbiAgICAgIHVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIGdyb3VwTmFtZTogXCJFZGl0b3JcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNhbiBhZGQgYW5kIG1vZGlmeSBncmFwaCBkYXRhXCIsXG4gICAgICBwcmVjZWRlbmNlOiAxMCxcbiAgICB9KTtcblxuICAgIG5ldyBhd3NfY29nbml0by5DZm5Vc2VyUG9vbEdyb3VwKHRoaXMsIFwiVmlld2VyR3JvdXBcIiwge1xuICAgICAgdXNlclBvb2xJZDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZ3JvdXBOYW1lOiBcIlZpZXdlclwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiUmVhZC1vbmx5IGFjY2VzcyB0byBkYXNoYm9hcmRzIGFuZCBncmFwaCB2aXN1YWxpemF0aW9uXCIsXG4gICAgICBwcmVjZWRlbmNlOiAyMCxcbiAgICB9KTtcblxuICAgIC8vIEFkZCB0aGUgaW5pdGlhbCBhZG1pbiB1c2VyIHRvIHRoZSBBZG1pbiBncm91cFxuICAgIGNvbnN0IGFkbWluR3JvdXBNZW1iZXJzaGlwID0gbmV3IEF3c0N1c3RvbVJlc291cmNlKHRoaXMsIFwiQWRtaW5Hcm91cE1lbWJlcnNoaXBcIiwge1xuICAgICAgb25DcmVhdGU6IHtcbiAgICAgICAgc2VydmljZTogXCJDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXJcIixcbiAgICAgICAgYWN0aW9uOiBcImFkbWluQWRkVXNlclRvR3JvdXBcIixcbiAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgICBVc2VybmFtZTogcHJvcHMudXNlck5hbWUsXG4gICAgICAgICAgR3JvdXBOYW1lOiBcIkFkbWluXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHBoeXNpY2FsUmVzb3VyY2VJZDogUGh5c2ljYWxSZXNvdXJjZUlkLm9mKFxuICAgICAgICAgIGBBZG1pbkdyb3VwTWVtYmVyc2hpcC0ke3Byb3BzLnVzZXJOYW1lfWBcbiAgICAgICAgKSxcbiAgICAgIH0sXG4gICAgICBvbkRlbGV0ZToge1xuICAgICAgICBzZXJ2aWNlOiBcIkNvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlclwiLFxuICAgICAgICBhY3Rpb246IFwiYWRtaW5SZW1vdmVVc2VyRnJvbUdyb3VwXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgICAgVXNlcm5hbWU6IHByb3BzLnVzZXJOYW1lLFxuICAgICAgICAgIEdyb3VwTmFtZTogXCJBZG1pblwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHBvbGljeTogQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3kuZnJvbVN0YXRlbWVudHMoW1xuICAgICAgICBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIFwiY29nbml0by1pZHA6QWRtaW5BZGRVc2VyVG9Hcm91cFwiLFxuICAgICAgICAgICAgXCJjb2duaXRvLWlkcDpBZG1pblJlbW92ZVVzZXJGcm9tR3JvdXBcIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW3RoaXMudXNlclBvb2wudXNlclBvb2xBcm5dLFxuICAgICAgICB9KSxcbiAgICAgIF0pLFxuICAgIH0pO1xuICAgIGFkbWluR3JvdXBNZW1iZXJzaGlwLm5vZGUuYWRkRGVwZW5kZW5jeShhZG1pbkdyb3VwKTtcbiAgfVxufVxuXG5jbGFzcyBDcmVhdGVQb29sVXNlciBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSB1c2VybmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBjb25zdHJ1Y3RvcihcbiAgICBzY29wZTogQ29uc3RydWN0LFxuICAgIGlkOiBzdHJpbmcsXG4gICAgcHJvcHM6IHtcbiAgICAgIHVzZXJQb29sOiBhd3NfY29nbml0by5JVXNlclBvb2w7XG4gICAgICB1c2VybmFtZTogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICB9XG4gICkge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBzdGF0ZW1lbnQgPSBuZXcgYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1wiY29nbml0by1pZHA6QWRtaW5EZWxldGVVc2VyXCIsIFwiY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyXCJdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMudXNlclBvb2wudXNlclBvb2xBcm5dLFxuICAgIH0pO1xuXG4gICAgbmV3IEF3c0N1c3RvbVJlc291cmNlKHRoaXMsIGBDcmVhdGVVc2VyLSR7aWR9YCwge1xuICAgICAgb25DcmVhdGU6IHtcbiAgICAgICAgc2VydmljZTogXCJDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXJcIixcbiAgICAgICAgYWN0aW9uOiBcImFkbWluQ3JlYXRlVXNlclwiLFxuICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgVXNlclBvb2xJZDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgICBVc2VybmFtZTogcHJvcHMudXNlcm5hbWUsXG4gICAgICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogXCJlbWFpbFwiLFxuICAgICAgICAgICAgICBWYWx1ZTogcHJvcHMuZW1haWwsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiBcImVtYWlsX3ZlcmlmaWVkXCIsXG4gICAgICAgICAgICAgIFZhbHVlOiBcInRydWVcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcGh5c2ljYWxSZXNvdXJjZUlkOiBQaHlzaWNhbFJlc291cmNlSWQub2YoXG4gICAgICAgICAgYENyZWF0ZVVzZXItJHtpZH0tJHtwcm9wcy51c2VybmFtZX1gXG4gICAgICAgICksXG4gICAgICB9LFxuICAgICAgb25EZWxldGU6IHtcbiAgICAgICAgc2VydmljZTogXCJDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXJcIixcbiAgICAgICAgYWN0aW9uOiBcImFkbWluRGVsZXRlVXNlclwiLFxuICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgVXNlclBvb2xJZDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgICBVc2VybmFtZTogcHJvcHMudXNlcm5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgcG9saWN5OiBBd3NDdXN0b21SZXNvdXJjZVBvbGljeS5mcm9tU3RhdGVtZW50cyhbc3RhdGVtZW50XSksXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==