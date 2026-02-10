"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
const RootLayout_1 = require("@/components/RootLayout");
const react_router_1 = require("@tanstack/react-router");
exports.Route = (0, react_router_1.createFileRoute)("/_authenticated/_layout")({
    component: LayoutComponent,
});
function LayoutComponent() {
    return (<>
      <RootLayout_1.MainLayout>
        <react_router_1.Outlet />
      </RootLayout_1.MainLayout>
    </>);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX2xheW91dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIl9sYXlvdXQudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdEQUFxRDtBQUNyRCx5REFBaUU7QUFFcEQsUUFBQSxLQUFLLEdBQUcsSUFBQSw4QkFBZSxFQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDOUQsU0FBUyxFQUFFLGVBQWU7Q0FDM0IsQ0FBQyxDQUFDO0FBRUgsU0FBUyxlQUFlO0lBQ3RCLE9BQU8sQ0FDTCxFQUNFO01BQUEsQ0FBQyx1QkFBVSxDQUNUO1FBQUEsQ0FBQyxxQkFBTSxDQUFDLEFBQUQsRUFDVDtNQUFBLEVBQUUsdUJBQVUsQ0FDZDtJQUFBLEdBQUcsQ0FDSixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1haW5MYXlvdXQgfSBmcm9tIFwiQC9jb21wb25lbnRzL1Jvb3RMYXlvdXRcIjtcbmltcG9ydCB7IE91dGxldCwgY3JlYXRlRmlsZVJvdXRlIH0gZnJvbSBcIkB0YW5zdGFjay9yZWFjdC1yb3V0ZXJcIjtcblxuZXhwb3J0IGNvbnN0IFJvdXRlID0gY3JlYXRlRmlsZVJvdXRlKFwiL19hdXRoZW50aWNhdGVkL19sYXlvdXRcIikoe1xuICBjb21wb25lbnQ6IExheW91dENvbXBvbmVudCxcbn0pO1xuXG5mdW5jdGlvbiBMYXlvdXRDb21wb25lbnQoKSB7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxNYWluTGF5b3V0PlxuICAgICAgICA8T3V0bGV0IC8+XG4gICAgICA8L01haW5MYXlvdXQ+XG4gICAgPC8+XG4gICk7XG59XG4iXX0=