"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";
import { useOnboardingStore } from "../../store/onboarding-store";
import type { CreateOnboardingTeam } from "./team-details.types";

const NEXT_STEP = "/onboarding/personal/settings?fromTeamOnboarding=true";

type TeamDetailsViewProps = {
  userEmail: string;
  createTeam: CreateOnboardingTeam;
};

export const TeamDetailsView = ({ userEmail, createTeam }: TeamDetailsViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { teamDetails, setTeamDetails, setTeamId } = useOnboardingStore();
  const [isCreating, setIsCreating] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, t("team_name_required")),
    slug: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: teamDetails.name || "",
      slug: teamDetails.slug || "",
    },
  });

  const watchedName = form.watch("name");
  const watchedSlug = form.watch("slug");
  const previewSlug = (watchedSlug?.trim() ? slugify(watchedSlug) : slugify(watchedName || "")) || undefined;

  const errorMessageByCode = (code: "unauthorized" | "missing_fields" | "slug_taken" | "unknown"): string => {
    if (code === "slug_taken") return t("url_taken");
    if (code === "missing_fields") return t("team_name_required");
    return t("something_went_wrong");
  };

  const handleContinue = form.handleSubmit(async (data) => {
    setIsCreating(true);
    const result = await createTeam({ name: data.name, slug: data.slug });

    if (result.status === "error") {
      showToast(errorMessageByCode(result.code), "error");
      setIsCreating(false);
      return;
    }

    setTeamDetails({ name: data.name, slug: result.slug });
    setTeamId(result.teamId);
    router.push(NEXT_STEP);
  });

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={1} totalSteps={2}>
      {/* Left column - Main content */}
      <OnboardingCard
        title={t("onboarding_team_details_title")}
        subtitle={t("onboarding_team_details_subtitle")}
        footer={
          <div className="flex w-full items-center justify-end gap-4">
            <Button
              color="minimal"
              className="rounded-[10px]"
              disabled={isCreating}
              onClick={() => router.push("/onboarding/getting-started")}>
              {t("back")}
            </Button>
            <Button
              type="submit"
              form="team-details-form"
              color="primary"
              className="rounded-[10px]"
              loading={isCreating}
              disabled={isCreating || !form.formState.isValid}>
              {t("continue")}
            </Button>
          </div>
        }>
        <form id="team-details-form" onSubmit={handleContinue} className="flex w-full flex-col gap-6 px-1">
          <div className="flex w-full flex-col gap-1.5">
            <TextField label={t("team_name")} {...form.register("name")} placeholder={t("your_team_name")} />
            {form.formState.errors.name && (
              <p className="text-error text-sm">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <TextField label={t("team_url")} {...form.register("slug")} placeholder="dre-labs" />
          </div>
        </form>
      </OnboardingCard>

      {/* Right column - Browser view preview */}
      <OnboardingOrganizationBrowserView
        name={watchedName || teamDetails.name || undefined}
        slug={previewSlug}
      />
    </OnboardingLayout>
  );
};
