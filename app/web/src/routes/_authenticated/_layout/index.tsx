import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRef, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  Package,
  Search,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { EntityProperty, EdgeRelation, SearchResult } from "@/types/types";
import { Separator } from "@/components/ui/separator";
import {
  Icons,
  queryEntityProperties,
  queryEntityEdges,
  querySearchEntities,
} from "@/lib/utils";
import { radioGroupValue } from "@/data/data";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/_layout/")({
  component: Dashboard,
});

const FormSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string(),
});

const propertyLabels: Record<string, string> = {
  entityTypes: "Type",
  companyName: "Company Name",
  name: "Name",
  companyType: "Company Type",
  address: "Address",
  email: "Email",
  phone: "Phone",
  website: "Website",
  country: "Country",
  assetType: "Asset Type",
  make: "Make",
  model: "Model",
  year: "Year",
  vin: "VIN",
  serialNumber: "Serial Number",
  brand: "Brand",
  jobName: "Job Name",
  jobCategory: "Category",
  status: "Status",
  roNumber: "RO Number",
  partName: "Part Name",
  partId: "Part ID",
  retailCost: "Retail Cost",
};

const edgeLabelMap: Record<string, string> = {
  WORKS_FOR: "Works For",
  REQUESTS_WORK: "Requests Work",
  DOES_WORK_FOR: "Does Work For",
  OWNS_ASSET: "Owns Asset",
  MANAGES_JOB: "Manages Job",
  SERVICE_ON: "Service On",
  PAYS_FOR: "Pays For",
  OFFERS_PART: "Offers Part",
  HAS_LINE_ITEM: "Has Line Item",
  JOBBER_FOR_JOB: "Jobber For Job",
};

function getTargetIcon(label: string) {
  switch (label) {
    case "Entity":
      return <Building2 className="h-4 w-4" />;
    case "Asset":
      return <Car className="h-4 w-4" />;
    case "Job":
      return <Wrench className="h-4 w-4" />;
    case "Part":
      return <Package className="h-4 w-4" />;
    default:
      return null;
  }
}

