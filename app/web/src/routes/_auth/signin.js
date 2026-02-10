"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
exports.Signin = Signin;
const auth_form_1 = require("@/components/auth-form");
const auth_newpassword_form_1 = require("@/components/auth-newpassword-form");
const useAuthStore_1 = require("@/store/useAuthStore");
const react_router_1 = require("@tanstack/react-router");
const react_1 = require("react");
exports.Route = (0, react_router_1.createFileRoute)("/_auth/signin")({
    component: Signin,
});
function Signin() {
    const signInStep = (0, useAuthStore_1.useAuthStore)((state) => state.signInStep);
    const getState = useAuthStore_1.useAuthStore.getState();
    (0, react_1.useEffect)(() => { }, [getState]);
    return (<div className="w-dvw h-dvh lg:grid  lg:grid-cols-2 ">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          {signInStep !== "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED" ? (<>
              <div className="grid gap-2 text-center">
                <h1 className="text-3xl font-bold">Signin</h1>
                <p className="text-balance text-muted-foreground">
                  Enter email(or username) and password below
                </p>
              </div>
              <auth_form_1.UserAuthForm />
            </>) : (<>
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Change your password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your new and confirm password
                </p>
              </div>
              <auth_newpassword_form_1.UserNewPasswordForm />
            </>)}
        </div>
      </div>
      <div className="flex flex-col content-center lg:block">
        <img src="/graph.jpg" className="hidden lg:block"/>
      </div>
    </div>);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmluLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2lnbmluLnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFTQSx3QkF3Q0M7QUFqREQsc0RBQXNEO0FBQ3RELDhFQUF5RTtBQUN6RSx1REFBb0Q7QUFDcEQseURBQXlEO0FBQ3pELGlDQUFrQztBQUVyQixRQUFBLEtBQUssR0FBRyxJQUFBLDhCQUFlLEVBQUMsZUFBZSxDQUFDLENBQUM7SUFDcEQsU0FBUyxFQUFFLE1BQU07Q0FDbEIsQ0FBQyxDQUFDO0FBQ0gsU0FBZ0IsTUFBTTtJQUNwQixNQUFNLFVBQVUsR0FBRyxJQUFBLDJCQUFZLEVBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUU3RCxNQUFNLFFBQVEsR0FBRywyQkFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3pDLElBQUEsaUJBQVMsRUFBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRWhDLE9BQU8sQ0FDTCxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsc0NBQXNDLENBQ25EO01BQUEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLHdDQUF3QyxDQUNyRDtRQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FDM0M7VUFBQSxDQUFDLFVBQVUsS0FBSyw0Q0FBNEMsQ0FBQyxDQUFDLENBQUMsQ0FDN0QsRUFDRTtjQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FDckM7Z0JBQUEsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzdDO2dCQUFBLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQ0FBb0MsQ0FDL0M7O2dCQUNGLEVBQUUsQ0FBQyxDQUNMO2NBQUEsRUFBRSxHQUFHLENBQ0w7Y0FBQSxDQUFDLHdCQUFZLENBQUMsQUFBRCxFQUNmO1lBQUEsR0FBRyxDQUNKLENBQUMsQ0FBQyxDQUFDLENBQ0YsRUFDRTtjQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FDbEQ7Z0JBQUEsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLHVDQUF1QyxDQUNuRDs7Z0JBQ0YsRUFBRSxFQUFFLENBQ0o7Z0JBQUEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLCtCQUErQixDQUMxQzs7Z0JBQ0YsRUFBRSxDQUFDLENBQ0w7Y0FBQSxFQUFFLEdBQUcsQ0FDTDtjQUFBLENBQUMsMkNBQW1CLENBQUMsQUFBRCxFQUN0QjtZQUFBLEdBQUcsQ0FDSixDQUNIO1FBQUEsRUFBRSxHQUFHLENBQ1A7TUFBQSxFQUFFLEdBQUcsQ0FDTDtNQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyx1Q0FBdUMsQ0FDcEQ7UUFBQSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFDbkQ7TUFBQSxFQUFFLEdBQUcsQ0FDUDtJQUFBLEVBQUUsR0FBRyxDQUFDLENBQ1AsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBVc2VyQXV0aEZvcm0gfSBmcm9tIFwiQC9jb21wb25lbnRzL2F1dGgtZm9ybVwiO1xuaW1wb3J0IHsgVXNlck5ld1Bhc3N3b3JkRm9ybSB9IGZyb20gXCJAL2NvbXBvbmVudHMvYXV0aC1uZXdwYXNzd29yZC1mb3JtXCI7XG5pbXBvcnQgeyB1c2VBdXRoU3RvcmUgfSBmcm9tIFwiQC9zdG9yZS91c2VBdXRoU3RvcmVcIjtcbmltcG9ydCB7IGNyZWF0ZUZpbGVSb3V0ZSB9IGZyb20gXCJAdGFuc3RhY2svcmVhY3Qtcm91dGVyXCI7XG5pbXBvcnQgeyB1c2VFZmZlY3QgfSBmcm9tIFwicmVhY3RcIjtcblxuZXhwb3J0IGNvbnN0IFJvdXRlID0gY3JlYXRlRmlsZVJvdXRlKFwiL19hdXRoL3NpZ25pblwiKSh7XG4gIGNvbXBvbmVudDogU2lnbmluLFxufSk7XG5leHBvcnQgZnVuY3Rpb24gU2lnbmluKCkge1xuICBjb25zdCBzaWduSW5TdGVwID0gdXNlQXV0aFN0b3JlKChzdGF0ZSkgPT4gc3RhdGUuc2lnbkluU3RlcCk7XG5cbiAgY29uc3QgZ2V0U3RhdGUgPSB1c2VBdXRoU3RvcmUuZ2V0U3RhdGUoKTtcbiAgdXNlRWZmZWN0KCgpID0+IHt9LCBbZ2V0U3RhdGVdKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwidy1kdncgaC1kdmggbGc6Z3JpZCAgbGc6Z3JpZC1jb2xzLTIgXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHB5LTEyXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtYXV0byBncmlkIHctWzM1MHB4XSBnYXAtNlwiPlxuICAgICAgICAgIHtzaWduSW5TdGVwICE9PSBcIkNPTkZJUk1fU0lHTl9JTl9XSVRIX05FV19QQVNTV09SRF9SRVFVSVJFRFwiID8gKFxuICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdhcC0yIHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZFwiPlNpZ25pbjwvaDE+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1iYWxhbmNlIHRleHQtbXV0ZWQtZm9yZWdyb3VuZFwiPlxuICAgICAgICAgICAgICAgICAgRW50ZXIgZW1haWwob3IgdXNlcm5hbWUpIGFuZCBwYXNzd29yZCBiZWxvd1xuICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxVc2VyQXV0aEZvcm0gLz5cbiAgICAgICAgICAgIDwvPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgc3BhY2UteS0yIHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdHJhY2tpbmctdGlnaHRcIj5cbiAgICAgICAgICAgICAgICAgIENoYW5nZSB5b3VyIHBhc3N3b3JkXG4gICAgICAgICAgICAgICAgPC9oMT5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtbXV0ZWQtZm9yZWdyb3VuZFwiPlxuICAgICAgICAgICAgICAgICAgRW50ZXIgeW91ciBuZXcgYW5kIGNvbmZpcm0gcGFzc3dvcmRcbiAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8VXNlck5ld1Bhc3N3b3JkRm9ybSAvPlxuICAgICAgICAgICAgPC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBjb250ZW50LWNlbnRlciBsZzpibG9ja1wiPlxuICAgICAgICA8aW1nIHNyYz1cIi9ncmFwaC5qcGdcIiBjbGFzc05hbWU9XCJoaWRkZW4gbGc6YmxvY2tcIiAvPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXX0=