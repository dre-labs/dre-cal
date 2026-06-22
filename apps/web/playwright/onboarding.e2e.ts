import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Onboarding", () => {
  // Teams created through the onboarding flow are not tracked by the users fixture,
  // so clean them up explicitly to avoid leaking rows between runs.
  const createdTeamSlugs: string[] = [];

  test.afterEach(async ({ users }) => {
    if (createdTeamSlugs.length) {
      await prisma.team.deleteMany({ where: { slug: { in: createdTeamSlugs } } });
      createdTeamSlugs.length = 0;
    }
    await users.deleteAll();
  });

  const testOnboarding = (identityProvider: IdentityProvider) => {
    test(`Onboarding Flow (v3) - ${identityProvider} user`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      await page.goto("/onboarding/getting-started");
      await page.waitForURL("/onboarding/getting-started");

      await test.step("step 1 - Plan Selection", async () => {
        await expect(page.getByTestId("onboarding-continue-btn")).toBeVisible();
        await page.getByTestId("onboarding-continue-btn").click();
        await page.waitForURL(/.*\/onboarding\/personal\/settings/);
      });

      await test.step("step 2 - Personal Settings", async () => {
        const nameInput = page.locator('input[name="name"]');
        await nameInput.fill("new user 2");
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

        const userComplete = await user.self();
        expect(userComplete.name).toBe("new user 2");
      });

      await test.step("step 3 - Calendar Connection", async () => {
        await expect(page.getByTestId("onboarding-continue-btn")).toBeVisible();
        await page.getByTestId("onboarding-continue-btn").click();
        await page.waitForURL("/event-types**");

        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });
  };

  testOnboarding(IdentityProvider.GOOGLE);
  testOnboarding(IdentityProvider.CAL);
  testOnboarding(IdentityProvider.SAML);
  testOnboarding(IdentityProvider.AZUREAD);

  test("Onboarding Flow (v3) - team plan creates a team without bouncing to getting-started", async ({
    page,
    users,
  }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    const teamName = `E2E Onboarding Team ${Date.now()}`;
    const teamSlug = `e2e-onboarding-team-${Date.now()}`;
    createdTeamSlugs.push(teamSlug);

    await test.step("step 1 - select the team plan", async () => {
      await page.getByTestId("onboarding-plan-team").click();
      await page.getByTestId("onboarding-continue-btn").click();
      // Regression guard: selecting "with my team" must land on the team step and must
      // NOT bounce back to /onboarding/getting-started (the original redirect bug).
      await page.waitForURL(/.*\/onboarding\/teams\/details/);
      await expect(page).not.toHaveURL(/.*\/onboarding\/getting-started/);
    });

    await test.step("step 2 - create the team and continue to personal settings", async () => {
      await page.locator('input[name="name"]').fill(teamName);
      await page.locator('input[name="slug"]').fill(teamSlug);
      await page.getByTestId("onboarding-continue-btn").click();
      await page.waitForURL(/.*\/onboarding\/personal\/settings/);

      const membership = await prisma.membership.findFirst({
        where: { userId: user.id, team: { slug: teamSlug } },
        select: { role: true, accepted: true },
      });
      expect(membership?.accepted).toBe(true);
      expect(membership?.role).toBe("OWNER");
    });

    await test.step("step 3 - finish personal steps and complete onboarding", async () => {
      await page.locator('input[name="name"]').fill("team owner");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

      await page.getByTestId("onboarding-continue-btn").click();
      await page.waitForURL("/event-types**");

      const userComplete = await user.self();
      expect(userComplete.completedOnboarding).toBe(true);
    });
  });
});
