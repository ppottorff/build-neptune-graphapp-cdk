"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
const react_router_1 = require("@tanstack/react-router");
// src/routes/_authenticated.tsx
exports.Route = (0, react_router_1.createFileRoute)("/_authenticated")({
    beforeLoad: async ({ context }) => {
        if (!context.auth.isAuth) {
            throw (0, react_router_1.redirect)({
                // @ts-ignore
                to: "/signin",
                throw: true,
                // search: {
                //   redirect: location.href,
                // },
            });
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX2F1dGhlbnRpY2F0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJfYXV0aGVudGljYXRlZC50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEseURBQW1FO0FBRW5FLGdDQUFnQztBQUNuQixRQUFBLEtBQUssR0FBRyxJQUFBLDhCQUFlLEVBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUN0RCxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtRQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6QixNQUFNLElBQUEsdUJBQVEsRUFBQztnQkFDYixhQUFhO2dCQUNiLEVBQUUsRUFBRSxTQUFTO2dCQUNiLEtBQUssRUFBRSxJQUFJO2dCQUNYLFlBQVk7Z0JBQ1osNkJBQTZCO2dCQUM3QixLQUFLO2FBQ04sQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVGaWxlUm91dGUsIHJlZGlyZWN0IH0gZnJvbSBcIkB0YW5zdGFjay9yZWFjdC1yb3V0ZXJcIjtcblxuLy8gc3JjL3JvdXRlcy9fYXV0aGVudGljYXRlZC50c3hcbmV4cG9ydCBjb25zdCBSb3V0ZSA9IGNyZWF0ZUZpbGVSb3V0ZShcIi9fYXV0aGVudGljYXRlZFwiKSh7XG4gIGJlZm9yZUxvYWQ6IGFzeW5jICh7IGNvbnRleHQgfSkgPT4ge1xuICAgIGlmICghY29udGV4dC5hdXRoLmlzQXV0aCkge1xuICAgICAgdGhyb3cgcmVkaXJlY3Qoe1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHRvOiBcIi9zaWduaW5cIixcbiAgICAgICAgdGhyb3c6IHRydWUsXG4gICAgICAgIC8vIHNlYXJjaDoge1xuICAgICAgICAvLyAgIHJlZGlyZWN0OiBsb2NhdGlvbi5ocmVmLFxuICAgICAgICAvLyB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9LFxufSk7XG4iXX0=