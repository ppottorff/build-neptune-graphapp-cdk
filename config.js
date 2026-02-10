"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployConfig = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
/* Base config */
const stage = "dev";
const baseConfig = {
    appName: "graphApp",
    region: "us-east-1",
    adminEmail: "paul@smarterprey.com",
    allowedIps: [],
    wafParamName: "graphAppWafWebACLID",
    webBucketsRemovalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
    s3Uri: {
        edge: "EDGE_S3_URI",
        vertex: "VERTEX_S3_URI",
    },
};
const deployConfig = { ...baseConfig, stage };
exports.deployConfig = deployConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUE0QztBQUU1QyxpQkFBaUI7QUFDakIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLE1BQU0sVUFBVSxHQUFHO0lBQ2pCLE9BQU8sRUFBRSxVQUFVO0lBQ25CLE1BQU0sRUFBRSxXQUFXO0lBQ25CLFVBQVUsRUFBRSxzQkFBc0I7SUFDbEMsVUFBVSxFQUFFLEVBQUU7SUFDZCxZQUFZLEVBQUUscUJBQXFCO0lBQ25DLHVCQUF1QixFQUFFLDJCQUFhLENBQUMsT0FBTztJQUM5QyxLQUFLLEVBQUU7UUFDTCxJQUFJLEVBQUUsYUFBYTtRQUNuQixNQUFNLEVBQUUsZUFBZTtLQUN4QjtDQUNGLENBQUM7QUFFRixNQUFNLFlBQVksR0FBRyxFQUFFLEdBQUcsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDO0FBRXJDLG9DQUFZIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUmVtb3ZhbFBvbGljeSB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuXG4vKiBCYXNlIGNvbmZpZyAqL1xuY29uc3Qgc3RhZ2UgPSBcImRldlwiO1xuY29uc3QgYmFzZUNvbmZpZyA9IHtcbiAgYXBwTmFtZTogXCJncmFwaEFwcFwiLFxuICByZWdpb246IFwidXMtZWFzdC0xXCIsXG4gIGFkbWluRW1haWw6IFwicGF1bEBzbWFydGVycHJleS5jb21cIixcbiAgYWxsb3dlZElwczogW10sXG4gIHdhZlBhcmFtTmFtZTogXCJncmFwaEFwcFdhZldlYkFDTElEXCIsXG4gIHdlYkJ1Y2tldHNSZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gIHMzVXJpOiB7XG4gICAgZWRnZTogXCJFREdFX1MzX1VSSVwiLFxuICAgIHZlcnRleDogXCJWRVJURVhfUzNfVVJJXCIsXG4gIH0sXG59O1xuXG5jb25zdCBkZXBsb3lDb25maWcgPSB7IC4uLmJhc2VDb25maWcsIHN0YWdlIH07XG5cbmV4cG9ydCB7IGRlcGxveUNvbmZpZyB9O1xuIl19