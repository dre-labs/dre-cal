export type CreateOnboardingTeamInput = {
  name: string;
  slug?: string;
};

export type CreateOnboardingTeamResult =
  | { status: "success"; teamId: number; slug: string }
  | { status: "error"; code: "unauthorized" | "missing_fields" | "slug_taken" | "unknown" };

export type CreateOnboardingTeam = (input: CreateOnboardingTeamInput) => Promise<CreateOnboardingTeamResult>;
