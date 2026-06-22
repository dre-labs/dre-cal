import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { APP_NAME } from "@calcom/lib/constants";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeamDetailsView } from "~/onboarding/teams/details/team-details-view";
import { createOnboardingTeam } from "./actions";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("onboarding_team_details_title")}`,
    () => "",
    true,
    undefined,
    "/onboarding/teams/details"
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  // If the user already belongs to a team (e.g. they completed this step earlier or
  // signed up via invite), skip team creation and resume the personal onboarding steps.
  const hasTeamMembership = await MembershipRepository.hasAnyTeamMembershipByUserId({
    userId: session.user.id,
  });
  if (hasTeamMembership) {
    return redirect("/onboarding/personal/settings?fromTeamOnboarding=true");
  }

  const userEmail = session.user.email || "";

  return <TeamDetailsView userEmail={userEmail} createTeam={createOnboardingTeam} />;
};

export default ServerPage;
