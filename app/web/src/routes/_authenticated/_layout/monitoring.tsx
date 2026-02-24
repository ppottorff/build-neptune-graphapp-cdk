import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_layout/monitoring")({
  component: Monitoring,
});

function Monitoring() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Monitoring</h1>
    </div>
  );
}
