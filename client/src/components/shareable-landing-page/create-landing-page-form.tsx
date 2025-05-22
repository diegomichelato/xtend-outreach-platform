import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertShareableLandingPageSchema } from "@shared/schema";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const formSchema = insertShareableLandingPageSchema.extend({
  expiresInDays: z.number().min(1).max(365).optional(),
  hasExpiration: z.boolean().default(false),
  hasPassword: z.boolean().default(false),
  hasCta: z.boolean().default(false),
});

interface CreateLandingPageFormProps {
  creatorId?: number;
  projectId?: string;
  title?: string;
  description?: string;
  onSuccess?: () => void;
}

export function CreateLandingPageForm({
  creatorId,
  projectId,
  title = "",
  description = "",
  onSuccess,
}: CreateLandingPageFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: title || "",
      description: description || "",
      projectId: projectId || "",
      creatorId: creatorId || null,
      status: "active",
      hasExpiration: false,
      expiresInDays: 30,
      hasPassword: false,
      password: "",
      hasCta: false,
      ctaText: "Contact Us",
      ctaUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Process the form data before submission
      const formData = { ...data };
      
      // Remove UI-only fields
      delete formData.hasExpiration;
      delete formData.hasPassword;
      delete formData.hasCta;
      
      // Only include expiration if enabled
      if (!formData.hasExpiration) {
        delete formData.expiresInDays;
      }
      
      // Only include password if enabled
      if (!formData.hasPassword) {
        delete formData.password;
      }
      
      // Only include CTA if enabled
      if (!formData.hasCta) {
        delete formData.ctaText;
        delete formData.ctaUrl;
      }
      
      return apiRequest("/api/shareable-landing-pages", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Shareable landing page created successfully.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/shareable-landing-pages"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Error creating landing page:", error);
      toast({
        title: "Error",
        description: "Failed to create shareable landing page. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    createMutation.mutate(values, {
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter a title for this landing page" {...field} />
              </FormControl>
              <FormDescription>
                This will be displayed as the title of the landing page.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter a brief description"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description of what this landing page contains.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Draft pages are not publicly accessible.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hasExpiration"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
              <div className="space-y-0.5">
                <FormLabel>Set Expiration</FormLabel>
                <FormDescription>
                  Landing page will automatically expire after the specified time
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("hasExpiration") && (
          <FormField
            control={form.control}
            name="expiresInDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiration Period (Days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                  />
                </FormControl>
                <FormDescription>
                  Number of days until this landing page expires
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="hasPassword"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
              <div className="space-y-0.5">
                <FormLabel>Password Protection</FormLabel>
                <FormDescription>
                  Require a password to view this landing page
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("hasPassword") && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Enter a password" {...field} />
                </FormControl>
                <FormDescription>
                  Visitors will need to enter this password to view the landing page
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="hasCta"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
              <div className="space-y-0.5">
                <FormLabel>Add Call to Action</FormLabel>
                <FormDescription>
                  Include a call-to-action button on the landing page
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("hasCta") && (
          <>
            <FormField
              control={form.control}
              name="ctaText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Text</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Contact Us"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ctaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Link</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/contact"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL where users will be directed when clicking the button
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
            </>
          ) : (
            "Create Landing Page"
          )}
        </Button>
      </form>
    </Form>
  );
}