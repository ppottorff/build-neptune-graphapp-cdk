"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainLayout = void 0;
const react_router_1 = require("@tanstack/react-router");
const lucide_react_1 = require("lucide-react");
const tooltip_1 = require("@/components/ui/tooltip");
const react_tooltip_1 = require("@radix-ui/react-tooltip");
const auth_1 = require("aws-amplify/auth");
const MainLayout = ({ children }) => {
    const navigate = (0, react_router_1.useNavigate)();
    const submitSignOut = async () => {
        try {
            await (0, auth_1.signOut)();
            // @ts-ignore
            navigate({ to: "/signin" });
        }
        catch (error) {
            console.log(error);
        }
    };
    return (<div className="flex min-h-screen w-full flex-col ">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-4">
          <react_tooltip_1.TooltipProvider>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <react_router_1.Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                  <lucide_react_1.Home className="h-5 w-5"/>
                  <span className="sr-only">Dashboard</span>
                </react_router_1.Link>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">Dashboard</tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
          </react_tooltip_1.TooltipProvider>
          <react_tooltip_1.TooltipProvider>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <react_router_1.Link href="https://us-east-1.console.aws.amazon.com/neptune/home?region=us-east-1" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                  <lucide_react_1.Database className="h-5 w-5"/>
                  <span className="sr-only">Amazon Neptune</span>
                </react_router_1.Link>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">Amazon Neptune</tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
          </react_tooltip_1.TooltipProvider>
          <react_tooltip_1.TooltipProvider>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <react_router_1.Link href="#" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                  <lucide_react_1.BrainCircuit className="h-5 w-5"/>
                  <span className="sr-only">Amazon SageMaker</span>
                </react_router_1.Link>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">Amazon SageMaker</tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
          </react_tooltip_1.TooltipProvider>
          <react_tooltip_1.TooltipProvider>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <react_router_1.Link to="/register" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                  <lucide_react_1.CopyPlus className="h-5 w-5"/>
                  <span className="sr-only">Add Vertex/Edge</span>
                </react_router_1.Link>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">Add Vertex/Edge</tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
          </react_tooltip_1.TooltipProvider>
          <react_tooltip_1.TooltipProvider>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <react_router_1.Link to="/graph" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                  <lucide_react_1.ScatterChart className="h-5 w-5"/>
                  <span className="sr-only">Graph Visualization</span>
                </react_router_1.Link>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">Graph Visualization</tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
          </react_tooltip_1.TooltipProvider>
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-4">
          <react_tooltip_1.TooltipProvider>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <react_router_1.Link onClick={() => submitSignOut()} href="/signin" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                  <lucide_react_1.LogOut className="h-5 w-5"/>
                  <span className="sr-only">Signout</span>
                </react_router_1.Link>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">Signout</tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <react_router_1.Link href="#" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                  <lucide_react_1.Settings className="h-5 w-5"/>
                  <span className="sr-only">Settings</span>
                </react_router_1.Link>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">Settings</tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
          </react_tooltip_1.TooltipProvider>
        </nav>
      </aside>
      <main className="grid flex-1 pl-12 items-start">{children}</main>
    </div>);
};
exports.MainLayout = MainLayout;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUm9vdExheW91dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlJvb3RMYXlvdXQudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHlEQUEyRDtBQUMzRCwrQ0FRc0I7QUFFdEIscURBSWlDO0FBQ2pDLDJEQUEwRDtBQUMxRCwyQ0FBMkM7QUFDcEMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBMkIsRUFBRSxFQUFFO0lBQ2xFLE1BQU0sUUFBUSxHQUFHLElBQUEsMEJBQVcsR0FBRSxDQUFDO0lBQy9CLE1BQU0sYUFBYSxHQUFHLEtBQUssSUFBSSxFQUFFO1FBQy9CLElBQUksQ0FBQztZQUNILE1BQU0sSUFBQSxjQUFPLEdBQUUsQ0FBQztZQUNoQixhQUFhO1lBQ2IsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JCLENBQUM7SUFDSCxDQUFDLENBQUM7SUFDRixPQUFPLENBQ0wsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUNqRDtNQUFBLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxpRkFBaUYsQ0FDaEc7UUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsK0NBQStDLENBQzVEO1VBQUEsQ0FBQywrQkFBZSxDQUNkO1lBQUEsQ0FBQyxpQkFBTyxDQUNOO2NBQUEsQ0FBQyx3QkFBYyxDQUFDLE9BQU8sQ0FDckI7Z0JBQUEsQ0FBQyxtQkFBSSxDQUNILEVBQUUsQ0FBQyxHQUFHLENBQ04sU0FBUyxDQUFDLGlJQUFpSSxDQUUzSTtrQkFBQSxDQUFDLG1CQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFDekI7a0JBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUMzQztnQkFBQSxF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RTtJQUFBLEVBQUUsR0FBRyxDQUFDLENBQ1AsQ0FBQztBQUNKLENBQUMsQ0FBQztBQXZIVyxRQUFBLFVBQVUsY0F1SHJCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUmVhY3ROb2RlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBMaW5rLCB1c2VOYXZpZ2F0ZSB9IGZyb20gXCJAdGFuc3RhY2svcmVhY3Qtcm91dGVyXCI7XG5pbXBvcnQge1xuICBIb21lLFxuICBTZXR0aW5ncyxcbiAgU2NhdHRlckNoYXJ0LFxuICBCcmFpbkNpcmN1aXQsXG4gIENvcHlQbHVzLFxuICBEYXRhYmFzZSxcbiAgTG9nT3V0LFxufSBmcm9tIFwibHVjaWRlLXJlYWN0XCI7XG5cbmltcG9ydCB7XG4gIFRvb2x0aXAsXG4gIFRvb2x0aXBDb250ZW50LFxuICBUb29sdGlwVHJpZ2dlcixcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS90b29sdGlwXCI7XG5pbXBvcnQgeyBUb29sdGlwUHJvdmlkZXIgfSBmcm9tIFwiQHJhZGl4LXVpL3JlYWN0LXRvb2x0aXBcIjtcbmltcG9ydCB7IHNpZ25PdXQgfSBmcm9tIFwiYXdzLWFtcGxpZnkvYXV0aFwiO1xuZXhwb3J0IGNvbnN0IE1haW5MYXlvdXQgPSAoeyBjaGlsZHJlbiB9OiB7IGNoaWxkcmVuOiBSZWFjdE5vZGUgfSkgPT4ge1xuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZU5hdmlnYXRlKCk7XG4gIGNvbnN0IHN1Ym1pdFNpZ25PdXQgPSBhc3luYyAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNpZ25PdXQoKTtcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIG5hdmlnYXRlKHsgdG86IFwiL3NpZ25pblwiIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgfVxuICB9O1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBtaW4taC1zY3JlZW4gdy1mdWxsIGZsZXgtY29sIFwiPlxuICAgICAgPGFzaWRlIGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LXktMCBsZWZ0LTAgei0xMCBoaWRkZW4gdy0xNCBmbGV4LWNvbCBib3JkZXItciBiZy1iYWNrZ3JvdW5kIHNtOmZsZXhcIj5cbiAgICAgICAgPG5hdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtNCBweC0yIHNtOnB5LTRcIj5cbiAgICAgICAgICA8VG9vbHRpcFByb3ZpZGVyPlxuICAgICAgICAgICAgPFRvb2x0aXA+XG4gICAgICAgICAgICAgIDxUb29sdGlwVHJpZ2dlciBhc0NoaWxkPlxuICAgICAgICAgICAgICAgIDxMaW5rXG4gICAgICAgICAgICAgICAgICB0bz1cIi9cIlxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBoLTkgdy05IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWxnIHRleHQtbXV0ZWQtZm9yZWdyb3VuZCB0cmFuc2l0aW9uLWNvbG9ycyBob3Zlcjp0ZXh0LWZvcmVncm91bmQgbWQ6aC04IG1kOnctOFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPEhvbWUgY2xhc3NOYW1lPVwiaC01IHctNVwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJzci1vbmx5XCI+RGFzaGJvYXJkPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvTGluaz5cbiAgICAgICAgICAgICAgPC9Ub29sdGlwVHJpZ2dlcj5cbiAgICAgICAgICAgICAgPFRvb2x0aXBDb250ZW50IHNpZGU9XCJyaWdodFwiPkRhc2hib2FyZDwvVG9vbHRpcENvbnRlbnQ+XG4gICAgICAgICAgICA8L1Rvb2x0aXA+XG4gICAgICAgICAgPC9Ub29sdGlwUHJvdmlkZXI+XG4gICAgICAgICAgPFRvb2x0aXBQcm92aWRlcj5cbiAgICAgICAgICAgIDxUb29sdGlwPlxuICAgICAgICAgICAgICA8VG9vbHRpcFRyaWdnZXIgYXNDaGlsZD5cbiAgICAgICAgICAgICAgICA8TGlua1xuICAgICAgICAgICAgICAgICAgaHJlZj1cImh0dHBzOi8vdXMtZWFzdC0xLmNvbnNvbGUuYXdzLmFtYXpvbi5jb20vbmVwdHVuZS9ob21lP3JlZ2lvbj11cy1lYXN0LTFcIlxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBoLTkgdy05IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWxnIHRleHQtbXV0ZWQtZm9yZWdyb3VuZCB0cmFuc2l0aW9uLWNvbG9ycyBob3Zlcjp0ZXh0LWZvcmVncm91bmQgbWQ6aC04IG1kOnctOFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPERhdGFiYXNlIGNsYXNzTmFtZT1cImgtNSB3LTVcIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic3Itb25seVwiPkFtYXpvbiBOZXB0dW5lPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvTGluaz5cbiAgICAgICAgICAgICAgPC9Ub29sdGlwVHJpZ2dlcj5cbiAgICAgICAgICAgICAgPFRvb2x0aXBDb250ZW50IHNpZGU9XCJyaWdodFwiPkFtYXpvbiBOZXB0dW5lPC9Ub29sdGlwQ29udGVudD5cbiAgICAgICAgICAgIDwvVG9vbHRpcD5cbiAgICAgICAgICA8L1Rvb2x0aXBQcm92aWRlcj5cbiAgICAgICAgICA8VG9vbHRpcFByb3ZpZGVyPlxuICAgICAgICAgICAgPFRvb2x0aXA+XG4gICAgICAgICAgICAgIDxUb29sdGlwVHJpZ2dlciBhc0NoaWxkPlxuICAgICAgICAgICAgICAgIDxMaW5rXG4gICAgICAgICAgICAgICAgICBocmVmPVwiI1wiXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGgtOSB3LTkgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtbGcgdGV4dC1tdXRlZC1mb3JlZ3JvdW5kIHRyYW5zaXRpb24tY29sb3JzIGhvdmVyOnRleHQtZm9yZWdyb3VuZCBtZDpoLTggbWQ6dy04XCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8QnJhaW5DaXJjdWl0IGNsYXNzTmFtZT1cImgtNSB3LTVcIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic3Itb25seVwiPkFtYXpvbiBTYWdlTWFrZXI8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9MaW5rPlxuICAgICAgICAgICAgICA8L1Rvb2x0aXBUcmlnZ2VyPlxuICAgICAgICAgICAgICA8VG9vbHRpcENvbnRlbnQgc2lkZT1cInJpZ2h0XCI+QW1hem9uIFNhZ2VNYWtlcjwvVG9vbHRpcENvbnRlbnQ+XG4gICAgICAgICAgICA8L1Rvb2x0aXA+XG4gICAgICAgICAgPC9Ub29sdGlwUHJvdmlkZXI+XG4gICAgICAgICAgPFRvb2x0aXBQcm92aWRlcj5cbiAgICAgICAgICAgIDxUb29sdGlwPlxuICAgICAgICAgICAgICA8VG9vbHRpcFRyaWdnZXIgYXNDaGlsZD5cbiAgICAgICAgICAgICAgICA8TGlua1xuICAgICAgICAgICAgICAgICAgdG89XCIvcmVnaXN0ZXJcIlxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBoLTkgdy05IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWxnIHRleHQtbXV0ZWQtZm9yZWdyb3VuZCB0cmFuc2l0aW9uLWNvbG9ycyBob3Zlcjp0ZXh0LWZvcmVncm91bmQgbWQ6aC04IG1kOnctOFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPENvcHlQbHVzIGNsYXNzTmFtZT1cImgtNSB3LTVcIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic3Itb25seVwiPkFkZCBWZXJ0ZXgvRWRnZTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L0xpbms+XG4gICAgICAgICAgICAgIDwvVG9vbHRpcFRyaWdnZXI+XG4gICAgICAgICAgICAgIDxUb29sdGlwQ29udGVudCBzaWRlPVwicmlnaHRcIj5BZGQgVmVydGV4L0VkZ2U8L1Rvb2x0aXBDb250ZW50PlxuICAgICAgICAgICAgPC9Ub29sdGlwPlxuICAgICAgICAgIDwvVG9vbHRpcFByb3ZpZGVyPlxuICAgICAgICAgIDxUb29sdGlwUHJvdmlkZXI+XG4gICAgICAgICAgICA8VG9vbHRpcD5cbiAgICAgICAgICAgICAgPFRvb2x0aXBUcmlnZ2VyIGFzQ2hpbGQ+XG4gICAgICAgICAgICAgICAgPExpbmtcbiAgICAgICAgICAgICAgICAgIHRvPVwiL2dyYXBoXCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaC05IHctOSBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC1sZyB0ZXh0LW11dGVkLWZvcmVncm91bmQgdHJhbnNpdGlvbi1jb2xvcnMgaG92ZXI6dGV4dC1mb3JlZ3JvdW5kIG1kOmgtOCBtZDp3LThcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxTY2F0dGVyQ2hhcnQgY2xhc3NOYW1lPVwiaC01IHctNVwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJzci1vbmx5XCI+R3JhcGggVmlzdWFsaXphdGlvbjwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L0xpbms+XG4gICAgICAgICAgICAgIDwvVG9vbHRpcFRyaWdnZXI+XG4gICAgICAgICAgICAgIDxUb29sdGlwQ29udGVudCBzaWRlPVwicmlnaHRcIj5HcmFwaCBWaXN1YWxpemF0aW9uPC9Ub29sdGlwQ29udGVudD5cbiAgICAgICAgICAgIDwvVG9vbHRpcD5cbiAgICAgICAgICA8L1Rvb2x0aXBQcm92aWRlcj5cbiAgICAgICAgPC9uYXY+XG4gICAgICAgIDxuYXYgY2xhc3NOYW1lPVwibXQtYXV0byBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtNCBweC0yIHNtOnB5LTRcIj5cbiAgICAgICAgICA8VG9vbHRpcFByb3ZpZGVyPlxuICAgICAgICAgICAgPFRvb2x0aXA+XG4gICAgICAgICAgICAgIDxUb29sdGlwVHJpZ2dlciBhc0NoaWxkPlxuICAgICAgICAgICAgICAgIDxMaW5rXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzdWJtaXRTaWduT3V0KCl9XG4gICAgICAgICAgICAgICAgICBocmVmPVwiL3NpZ25pblwiXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGgtOSB3LTkgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtbGcgdGV4dC1tdXRlZC1mb3JlZ3JvdW5kIHRyYW5zaXRpb24tY29sb3JzIGhvdmVyOnRleHQtZm9yZWdyb3VuZCBtZDpoLTggbWQ6dy04XCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8TG9nT3V0IGNsYXNzTmFtZT1cImgtNSB3LTVcIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic3Itb25seVwiPlNpZ25vdXQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9MaW5rPlxuICAgICAgICAgICAgICA8L1Rvb2x0aXBUcmlnZ2VyPlxuICAgICAgICAgICAgICA8VG9vbHRpcENvbnRlbnQgc2lkZT1cInJpZ2h0XCI+U2lnbm91dDwvVG9vbHRpcENvbnRlbnQ+XG4gICAgICAgICAgICA8L1Rvb2x0aXA+XG4gICAgICAgICAgICA8VG9vbHRpcD5cbiAgICAgICAgICAgICAgPFRvb2x0aXBUcmlnZ2VyIGFzQ2hpbGQ+XG4gICAgICAgICAgICAgICAgPExpbmtcbiAgICAgICAgICAgICAgICAgIGhyZWY9XCIjXCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaC05IHctOSBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC1sZyB0ZXh0LW11dGVkLWZvcmVncm91bmQgdHJhbnNpdGlvbi1jb2xvcnMgaG92ZXI6dGV4dC1mb3JlZ3JvdW5kIG1kOmgtOCBtZDp3LThcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxTZXR0aW5ncyBjbGFzc05hbWU9XCJoLTUgdy01XCIgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNyLW9ubHlcIj5TZXR0aW5nczwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L0xpbms+XG4gICAgICAgICAgICAgIDwvVG9vbHRpcFRyaWdnZXI+XG4gICAgICAgICAgICAgIDxUb29sdGlwQ29udGVudCBzaWRlPVwicmlnaHRcIj5TZXR0aW5nczwvVG9vbHRpcENvbnRlbnQ+XG4gICAgICAgICAgICA8L1Rvb2x0aXA+XG4gICAgICAgICAgPC9Ub29sdGlwUHJvdmlkZXI+XG4gICAgICAgIDwvbmF2PlxuICAgICAgPC9hc2lkZT5cbiAgICAgIDxtYWluIGNsYXNzTmFtZT1cImdyaWQgZmxleC0xIHBsLTEyIGl0ZW1zLXN0YXJ0XCI+e2NoaWxkcmVufTwvbWFpbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG4iXX0=