export function Dashboard() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  const refName = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("Company");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  );
  const [properties, setProperties] = useState<EntityProperty[]>([]);
  const [edges, setEdges] = useState<EdgeRelation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedOption = radioGroupValue.find((r) => r.value === value);

  const fieldChange = (curr: string) => {
    setValue(curr);
  };

  const executeSearch = async () => {
    const name = refName.current?.value?.trim() || "";

    setIsSearching(true);
    setSearchTerm(name);
    setSelectedResult(null);
    setProperties([]);
    setEdges([]);

    try {
      const result = await querySearchEntities(value, name || undefined);
      const results = result.data!.searchEntities || [];
      setSearchResults(results);

      if (results.length === 1) {
        // Auto-select if only one result
        await selectResult(results[0]);
      } else if (results.length === 0) {
        toast({ title: "No results found" });
      } else {
        toast({ title: `Found ${results.length} results` });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Search Error",
        description:
          error.errors?.[0]?.message || error.message || "An error occurred",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = async (result: SearchResult) => {
    setSelectedResult(result);
    setIsLoadingDetail(true);

    try {
      const [propsResult, edgesResult] = await Promise.all([
        queryEntityProperties(value, searchTerm || undefined, result.id),
        queryEntityEdges(value, searchTerm || undefined, result.id),
      ]);

      setProperties(propsResult.data!.getEntityProperties || []);
      setEdges(edgesResult.data!.getEntityEdges || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error loading details",
        description:
          error.errors?.[0]?.message || error.message || "An error occurred",
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const outgoingEdges = edges.filter((e) => e.direction === "outgoing");
  const incomingEdges = edges.filter((e) => e.direction === "incoming");

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      <div className="col-span-2 gap-2 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
        <Card className="sm:col-span-2" x-chunk="dashboard-05-chunk-0">
          <CardHeader className="flex flex-row items-start bg-muted/50">
            <div className="grid gap-0.5">
              <CardTitle className="group flex items-center gap-2 text-lg">
                Selection
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="value"
                  render={() => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={fieldChange}
                          defaultValue={value}
                          className="flex flex-col space-y-1"
                        >
                          {radioGroupValue.map((object, key: number) => (
                            <FormItem
                              className="flex items-start space-x-3 space-y-0"
                              key={key.toString()}
                            >
                              <FormControl>
                                <RadioGroupItem value={object.value} />
                              </FormControl>
                              <FormLabel>{object.label}</FormLabel>
                              <FormDescription>
                                {object.description}
                              </FormDescription>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Input
                  id="name"
                  placeholder={
                    selectedOption?.placeholder || "Leave empty to list all"
                  }
                  ref={refName}
                  disabled={isSearching}
                />
                <Button
                  className="items-left"
                  onClick={executeSearch}
                  disabled={isSearching}
                >
                  {isSearching && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Search
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Search Results list */}
        {searchResults.length > 0 && (
          <Card className="sm:col-span-2 mt-4" x-chunk="dashboard-05-chunk-results">
            <CardHeader className="flex flex-row items-start bg-muted/50">
              <div className="grid gap-0.5">
                <CardTitle className="group flex items-center gap-2 text-lg">
                  Results
                  <span className="text-sm font-normal text-muted-foreground">
                    ({searchResults.length} found)
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-2">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => selectResult(result)}
                    className={`flex items-center gap-3 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                      selectedResult?.id === result.id
                        ? "border-primary bg-accent"
                        : "border-border"
                    }`}
                  >
                    {getTargetIcon(result.label)}
                    <div className="flex flex-col">
                      <span className="font-medium text-primary underline underline-offset-2 cursor-pointer">
                        {result.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {result.entityType
                          ? `${result.label} / ${result.entityType}`
                          : result.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="col-span-1">
        <Card className="flex flex-col" x-chunk="dashboard-05-chunk-1">
          <CardHeader className="flex flex-row items-start bg-muted/50">
            <div className="grid gap-0.5">
              <CardTitle className="group flex items-center gap-2 text-lg">
                Properties
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col p-6 text-sm">
            {isLoadingDetail ? (
              <div className="flex flex-col space-y-3">
                <Skeleton className="flex h-[100px] rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div
                  className="font-semibold flex flex-row justify-start"
                  key="search"
                >
                  <Search />
                  <span className="text-muted-foreground px-4 text-base">
                    {selectedResult?.name || searchTerm || ""}
                  </span>
                </div>
                {properties.length > 0 ? (
                  <>
                    <Separator />
                    {properties.map((prop, index) => (
                      <div
                        key={index}
                        className="flex flex-row justify-between py-1"
                      >
                        <span className="text-muted-foreground font-medium">
                          {propertyLabels[prop.key] || prop.key}
                        </span>
                        <span className="text-right">{prop.value}</span>
                      </div>
                    ))}
                  </>
                ) : selectedResult ? (
                  <CardDescription className="pt-2">
                    No properties found
                  </CardDescription>
                ) : searchTerm !== "" && searchResults.length > 0 ? (
                  <CardDescription className="pt-2">
                    Select a result to view properties
                  </CardDescription>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="col-span-3">
        <Card x-chunk="dashboard-05-chunk-2">
          <CardHeader className="flex flex-row items-start bg-muted/50">
            <div className="grid gap-0.5">
              <CardTitle className="group flex items-center gap-2 text-lg">
                Relations
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingDetail ? (
              <div className="space-y-2">
                <Skeleton className="flex h-4" />
                <Skeleton className="flex h-4" />
              </div>
            ) : edges.length > 0 ? (
              <div className="grid gap-4">
                {outgoingEdges.length > 0 && (
                  <div className="grid gap-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Outgoing Relations
                    </h3>
                    <Separator />
                    {outgoingEdges.map((edge, index) => (
                      <div
                        key={`out-${index}`}
                        className="flex items-center gap-3 py-1"
                      >
                        <ArrowRight className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="font-medium text-sm min-w-[140px]">
                          {edgeLabelMap[edge.edgeLabel] || edge.edgeLabel}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="flex items-center gap-1.5">
                          {getTargetIcon(edge.targetLabel)}
                          <span className="text-muted-foreground text-xs">
                            {edge.targetLabel}:
                          </span>
                          <span className="text-sm">{edge.targetName}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {incomingEdges.length > 0 && (
                  <div className="grid gap-3">
                    {outgoingEdges.length > 0 && <Separator />}
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Incoming Relations
                    </h3>
                    <Separator />
                    {incomingEdges.map((edge, index) => (
                      <div
                        key={`in-${index}`}
                        className="flex items-center gap-3 py-1"
                      >
                        <ArrowLeft className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="font-medium text-sm min-w-[140px]">
                          {edgeLabelMap[edge.edgeLabel] || edge.edgeLabel}
                        </span>
                        <span className="text-muted-foreground">←</span>
                        <span className="flex items-center gap-1.5">
                          {getTargetIcon(edge.targetLabel)}
                          <span className="text-muted-foreground text-xs">
                            {edge.targetLabel}:
                          </span>
                          <span className="text-sm">{edge.targetName}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedResult ? (
              <CardDescription>No relations found</CardDescription>
            ) : searchResults.length > 0 ? (
              <CardDescription>
                Select a result to view relations
              </CardDescription>
            ) : (
              <CardDescription>
                Search for an entity to view its relations
              </CardDescription>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
