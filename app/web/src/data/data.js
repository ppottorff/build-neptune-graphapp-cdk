"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profiles = exports.selectVertexItem = exports.selectEdgeItem = exports.radioGroupValue = void 0;
exports.radioGroupValue = [
    {
        value: "person",
        label: "Search for 'Acadmic member' of Affiliated academic society from 'Person Name'",
        description: "'Person' -> Affiliated academic society -> 'Acadmic member'",
    },
    {
        value: "product",
        label: "Search for 'Co Author' of Paper from the User of 'Product Name'",
        description: "'Product' -> Person -> -> Paper -> 'Co Author'",
    },
    {
        value: "conference",
        label: "Search for 'Acquaintance' of Acadmic member from 'Affiliated academic society'",
        description: "'Affiliated academic society' -> Academic member -> 'Acquaintance'",
    },
];
exports.selectEdgeItem = [
    {
        value: "affiliated_with",
        description: "Institution",
        source: "Person",
        sourceLabel: "person",
        destination: "Institution",
        destLabel: "institution",
    },
    {
        value: "authored_by",
        description: "Paper",
        source: "Paper",
        sourceLabel: "paper",
        destination: "Person",
        destLabel: "person",
    },
    {
        value: "belong_to",
        description: "Affiliated academic society",
        source: "Person",
        sourceLabel: "person",
        destination: "Academic society",
        destLabel: "conference",
    },
    {
        value: "usage",
        description: "Products to use",
        source: "Person",
        sourceLabel: "person",
        destination: "Product",
        destLabel: "product",
    },
    {
        value: "knows",
        description: "Know",
        source: "Person",
        sourceLabel: "person",
        destination: "Person",
        destLabel: "person",
    },
    {
        value: "made_by",
        description: "Seller",
        source: "Pharmaceutical company",
        sourceLabel: "institution",
        destination: "Product",
        destLabel: "product",
    },
];
exports.selectVertexItem = [
    {
        value: "person",
        description: "Person",
        input: "speciality",
    },
    {
        value: "paper",
        description: "Paper",
        input: "publich date",
    },
    {
        value: "product",
        description: "Product",
    },
    {
        value: "conference",
        description: "Affiliated academic society",
    },
    {
        value: "institution",
        description: "Institution",
    },
];
exports.Profiles = [
    {
        value: "search_name",
        description: "Search word",
    },
    {
        value: "affiliated_with",
        description: "Institution",
    },
    {
        value: "usage",
        description: "Use",
    },
    {
        value: "belong_to",
        description: "Affiliated academic society",
    },
    {
        value: "authored_by",
        description: "Paper",
    },
    {
        value: "people",
        description: "Academic member",
    },
    {
        value: "made_by",
        description: "Pharmaceutical company",
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSxlQUFlLEdBQUc7SUFDN0I7UUFDRSxLQUFLLEVBQUUsUUFBUTtRQUNmLEtBQUssRUFDSCwrRUFBK0U7UUFDakYsV0FBVyxFQUFFLDZEQUE2RDtLQUMzRTtJQUNEO1FBQ0UsS0FBSyxFQUFFLFNBQVM7UUFDaEIsS0FBSyxFQUFFLGlFQUFpRTtRQUN4RSxXQUFXLEVBQUUsZ0RBQWdEO0tBQzlEO0lBQ0Q7UUFDRSxLQUFLLEVBQUUsWUFBWTtRQUNuQixLQUFLLEVBQ0gsZ0ZBQWdGO1FBQ2xGLFdBQVcsRUFDVCxvRUFBb0U7S0FDdkU7Q0FDRixDQUFDO0FBRVcsUUFBQSxjQUFjLEdBQUc7SUFDNUI7UUFDRSxLQUFLLEVBQUUsaUJBQWlCO1FBQ3hCLFdBQVcsRUFBRSxhQUFhO1FBQzFCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLFdBQVcsRUFBRSxRQUFRO1FBQ3JCLFdBQVcsRUFBRSxhQUFhO1FBQzFCLFNBQVMsRUFBRSxhQUFhO0tBQ3pCO0lBQ0Q7UUFDRSxLQUFLLEVBQUUsYUFBYTtRQUNwQixXQUFXLEVBQUUsT0FBTztRQUNwQixNQUFNLEVBQUUsT0FBTztRQUNmLFdBQVcsRUFBRSxPQUFPO1FBQ3BCLFdBQVcsRUFBRSxRQUFRO1FBQ3JCLFNBQVMsRUFBRSxRQUFRO0tBQ3BCO0lBQ0Q7UUFDRSxLQUFLLEVBQUUsV0FBVztRQUNsQixXQUFXLEVBQUUsNkJBQTZCO1FBQzFDLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLFdBQVcsRUFBRSxRQUFRO1FBQ3JCLFdBQVcsRUFBRSxrQkFBa0I7UUFDL0IsU0FBUyxFQUFFLFlBQVk7S0FDeEI7SUFDRDtRQUNFLEtBQUssRUFBRSxPQUFPO1FBQ2QsV0FBVyxFQUFFLGlCQUFpQjtRQUM5QixNQUFNLEVBQUUsUUFBUTtRQUNoQixXQUFXLEVBQUUsUUFBUTtRQUNyQixXQUFXLEVBQUUsU0FBUztRQUN0QixTQUFTLEVBQUUsU0FBUztLQUNyQjtJQUNEO1FBQ0UsS0FBSyxFQUFFLE9BQU87UUFDZCxXQUFXLEVBQUUsTUFBTTtRQUNuQixNQUFNLEVBQUUsUUFBUTtRQUNoQixXQUFXLEVBQUUsUUFBUTtRQUNyQixXQUFXLEVBQUUsUUFBUTtRQUNyQixTQUFTLEVBQUUsUUFBUTtLQUNwQjtJQUNEO1FBQ0UsS0FBSyxFQUFFLFNBQVM7UUFDaEIsV0FBVyxFQUFFLFFBQVE7UUFDckIsTUFBTSxFQUFFLHdCQUF3QjtRQUNoQyxXQUFXLEVBQUUsYUFBYTtRQUMxQixXQUFXLEVBQUUsU0FBUztRQUN0QixTQUFTLEVBQUUsU0FBUztLQUNyQjtDQUNGLENBQUM7QUFFVyxRQUFBLGdCQUFnQixHQUFHO0lBQzlCO1FBQ0UsS0FBSyxFQUFFLFFBQVE7UUFDZixXQUFXLEVBQUUsUUFBUTtRQUNyQixLQUFLLEVBQUUsWUFBWTtLQUNwQjtJQUNEO1FBQ0UsS0FBSyxFQUFFLE9BQU87UUFDZCxXQUFXLEVBQUUsT0FBTztRQUNwQixLQUFLLEVBQUUsY0FBYztLQUN0QjtJQUNEO1FBQ0UsS0FBSyxFQUFFLFNBQVM7UUFDaEIsV0FBVyxFQUFFLFNBQVM7S0FDdkI7SUFDRDtRQUNFLEtBQUssRUFBRSxZQUFZO1FBQ25CLFdBQVcsRUFBRSw2QkFBNkI7S0FDM0M7SUFDRDtRQUNFLEtBQUssRUFBRSxhQUFhO1FBQ3BCLFdBQVcsRUFBRSxhQUFhO0tBQzNCO0NBQ0YsQ0FBQztBQUVXLFFBQUEsUUFBUSxHQUFHO0lBQ3RCO1FBQ0UsS0FBSyxFQUFFLGFBQWE7UUFDcEIsV0FBVyxFQUFFLGFBQWE7S0FDM0I7SUFDRDtRQUNFLEtBQUssRUFBRSxpQkFBaUI7UUFDeEIsV0FBVyxFQUFFLGFBQWE7S0FDM0I7SUFDRDtRQUNFLEtBQUssRUFBRSxPQUFPO1FBQ2QsV0FBVyxFQUFFLEtBQUs7S0FDbkI7SUFDRDtRQUNFLEtBQUssRUFBRSxXQUFXO1FBQ2xCLFdBQVcsRUFBRSw2QkFBNkI7S0FDM0M7SUFDRDtRQUNFLEtBQUssRUFBRSxhQUFhO1FBQ3BCLFdBQVcsRUFBRSxPQUFPO0tBQ3JCO0lBQ0Q7UUFDRSxLQUFLLEVBQUUsUUFBUTtRQUNmLFdBQVcsRUFBRSxpQkFBaUI7S0FDL0I7SUFDRDtRQUNFLEtBQUssRUFBRSxTQUFTO1FBQ2hCLFdBQVcsRUFBRSx3QkFBd0I7S0FDdEM7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IHJhZGlvR3JvdXBWYWx1ZSA9IFtcbiAge1xuICAgIHZhbHVlOiBcInBlcnNvblwiLFxuICAgIGxhYmVsOlxuICAgICAgXCJTZWFyY2ggZm9yICdBY2FkbWljIG1lbWJlcicgb2YgQWZmaWxpYXRlZCBhY2FkZW1pYyBzb2NpZXR5IGZyb20gJ1BlcnNvbiBOYW1lJ1wiLFxuICAgIGRlc2NyaXB0aW9uOiBcIidQZXJzb24nIC0+IEFmZmlsaWF0ZWQgYWNhZGVtaWMgc29jaWV0eSAtPiAnQWNhZG1pYyBtZW1iZXInXCIsXG4gIH0sXG4gIHtcbiAgICB2YWx1ZTogXCJwcm9kdWN0XCIsXG4gICAgbGFiZWw6IFwiU2VhcmNoIGZvciAnQ28gQXV0aG9yJyBvZiBQYXBlciBmcm9tIHRoZSBVc2VyIG9mICdQcm9kdWN0IE5hbWUnXCIsXG4gICAgZGVzY3JpcHRpb246IFwiJ1Byb2R1Y3QnIC0+IFBlcnNvbiAtPiAtPiBQYXBlciAtPiAnQ28gQXV0aG9yJ1wiLFxuICB9LFxuICB7XG4gICAgdmFsdWU6IFwiY29uZmVyZW5jZVwiLFxuICAgIGxhYmVsOlxuICAgICAgXCJTZWFyY2ggZm9yICdBY3F1YWludGFuY2UnIG9mIEFjYWRtaWMgbWVtYmVyIGZyb20gJ0FmZmlsaWF0ZWQgYWNhZGVtaWMgc29jaWV0eSdcIixcbiAgICBkZXNjcmlwdGlvbjpcbiAgICAgIFwiJ0FmZmlsaWF0ZWQgYWNhZGVtaWMgc29jaWV0eScgLT4gQWNhZGVtaWMgbWVtYmVyIC0+ICdBY3F1YWludGFuY2UnXCIsXG4gIH0sXG5dO1xuXG5leHBvcnQgY29uc3Qgc2VsZWN0RWRnZUl0ZW0gPSBbXG4gIHtcbiAgICB2YWx1ZTogXCJhZmZpbGlhdGVkX3dpdGhcIixcbiAgICBkZXNjcmlwdGlvbjogXCJJbnN0aXR1dGlvblwiLFxuICAgIHNvdXJjZTogXCJQZXJzb25cIixcbiAgICBzb3VyY2VMYWJlbDogXCJwZXJzb25cIixcbiAgICBkZXN0aW5hdGlvbjogXCJJbnN0aXR1dGlvblwiLFxuICAgIGRlc3RMYWJlbDogXCJpbnN0aXR1dGlvblwiLFxuICB9LFxuICB7XG4gICAgdmFsdWU6IFwiYXV0aG9yZWRfYnlcIixcbiAgICBkZXNjcmlwdGlvbjogXCJQYXBlclwiLFxuICAgIHNvdXJjZTogXCJQYXBlclwiLFxuICAgIHNvdXJjZUxhYmVsOiBcInBhcGVyXCIsXG4gICAgZGVzdGluYXRpb246IFwiUGVyc29uXCIsXG4gICAgZGVzdExhYmVsOiBcInBlcnNvblwiLFxuICB9LFxuICB7XG4gICAgdmFsdWU6IFwiYmVsb25nX3RvXCIsXG4gICAgZGVzY3JpcHRpb246IFwiQWZmaWxpYXRlZCBhY2FkZW1pYyBzb2NpZXR5XCIsXG4gICAgc291cmNlOiBcIlBlcnNvblwiLFxuICAgIHNvdXJjZUxhYmVsOiBcInBlcnNvblwiLFxuICAgIGRlc3RpbmF0aW9uOiBcIkFjYWRlbWljIHNvY2lldHlcIixcbiAgICBkZXN0TGFiZWw6IFwiY29uZmVyZW5jZVwiLFxuICB9LFxuICB7XG4gICAgdmFsdWU6IFwidXNhZ2VcIixcbiAgICBkZXNjcmlwdGlvbjogXCJQcm9kdWN0cyB0byB1c2VcIixcbiAgICBzb3VyY2U6IFwiUGVyc29uXCIsXG4gICAgc291cmNlTGFiZWw6IFwicGVyc29uXCIsXG4gICAgZGVzdGluYXRpb246IFwiUHJvZHVjdFwiLFxuICAgIGRlc3RMYWJlbDogXCJwcm9kdWN0XCIsXG4gIH0sXG4gIHtcbiAgICB2YWx1ZTogXCJrbm93c1wiLFxuICAgIGRlc2NyaXB0aW9uOiBcIktub3dcIixcbiAgICBzb3VyY2U6IFwiUGVyc29uXCIsXG4gICAgc291cmNlTGFiZWw6IFwicGVyc29uXCIsXG4gICAgZGVzdGluYXRpb246IFwiUGVyc29uXCIsXG4gICAgZGVzdExhYmVsOiBcInBlcnNvblwiLFxuICB9LFxuICB7XG4gICAgdmFsdWU6IFwibWFkZV9ieVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlNlbGxlclwiLFxuICAgIHNvdXJjZTogXCJQaGFybWFjZXV0aWNhbCBjb21wYW55XCIsXG4gICAgc291cmNlTGFiZWw6IFwiaW5zdGl0dXRpb25cIixcbiAgICBkZXN0aW5hdGlvbjogXCJQcm9kdWN0XCIsXG4gICAgZGVzdExhYmVsOiBcInByb2R1Y3RcIixcbiAgfSxcbl07XG5cbmV4cG9ydCBjb25zdCBzZWxlY3RWZXJ0ZXhJdGVtID0gW1xuICB7XG4gICAgdmFsdWU6IFwicGVyc29uXCIsXG4gICAgZGVzY3JpcHRpb246IFwiUGVyc29uXCIsXG4gICAgaW5wdXQ6IFwic3BlY2lhbGl0eVwiLFxuICB9LFxuICB7XG4gICAgdmFsdWU6IFwicGFwZXJcIixcbiAgICBkZXNjcmlwdGlvbjogXCJQYXBlclwiLFxuICAgIGlucHV0OiBcInB1YmxpY2ggZGF0ZVwiLFxuICB9LFxuICB7XG4gICAgdmFsdWU6IFwicHJvZHVjdFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlByb2R1Y3RcIixcbiAgfSxcbiAge1xuICAgIHZhbHVlOiBcImNvbmZlcmVuY2VcIixcbiAgICBkZXNjcmlwdGlvbjogXCJBZmZpbGlhdGVkIGFjYWRlbWljIHNvY2lldHlcIixcbiAgfSxcbiAge1xuICAgIHZhbHVlOiBcImluc3RpdHV0aW9uXCIsXG4gICAgZGVzY3JpcHRpb246IFwiSW5zdGl0dXRpb25cIixcbiAgfSxcbl07XG5cbmV4cG9ydCBjb25zdCBQcm9maWxlcyA9IFtcbiAge1xuICAgIHZhbHVlOiBcInNlYXJjaF9uYW1lXCIsXG4gICAgZGVzY3JpcHRpb246IFwiU2VhcmNoIHdvcmRcIixcbiAgfSxcbiAge1xuICAgIHZhbHVlOiBcImFmZmlsaWF0ZWRfd2l0aFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkluc3RpdHV0aW9uXCIsXG4gIH0sXG4gIHtcbiAgICB2YWx1ZTogXCJ1c2FnZVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlVzZVwiLFxuICB9LFxuICB7XG4gICAgdmFsdWU6IFwiYmVsb25nX3RvXCIsXG4gICAgZGVzY3JpcHRpb246IFwiQWZmaWxpYXRlZCBhY2FkZW1pYyBzb2NpZXR5XCIsXG4gIH0sXG4gIHtcbiAgICB2YWx1ZTogXCJhdXRob3JlZF9ieVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlBhcGVyXCIsXG4gIH0sXG4gIHtcbiAgICB2YWx1ZTogXCJwZW9wbGVcIixcbiAgICBkZXNjcmlwdGlvbjogXCJBY2FkZW1pYyBtZW1iZXJcIixcbiAgfSxcbiAge1xuICAgIHZhbHVlOiBcIm1hZGVfYnlcIixcbiAgICBkZXNjcmlwdGlvbjogXCJQaGFybWFjZXV0aWNhbCBjb21wYW55XCIsXG4gIH0sXG5dO1xuIl19