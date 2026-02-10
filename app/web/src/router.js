"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
// Set up a Router instance
const react_router_1 = require("@tanstack/react-router");
const routeTree_gen_js_1 = require("./routeTree.gen.js");
``;
exports.router = (0, react_router_1.createRouter)({
    routeTree: routeTree_gen_js_1.routeTree,
    context: {
        // @ts-ignore
        auth: undefined,
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicm91dGVyLnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQkFBMkI7QUFDM0IseURBQXNEO0FBQ3RELHlEQUErQztBQUMvQyxFQUFFLENBQUM7QUFDVSxRQUFBLE1BQU0sR0FBRyxJQUFBLDJCQUFZLEVBQUM7SUFDakMsU0FBUyxFQUFULDRCQUFTO0lBQ1QsT0FBTyxFQUFFO1FBQ1AsYUFBYTtRQUNiLElBQUksRUFBRSxTQUFTO0tBQ2hCO0NBQ0YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gU2V0IHVwIGEgUm91dGVyIGluc3RhbmNlXG5pbXBvcnQgeyBjcmVhdGVSb3V0ZXIgfSBmcm9tIFwiQHRhbnN0YWNrL3JlYWN0LXJvdXRlclwiO1xuaW1wb3J0IHsgcm91dGVUcmVlIH0gZnJvbSBcIi4vcm91dGVUcmVlLmdlbi5qc1wiO1xuYGA7XG5leHBvcnQgY29uc3Qgcm91dGVyID0gY3JlYXRlUm91dGVyKHtcbiAgcm91dGVUcmVlLFxuICBjb250ZXh0OiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGF1dGg6IHVuZGVmaW5lZCxcbiAgfSxcbn0pO1xuIl19