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
        edge: "s3://bulkloaddata12/edge.csv",
        vertex: "s3://bulkloaddata12/vertex.csv",
    },
};
const deployConfig = { ...baseConfig, stage };
exports.deployConfig = deployConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUE0QztBQUU1QyxpQkFBaUI7QUFDakIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLE1BQU0sVUFBVSxHQUFHO0lBQ2pCLE9BQU8sRUFBRSxVQUFVO0lBQ25CLE1BQU0sRUFBRSxXQUFXO0lBQ25CLFVBQVUsRUFBRSxzQkFBc0I7SUFDbEMsVUFBVSxFQUFFLEVBQUU7SUFDZCxZQUFZLEVBQUUscUJBQXFCO0lBQ25DLHVCQUF1QixFQUFFLDJCQUFhLENBQUMsT0FBTztJQUM5QyxLQUFLLEVBQUU7UUFDTCxJQUFJLEVBQUUsOEJBQThCO1FBQ3BDLE1BQU0sRUFBRSxnQ0FBZ0M7S0FDekM7Q0FDRixDQUFDO0FBRUYsTUFBTSxZQUFZLEdBQUcsRUFBRSxHQUFHLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUVyQyxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcblxuLyogQmFzZSBjb25maWcgKi9cbmNvbnN0IHN0YWdlID0gXCJkZXZcIjtcbmNvbnN0IGJhc2VDb25maWcgPSB7XG4gIGFwcE5hbWU6IFwiZ3JhcGhBcHBcIixcbiAgcmVnaW9uOiBcInVzLWVhc3QtMVwiLFxuICBhZG1pbkVtYWlsOiBcInBhdWxAc21hcnRlcnByZXkuY29tXCIsXG4gIGFsbG93ZWRJcHM6IFtdLFxuICB3YWZQYXJhbU5hbWU6IFwiZ3JhcGhBcHBXYWZXZWJBQ0xJRFwiLFxuICB3ZWJCdWNrZXRzUmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICBzM1VyaToge1xuICAgIGVkZ2U6IFwiczM6Ly9idWxrbG9hZGRhdGExMi9lZGdlLmNzdlwiLFxuICAgIHZlcnRleDogXCJzMzovL2J1bGtsb2FkZGF0YTEyL3ZlcnRleC5jc3ZcIixcbiAgfSxcbn07XG5cbmNvbnN0IGRlcGxveUNvbmZpZyA9IHsgLi4uYmFzZUNvbmZpZywgc3RhZ2UgfTtcblxuZXhwb3J0IHsgZGVwbG95Q29uZmlnIH07XG4iXX0=