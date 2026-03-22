"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployConfig = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
/* Base config */
const stage = "dev";
const baseConfig = {
    appName: "graphApp",
    region: "us-east-1",
    adminEmail: "your_email@acme.com",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnNhbXBsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbmZpZy5zYW1wbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQTRDO0FBRTVDLGlCQUFpQjtBQUNqQixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDcEIsTUFBTSxVQUFVLEdBQUc7SUFDakIsT0FBTyxFQUFFLFVBQVU7SUFDbkIsTUFBTSxFQUFFLFdBQVc7SUFDbkIsVUFBVSxFQUFFLHFCQUFxQjtJQUNqQyxVQUFVLEVBQUUsRUFBRTtJQUNkLFlBQVksRUFBRSxxQkFBcUI7SUFDbkMsdUJBQXVCLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO0lBQzlDLEtBQUssRUFBRTtRQUNMLElBQUksRUFBRSxhQUFhO1FBQ25CLE1BQU0sRUFBRSxlQUFlO0tBQ3hCO0NBQ0YsQ0FBQztBQUVGLE1BQU0sWUFBWSxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUM7QUFFckMsb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5cbi8qIEJhc2UgY29uZmlnICovXG5jb25zdCBzdGFnZSA9IFwiZGV2XCI7XG5jb25zdCBiYXNlQ29uZmlnID0ge1xuICBhcHBOYW1lOiBcImdyYXBoQXBwXCIsXG4gIHJlZ2lvbjogXCJ1cy1lYXN0LTFcIixcbiAgYWRtaW5FbWFpbDogXCJ5b3VyX2VtYWlsQGFjbWUuY29tXCIsXG4gIGFsbG93ZWRJcHM6IFtdLFxuICB3YWZQYXJhbU5hbWU6IFwiZ3JhcGhBcHBXYWZXZWJBQ0xJRFwiLFxuICB3ZWJCdWNrZXRzUmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICBzM1VyaToge1xuICAgIGVkZ2U6IFwiRURHRV9TM19VUklcIixcbiAgICB2ZXJ0ZXg6IFwiVkVSVEVYX1MzX1VSSVwiLFxuICB9LFxufTtcblxuY29uc3QgZGVwbG95Q29uZmlnID0geyAuLi5iYXNlQ29uZmlnLCBzdGFnZSB9O1xuXG5leHBvcnQgeyBkZXBsb3lDb25maWcgfTtcbiJdfQ==