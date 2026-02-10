"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buttonVariants = exports.Button = void 0;
const React = require("react");
const react_slot_1 = require("@radix-ui/react-slot");
const class_variance_authority_1 = require("class-variance-authority");
const utils_1 = require("@/lib/utils");
const buttonVariants = (0, class_variance_authority_1.cva)("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
        },
        size: {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
exports.buttonVariants = buttonVariants;
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? react_slot_1.Slot : "button";
    return (<Comp className={(0, utils_1.cn)(buttonVariants({ variant, size, className }))} ref={ref} {...props}/>);
});
exports.Button = Button;
Button.displayName = "Button";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV0dG9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnV0dG9uLnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrQkFBOEI7QUFDOUIscURBQTJDO0FBQzNDLHVFQUFpRTtBQUVqRSx1Q0FBZ0M7QUFFaEMsTUFBTSxjQUFjLEdBQUcsSUFBQSw4QkFBRyxFQUN4Qix3UkFBd1IsRUFDeFI7SUFDRSxRQUFRLEVBQUU7UUFDUixPQUFPLEVBQUU7WUFDUCxPQUFPLEVBQUUsd0RBQXdEO1lBQ2pFLFdBQVcsRUFDVCxvRUFBb0U7WUFDdEUsT0FBTyxFQUNMLGdGQUFnRjtZQUNsRixTQUFTLEVBQ1AsOERBQThEO1lBQ2hFLEtBQUssRUFBRSw4Q0FBOEM7WUFDckQsSUFBSSxFQUFFLGlEQUFpRDtTQUN4RDtRQUNELElBQUksRUFBRTtZQUNKLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsRUFBRSxFQUFFLHFCQUFxQjtZQUN6QixFQUFFLEVBQUUsc0JBQXNCO1lBQzFCLElBQUksRUFBRSxXQUFXO1NBQ2xCO0tBQ0Y7SUFDRCxlQUFlLEVBQUU7UUFDZixPQUFPLEVBQUUsU0FBUztRQUNsQixJQUFJLEVBQUUsU0FBUztLQUNoQjtDQUNGLENBQ0YsQ0FBQTtBQXNCZ0Isd0NBQWM7QUFkL0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FDN0IsQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sR0FBRyxLQUFLLEVBQUUsR0FBRyxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUMvRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLGlCQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtJQUN0QyxPQUFPLENBQ0wsQ0FBQyxJQUFJLENBQ0gsU0FBUyxDQUFDLENBQUMsSUFBQSxVQUFFLEVBQUMsY0FBYyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDNUQsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ1QsSUFBSSxLQUFLLENBQUMsRUFDVixDQUNILENBQUE7QUFDSCxDQUFDLENBQ0YsQ0FBQTtBQUdRLHdCQUFNO0FBRmYsTUFBTSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBSZWFjdCBmcm9tIFwicmVhY3RcIlxuaW1wb3J0IHsgU2xvdCB9IGZyb20gXCJAcmFkaXgtdWkvcmVhY3Qtc2xvdFwiXG5pbXBvcnQgeyBjdmEsIHR5cGUgVmFyaWFudFByb3BzIH0gZnJvbSBcImNsYXNzLXZhcmlhbmNlLWF1dGhvcml0eVwiXG5cbmltcG9ydCB7IGNuIH0gZnJvbSBcIkAvbGliL3V0aWxzXCJcblxuY29uc3QgYnV0dG9uVmFyaWFudHMgPSBjdmEoXG4gIFwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHdoaXRlc3BhY2Utbm93cmFwIHJvdW5kZWQtbWQgdGV4dC1zbSBmb250LW1lZGl1bSByaW5nLW9mZnNldC1iYWNrZ3JvdW5kIHRyYW5zaXRpb24tY29sb3JzIGZvY3VzLXZpc2libGU6b3V0bGluZS1ub25lIGZvY3VzLXZpc2libGU6cmluZy0yIGZvY3VzLXZpc2libGU6cmluZy1yaW5nIGZvY3VzLXZpc2libGU6cmluZy1vZmZzZXQtMiBkaXNhYmxlZDpwb2ludGVyLWV2ZW50cy1ub25lIGRpc2FibGVkOm9wYWNpdHktNTBcIixcbiAge1xuICAgIHZhcmlhbnRzOiB7XG4gICAgICB2YXJpYW50OiB7XG4gICAgICAgIGRlZmF1bHQ6IFwiYmctcHJpbWFyeSB0ZXh0LXByaW1hcnktZm9yZWdyb3VuZCBob3ZlcjpiZy1wcmltYXJ5LzkwXCIsXG4gICAgICAgIGRlc3RydWN0aXZlOlxuICAgICAgICAgIFwiYmctZGVzdHJ1Y3RpdmUgdGV4dC1kZXN0cnVjdGl2ZS1mb3JlZ3JvdW5kIGhvdmVyOmJnLWRlc3RydWN0aXZlLzkwXCIsXG4gICAgICAgIG91dGxpbmU6XG4gICAgICAgICAgXCJib3JkZXIgYm9yZGVyLWlucHV0IGJnLWJhY2tncm91bmQgaG92ZXI6YmctYWNjZW50IGhvdmVyOnRleHQtYWNjZW50LWZvcmVncm91bmRcIixcbiAgICAgICAgc2Vjb25kYXJ5OlxuICAgICAgICAgIFwiYmctc2Vjb25kYXJ5IHRleHQtc2Vjb25kYXJ5LWZvcmVncm91bmQgaG92ZXI6Ymctc2Vjb25kYXJ5LzgwXCIsXG4gICAgICAgIGdob3N0OiBcImhvdmVyOmJnLWFjY2VudCBob3Zlcjp0ZXh0LWFjY2VudC1mb3JlZ3JvdW5kXCIsXG4gICAgICAgIGxpbms6IFwidGV4dC1wcmltYXJ5IHVuZGVybGluZS1vZmZzZXQtNCBob3Zlcjp1bmRlcmxpbmVcIixcbiAgICAgIH0sXG4gICAgICBzaXplOiB7XG4gICAgICAgIGRlZmF1bHQ6IFwiaC0xMCBweC00IHB5LTJcIixcbiAgICAgICAgc206IFwiaC05IHJvdW5kZWQtbWQgcHgtM1wiLFxuICAgICAgICBsZzogXCJoLTExIHJvdW5kZWQtbWQgcHgtOFwiLFxuICAgICAgICBpY29uOiBcImgtMTAgdy0xMFwiLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmF1bHRWYXJpYW50czoge1xuICAgICAgdmFyaWFudDogXCJkZWZhdWx0XCIsXG4gICAgICBzaXplOiBcImRlZmF1bHRcIixcbiAgICB9LFxuICB9XG4pXG5cbmV4cG9ydCBpbnRlcmZhY2UgQnV0dG9uUHJvcHNcbiAgZXh0ZW5kcyBSZWFjdC5CdXR0b25IVE1MQXR0cmlidXRlczxIVE1MQnV0dG9uRWxlbWVudD4sXG4gICAgVmFyaWFudFByb3BzPHR5cGVvZiBidXR0b25WYXJpYW50cz4ge1xuICBhc0NoaWxkPzogYm9vbGVhblxufVxuXG5jb25zdCBCdXR0b24gPSBSZWFjdC5mb3J3YXJkUmVmPEhUTUxCdXR0b25FbGVtZW50LCBCdXR0b25Qcm9wcz4oXG4gICh7IGNsYXNzTmFtZSwgdmFyaWFudCwgc2l6ZSwgYXNDaGlsZCA9IGZhbHNlLCAuLi5wcm9wcyB9LCByZWYpID0+IHtcbiAgICBjb25zdCBDb21wID0gYXNDaGlsZCA/IFNsb3QgOiBcImJ1dHRvblwiXG4gICAgcmV0dXJuIChcbiAgICAgIDxDb21wXG4gICAgICAgIGNsYXNzTmFtZT17Y24oYnV0dG9uVmFyaWFudHMoeyB2YXJpYW50LCBzaXplLCBjbGFzc05hbWUgfSkpfVxuICAgICAgICByZWY9e3JlZn1cbiAgICAgICAgey4uLnByb3BzfVxuICAgICAgLz5cbiAgICApXG4gIH1cbilcbkJ1dHRvbi5kaXNwbGF5TmFtZSA9IFwiQnV0dG9uXCJcblxuZXhwb3J0IHsgQnV0dG9uLCBidXR0b25WYXJpYW50cyB9XG4iXX0=