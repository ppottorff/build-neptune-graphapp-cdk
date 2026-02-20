import { useEffect, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { createFileRoute } from "@tanstack/react-router";
import { omitBy, map, includes, trim, find } from "lodash-es";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Profiles } from "@/data/data";
import { Graph } from "@/types/types";
import { queryGetGraph, queryGetProfile } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/_layout/graph")({
  component: Graph3D,
});

function Graph3D() {
  const [value] = useState("id");
  const [name, setName] = useState("");
  const [state, setState] = useState<{
    nodes: Array<{
      id: string;
      label: string;
    }>;
    links: Array<{
      source: string;
      target: string;
      value: string;
    }>;
  }>({ nodes: [], links: [] });
  const [profile, setProfile] = useState<
    Array<{
      search_name: string;
      usage?: string;
      belong_to?: string;
      authored_by?: string;
      affiliated_with?: string;
      people?: string;
      made_by?: string | null;
    }>
  >([]);
  const [open, setOpen] = useState(false);
  const [displayWidth, setDisplayWidth] = useState(window.innerWidth);
  const [displayHeight, setDisplayHeight] = useState(window.innerHeight);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  window.addEventListener("resize", () => {
    setDisplayWidth(window.innerWidth);
    setDisplayHeight(window.innerHeight);
  });
  const onSubmit = async () => {
    try {
      const res = await queryGetGraph(value);
      setState(res.data.getGraph);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Query Error",
        description: error.errors[0].message,
      });
    }
  };
  const getInformation = async () => {
    try {
      setIsLoading(true);
      const res = await queryGetProfile(name, value);
      setProfile(res.data.getProfile);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log(error);
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Query Error",
        description: error.errors[0].message,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    getInformation();
  }, [name]);

  useEffect(() => {
    onSubmit();
  }, []);

  const Details = () => {
    const res = omitBy(profile[0], (value: string) => {
      return includes(value, "[]");
    });

    const data: Graph[] = [];
    map(res, (value, key) => {
      find(Profiles, (obj) => {
        if (obj.value === key) {
          const res = { ...obj, data: value };
          data.push(res);
        }
      });
    });

    return (
      <>
        <div className="flex flex-col py-8">
          {map(data, (value: Graph, index: number) => (
            <div key={index.toString()}>
              <div className="flex flex-row justify-between py-4">
                <div className="basis=1/4 font-bold">{value.description}</div>
              </div>
              <div className="basis=1/4 py-4">{trim(value.data, "[]")}</div>
              <Separator />
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <main className="grid items-center flex-1 gap-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Relation</SheetTitle>
          </SheetHeader>
          {isLoading ? (
            <>
              <div className="flex flex-col space-y-3 py-8">
                <Skeleton className="flex h-[100px] rounded-xl" />
                <div className="space-y-2 ">
                  <Skeleton className="flex h-4" />
                  <Skeleton className="flex h-4" />
                </div>
              </div>
            </>
          ) : (
            <>{profile.length !== 0 ? <Details /> : <></>}</>
          )}
        </SheetContent>
      </Sheet>
      <ForceGraph2D
        graphData={state}
        nodeAutoColorBy={"label"}
        backgroundColor={"white"}
        height={displayHeight}
        width={displayWidth}
        nodeLabel={"id"}
        onNodeClick={(event: { id: string }) => {
          setName(event.id);
          setOpen(true);
        }}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.id as string;
          const fontSize = 14 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const padding = fontSize * 0.4;

          // Draw background
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillRect(
            node.x! - textWidth / 2 - padding,
            node.y! - fontSize / 2 - padding,
            textWidth + padding * 2,
            fontSize + padding * 2
          );

          // Draw border
          ctx.strokeStyle = node.color || "#333";
          ctx.lineWidth = 1.5 / globalScale;
          ctx.strokeRect(
            node.x! - textWidth / 2 - padding,
            node.y! - fontSize / 2 - padding,
            textWidth + padding * 2,
            fontSize + padding * 2
          );

          // Draw text
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = node.color || "#333";
          ctx.fillText(label, node.x!, node.y!);
        }}
        linkColor={() => "#cccccc"}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
      />
    </main>

  );
}
