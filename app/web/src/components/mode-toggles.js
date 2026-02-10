"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeToggle = ModeToggle;
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
const dropdown_menu_1 = require("@/components/ui/dropdown-menu");
const theme_provider_1 = require("@/components/theme-provider");
function ModeToggle() {
    const { setTheme } = (0, theme_provider_1.useTheme)();
    return (<header className="flex justify-end border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
      <dropdown_menu_1.DropdownMenu>
        <dropdown_menu_1.DropdownMenuTrigger asChild>
          <button_1.Button variant="outline" size="icon">
            <lucide_react_1.Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"/>
            <lucide_react_1.Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"/>
            <span className="sr-only">Toggle theme</span>
          </button_1.Button>
        </dropdown_menu_1.DropdownMenuTrigger>
        <dropdown_menu_1.DropdownMenuContent align="end">
          <dropdown_menu_1.DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </dropdown_menu_1.DropdownMenuItem>
          <dropdown_menu_1.DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </dropdown_menu_1.DropdownMenuItem>
          <dropdown_menu_1.DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </dropdown_menu_1.DropdownMenuItem>
        </dropdown_menu_1.DropdownMenuContent>
      </dropdown_menu_1.DropdownMenu>
    </header>);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZS10b2dnbGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9kZS10b2dnbGVzLnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVdBLGdDQTJCQztBQXRDRCwrQ0FBeUM7QUFFekMsbURBQWdEO0FBQ2hELGlFQUt1QztBQUN2QyxnRUFBdUQ7QUFFdkQsU0FBZ0IsVUFBVTtJQUN4QixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBQSx5QkFBUSxHQUFFLENBQUM7SUFFaEMsT0FBTyxDQUNMLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyw2R0FBNkcsQ0FDN0g7TUFBQSxDQUFDLDRCQUFZLENBQ1g7UUFBQSxDQUFDLG1DQUFtQixDQUFDLE9BQU8sQ0FDMUI7VUFBQSxDQUFDLGVBQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQ25DO1lBQUEsQ0FBQyxrQkFBRyxDQUFDLFNBQVMsQ0FBQyxzRkFBc0YsRUFDckc7WUFBQSxDQUFDLG1CQUFJLENBQUMsU0FBUyxDQUFDLDhGQUE4RixFQUM5RztZQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksQ0FDOUM7VUFBQSxFQUFFLGVBQU0sQ0FDVjtRQUFBLEVBQUUsbUNBQW1CLENBQ3JCO1FBQUEsQ0FBQyxtQ0FBbUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUM5QjtVQUFBLENBQUMsZ0NBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQ2pEOztVQUNGLEVBQUUsZ0NBQWdCLENBQ2xCO1VBQUEsQ0FBQyxnQ0FBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDaEQ7O1VBQ0YsRUFBRSxnQ0FBZ0IsQ0FDbEI7VUFBQSxDQUFDLGdDQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUNsRDs7VUFDRixFQUFFLGdDQUFnQixDQUNwQjtRQUFBLEVBQUUsbUNBQW1CLENBQ3ZCO01BQUEsRUFBRSw0QkFBWSxDQUNoQjtJQUFBLEVBQUUsTUFBTSxDQUFDLENBQ1YsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb29uLCBTdW4gfSBmcm9tIFwibHVjaWRlLXJlYWN0XCI7XG5cbmltcG9ydCB7IEJ1dHRvbiB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvYnV0dG9uXCI7XG5pbXBvcnQge1xuICBEcm9wZG93bk1lbnUsXG4gIERyb3Bkb3duTWVudUNvbnRlbnQsXG4gIERyb3Bkb3duTWVudUl0ZW0sXG4gIERyb3Bkb3duTWVudVRyaWdnZXIsXG59IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvZHJvcGRvd24tbWVudVwiO1xuaW1wb3J0IHsgdXNlVGhlbWUgfSBmcm9tIFwiQC9jb21wb25lbnRzL3RoZW1lLXByb3ZpZGVyXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBNb2RlVG9nZ2xlKCkge1xuICBjb25zdCB7IHNldFRoZW1lIH0gPSB1c2VUaGVtZSgpO1xuXG4gIHJldHVybiAoXG4gICAgPGhlYWRlciBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktZW5kIGJvcmRlci1iIGJnLWJhY2tncm91bmQgcHgtNCBzbTpzdGF0aWMgc206aC1hdXRvIHNtOmJvcmRlci0wIHNtOmJnLXRyYW5zcGFyZW50IHNtOnB4LTYgcHktNFwiPlxuICAgICAgPERyb3Bkb3duTWVudT5cbiAgICAgICAgPERyb3Bkb3duTWVudVRyaWdnZXIgYXNDaGlsZD5cbiAgICAgICAgICA8QnV0dG9uIHZhcmlhbnQ9XCJvdXRsaW5lXCIgc2l6ZT1cImljb25cIj5cbiAgICAgICAgICAgIDxTdW4gY2xhc3NOYW1lPVwiaC1bMS4ycmVtXSB3LVsxLjJyZW1dIHJvdGF0ZS0wIHNjYWxlLTEwMCB0cmFuc2l0aW9uLWFsbCBkYXJrOi1yb3RhdGUtOTAgZGFyazpzY2FsZS0wXCIgLz5cbiAgICAgICAgICAgIDxNb29uIGNsYXNzTmFtZT1cImFic29sdXRlIGgtWzEuMnJlbV0gdy1bMS4ycmVtXSByb3RhdGUtOTAgc2NhbGUtMCB0cmFuc2l0aW9uLWFsbCBkYXJrOnJvdGF0ZS0wIGRhcms6c2NhbGUtMTAwXCIgLz5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNyLW9ubHlcIj5Ub2dnbGUgdGhlbWU8L3NwYW4+XG4gICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgIDwvRHJvcGRvd25NZW51VHJpZ2dlcj5cbiAgICAgICAgPERyb3Bkb3duTWVudUNvbnRlbnQgYWxpZ249XCJlbmRcIj5cbiAgICAgICAgICA8RHJvcGRvd25NZW51SXRlbSBvbkNsaWNrPXsoKSA9PiBzZXRUaGVtZShcImxpZ2h0XCIpfT5cbiAgICAgICAgICAgIExpZ2h0XG4gICAgICAgICAgPC9Ecm9wZG93bk1lbnVJdGVtPlxuICAgICAgICAgIDxEcm9wZG93bk1lbnVJdGVtIG9uQ2xpY2s9eygpID0+IHNldFRoZW1lKFwiZGFya1wiKX0+XG4gICAgICAgICAgICBEYXJrXG4gICAgICAgICAgPC9Ecm9wZG93bk1lbnVJdGVtPlxuICAgICAgICAgIDxEcm9wZG93bk1lbnVJdGVtIG9uQ2xpY2s9eygpID0+IHNldFRoZW1lKFwic3lzdGVtXCIpfT5cbiAgICAgICAgICAgIFN5c3RlbVxuICAgICAgICAgIDwvRHJvcGRvd25NZW51SXRlbT5cbiAgICAgICAgPC9Ecm9wZG93bk1lbnVDb250ZW50PlxuICAgICAgPC9Ecm9wZG93bk1lbnU+XG4gICAgPC9oZWFkZXI+XG4gICk7XG59XG4iXX0=