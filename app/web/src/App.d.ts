import { router } from "./router";
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}
declare const App: () => any;
export default App;
