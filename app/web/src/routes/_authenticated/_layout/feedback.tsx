import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Icons } from "@/lib/utils";
import { queryGetFeedback, mutateSubmitFeedback, mutateUpdateFeedback } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import type { Feedback } from "@/types/types";
import React from "react";
import { MessageSquareHeart, Pencil } from "lucide-react";

const feedbackSchema = z.object({
  presentation: z.number().min(1, "Select a rating"),
  vendor: z.number().min(1, "Select a rating"),
  presenter: z.number().min(1, "Select a rating"),
  venue: z.number().min(1, "Select a rating"),
  comments: z.string().max(1000).optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export const Route = createFileRoute("/_authenticated/_layout/feedback")({
  component: FeedbackPage,
});

const RATING_FIELDS = [
  { name: "presentation" as const, label: "Presentation" },
  { name: "vendor" as const, label: "Vendor" },
  { name: "presenter" as const, label: "Presenter" },
  { name: "venue" as const, label: "Venue" },
];

const RatingSelector = React.forwardRef<
  HTMLDivElement,
  {
    value: number;
    onChange: (val: number) => void;
    hasError?: boolean;
  } & React.ComponentPropsWithoutRef<"div">
>(({ value, onChange, hasError, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="radiogroup"
      {...props}
      className={`flex gap-1 rounded p-1 ${hasError ? "ring-1 ring-destructive" : ""}`}
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
            value === n
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
});
RatingSelector.displayName = "RatingSelector";

function FeedbackPage() {
  const user = useAuthStore((s) => s.user);
  const [submissions, setSubmissions] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      presentation: 0,
      vendor: 0,
      presenter: 0,
      venue: 0,
      comments: "",
    },
  });

  const commentsValue = form.watch("comments") ?? "";

  const fetchFeedback = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await queryGetFeedback(user);
      setSubmissions(result.data?.getFeedback ?? []);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error loading feedback",
        description: error?.errors?.[0]?.message || error?.message || "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [user]);

  const onSubmit = async (values: FeedbackFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await mutateUpdateFeedback({
          id: editingId,
          ...values,
        });
        toast({ title: "Feedback updated" });
      } else {
        await mutateSubmitFeedback({
          submittedBy: user,
          ...values,
        });
        toast({ title: "Feedback submitted" });
      }
      form.reset({ presentation: 0, vendor: 0, presenter: 0, venue: 0, comments: "" });
      setEditingId(null);
      await fetchFeedback();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: editingId ? "Error updating feedback" : "Error submitting feedback",
        description: error?.errors?.[0]?.message || error?.message || "An error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (fb: Feedback) => {
    setEditingId(fb.id);
    form.reset({
      presentation: fb.presentation,
      vendor: fb.vendor,
      presenter: fb.presenter,
      venue: fb.venue,
      comments: fb.comments ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset({ presentation: 0, vendor: 0, presenter: 0, venue: 0, comments: "" });
  };

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Feedback</h1>
        <p className="text-xs text-muted-foreground">
          Rate your experience and provide comments
        </p>
      </div>

      {/* Feedback Form */}
      <Card>
        <CardHeader className="flex flex-row items-start bg-muted/50">
          <div className="grid gap-0.5">
            <CardTitle className="group flex items-center gap-2 text-lg">
              <MessageSquareHeart className="h-5 w-5" />
              {editingId ? "Edit Feedback" : "Submit Feedback"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {RATING_FIELDS.map((field) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name}
                  render={({ field: formField, fieldState }) => (
                    <FormItem>
                      <FormLabel>{field.label}</FormLabel>
                      <FormControl>
                        <RatingSelector
                          value={formField.value}
                          onChange={formField.onChange}
                          hasError={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={4}
                        maxLength={1000}
                        placeholder="Share your feedback (optional, max 1000 characters)"
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground text-right">
                      {commentsValue.length}/1000
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingId ? "Update" : "Submit"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Prior Submissions */}
      <Card>
        <CardHeader className="flex flex-row items-start bg-muted/50">
          <div className="grid gap-0.5">
            <CardTitle className="text-lg">Prior Submissions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquareHeart className="h-10 w-10 mb-2 opacity-40" />
              <p>No feedback submitted yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Presentation</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Presenter</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((fb) => (
                  <TableRow key={fb.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>{fb.presentation}</TableCell>
                    <TableCell>{fb.vendor}</TableCell>
                    <TableCell>{fb.presenter}</TableCell>
                    <TableCell>{fb.venue}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {fb.comments || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(fb)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
