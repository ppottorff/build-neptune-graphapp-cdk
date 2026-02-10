"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryGetGraph = exports.queryGetRelationName = exports.queryGetProfile = exports.Icons = void 0;
exports.cn = cn;
const query_1 = require("@/api/appsync/query");
const api_1 = require("aws-amplify/api");
const clsx_1 = require("clsx");
const lucide_react_1 = require("lucide-react");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
exports.Icons = {
    spinner: lucide_react_1.Loader2,
};
const queryGetProfile = async (name, value) => {
    const client = (0, api_1.generateClient)();
    const res = (await client.graphql({
        query: query_1.getProfile,
        variables: {
            type: "profile",
            value,
            name,
        },
    }));
    return res;
};
exports.queryGetProfile = queryGetProfile;
const queryGetRelationName = async (name, value) => {
    const client = (0, api_1.generateClient)();
    const res = (await client.graphql({
        query: query_1.getRelationName,
        variables: {
            type: "relation",
            value,
            name: name,
        },
    }));
    return res;
};
exports.queryGetRelationName = queryGetRelationName;
const queryGetGraph = async (value) => {
    const client = (0, api_1.generateClient)();
    const res = (await client.graphql({
        query: query_1.getGraph,
        variables: {
            type: "graph",
            value,
        },
    }));
    return res;
};
exports.queryGetGraph = queryGetGraph;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFXQSxnQkFFQztBQWJELCtDQUE0RTtBQU01RSx5Q0FBZ0U7QUFDaEUsK0JBQTZDO0FBQzdDLCtDQUF1QztBQUN2QyxtREFBeUM7QUFFekMsU0FBZ0IsRUFBRSxDQUFDLEdBQUcsTUFBb0I7SUFDeEMsT0FBTyxJQUFBLHdCQUFPLEVBQUMsSUFBQSxXQUFJLEVBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRVksUUFBQSxLQUFLLEdBQUc7SUFDbkIsT0FBTyxFQUFFLHNCQUFPO0NBQ2pCLENBQUM7QUFFSyxNQUFNLGVBQWUsR0FBRyxLQUFLLEVBQUUsSUFBWSxFQUFFLEtBQWEsRUFBRSxFQUFFO0lBQ25FLE1BQU0sTUFBTSxHQUFHLElBQUEsb0JBQWMsR0FBRSxDQUFDO0lBQ2hDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ2hDLEtBQUssRUFBRSxrQkFBVTtRQUNqQixTQUFTLEVBQUU7WUFDVCxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUs7WUFDTCxJQUFJO1NBQ0w7S0FDRixDQUFDLENBQW1DLENBQUM7SUFDdEMsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDLENBQUM7QUFYVyxRQUFBLGVBQWUsbUJBVzFCO0FBRUssTUFBTSxvQkFBb0IsR0FBRyxLQUFLLEVBQUUsSUFBWSxFQUFFLEtBQWEsRUFBRSxFQUFFO0lBQ3hFLE1BQU0sTUFBTSxHQUFHLElBQUEsb0JBQWMsR0FBRSxDQUFDO0lBQ2hDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ2hDLEtBQUssRUFBRSx1QkFBZTtRQUN0QixTQUFTLEVBQUU7WUFDVCxJQUFJLEVBQUUsVUFBVTtZQUNoQixLQUFLO1lBQ0wsSUFBSSxFQUFFLElBQUk7U0FDWDtLQUNGLENBQUMsQ0FBd0MsQ0FBQztJQUMzQyxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMsQ0FBQztBQVhXLFFBQUEsb0JBQW9CLHdCQVcvQjtBQUVLLE1BQU0sYUFBYSxHQUFHLEtBQUssRUFBRSxLQUFhLEVBQUUsRUFBRTtJQUNuRCxNQUFNLE1BQU0sR0FBRyxJQUFBLG9CQUFjLEdBQUUsQ0FBQztJQUNoQyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUNoQyxLQUFLLEVBQUUsZ0JBQVE7UUFDZixTQUFTLEVBQUU7WUFDVCxJQUFJLEVBQUUsT0FBTztZQUNiLEtBQUs7U0FDTjtLQUNGLENBQUMsQ0FBaUMsQ0FBQztJQUNwQyxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMsQ0FBQztBQVZXLFFBQUEsYUFBYSxpQkFVeEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZXRHcmFwaCwgZ2V0UHJvZmlsZSwgZ2V0UmVsYXRpb25OYW1lIH0gZnJvbSBcIkAvYXBpL2FwcHN5bmMvcXVlcnlcIjtcbmltcG9ydCB7XG4gIEdldEdyYXBoUXVlcnksXG4gIEdldFJlbGF0aW9uTmFtZVF1ZXJ5LFxuICBHZXRQcm9maWxlUXVlcnksXG59IGZyb20gXCJAL3R5cGVzL3R5cGVzXCI7XG5pbXBvcnQgeyBHcmFwaFFMUmVzdWx0LCBnZW5lcmF0ZUNsaWVudCB9IGZyb20gXCJhd3MtYW1wbGlmeS9hcGlcIjtcbmltcG9ydCB7IHR5cGUgQ2xhc3NWYWx1ZSwgY2xzeCB9IGZyb20gXCJjbHN4XCI7XG5pbXBvcnQgeyBMb2FkZXIyIH0gZnJvbSBcImx1Y2lkZS1yZWFjdFwiO1xuaW1wb3J0IHsgdHdNZXJnZSB9IGZyb20gXCJ0YWlsd2luZC1tZXJnZVwiO1xuXG5leHBvcnQgZnVuY3Rpb24gY24oLi4uaW5wdXRzOiBDbGFzc1ZhbHVlW10pIHtcbiAgcmV0dXJuIHR3TWVyZ2UoY2xzeChpbnB1dHMpKTtcbn1cblxuZXhwb3J0IGNvbnN0IEljb25zID0ge1xuICBzcGlubmVyOiBMb2FkZXIyLFxufTtcblxuZXhwb3J0IGNvbnN0IHF1ZXJ5R2V0UHJvZmlsZSA9IGFzeW5jIChuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgY2xpZW50ID0gZ2VuZXJhdGVDbGllbnQoKTtcbiAgY29uc3QgcmVzID0gKGF3YWl0IGNsaWVudC5ncmFwaHFsKHtcbiAgICBxdWVyeTogZ2V0UHJvZmlsZSxcbiAgICB2YXJpYWJsZXM6IHtcbiAgICAgIHR5cGU6IFwicHJvZmlsZVwiLFxuICAgICAgdmFsdWUsXG4gICAgICBuYW1lLFxuICAgIH0sXG4gIH0pKSBhcyBHcmFwaFFMUmVzdWx0PEdldFByb2ZpbGVRdWVyeT47XG4gIHJldHVybiByZXM7XG59O1xuXG5leHBvcnQgY29uc3QgcXVlcnlHZXRSZWxhdGlvbk5hbWUgPSBhc3luYyAobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGNsaWVudCA9IGdlbmVyYXRlQ2xpZW50KCk7XG4gIGNvbnN0IHJlcyA9IChhd2FpdCBjbGllbnQuZ3JhcGhxbCh7XG4gICAgcXVlcnk6IGdldFJlbGF0aW9uTmFtZSxcbiAgICB2YXJpYWJsZXM6IHtcbiAgICAgIHR5cGU6IFwicmVsYXRpb25cIixcbiAgICAgIHZhbHVlLFxuICAgICAgbmFtZTogbmFtZSxcbiAgICB9LFxuICB9KSkgYXMgR3JhcGhRTFJlc3VsdDxHZXRSZWxhdGlvbk5hbWVRdWVyeT47XG4gIHJldHVybiByZXM7XG59O1xuXG5leHBvcnQgY29uc3QgcXVlcnlHZXRHcmFwaCA9IGFzeW5jICh2YWx1ZTogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGNsaWVudCA9IGdlbmVyYXRlQ2xpZW50KCk7XG4gIGNvbnN0IHJlcyA9IChhd2FpdCBjbGllbnQuZ3JhcGhxbCh7XG4gICAgcXVlcnk6IGdldEdyYXBoLFxuICAgIHZhcmlhYmxlczoge1xuICAgICAgdHlwZTogXCJncmFwaFwiLFxuICAgICAgdmFsdWUsXG4gICAgfSxcbiAgfSkpIGFzIEdyYXBoUUxSZXN1bHQ8R2V0R3JhcGhRdWVyeT47XG4gIHJldHVybiByZXM7XG59O1xuIl19