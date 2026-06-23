import { MembershipRole } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { assertCanManageMember, canManageMember, getAssignableRoles } from "./teamMemberManagement";

const ACTOR_OWNER = 1;
const ACTOR_ADMIN = 2;

describe("getAssignableRoles", () => {
  it("lets owners assign any role", () => {
    expect(getAssignableRoles(MembershipRole.OWNER)).toEqual([
      MembershipRole.MEMBER,
      MembershipRole.ADMIN,
      MembershipRole.OWNER,
    ]);
  });

  it("does not let admins grant ownership", () => {
    expect(getAssignableRoles(MembershipRole.ADMIN)).toEqual([MembershipRole.MEMBER, MembershipRole.ADMIN]);
  });
});

describe("assertCanManageMember", () => {
  it("rejects acting on yourself", () => {
    const decision = assertCanManageMember({
      actorRole: MembershipRole.OWNER,
      actorUserId: ACTOR_OWNER,
      target: { userId: ACTOR_OWNER, role: MembershipRole.OWNER },
      ownerCount: 2,
      intent: { type: "remove" },
    });
    expect(decision.allowed).toBe(false);
  });

  it("lets an admin demote and remove a member", () => {
    const target = { userId: 9, role: MembershipRole.MEMBER };
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.ADMIN,
        actorUserId: ACTOR_ADMIN,
        target,
        ownerCount: 1,
        intent: { type: "setRole", newRole: MembershipRole.MEMBER },
      }).allowed
    ).toBe(true);
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.ADMIN,
        actorUserId: ACTOR_ADMIN,
        target,
        ownerCount: 1,
        intent: { type: "remove" },
      }).allowed
    ).toBe(true);
  });

  it("lets an admin manage another admin (product decision)", () => {
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.ADMIN,
        actorUserId: ACTOR_ADMIN,
        target: { userId: 9, role: MembershipRole.ADMIN },
        ownerCount: 1,
        intent: { type: "remove" },
      }).allowed
    ).toBe(true);
  });

  it("forbids an admin from touching an owner", () => {
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.ADMIN,
        actorUserId: ACTOR_ADMIN,
        target: { userId: 9, role: MembershipRole.OWNER },
        ownerCount: 2,
        intent: { type: "remove" },
      }).allowed
    ).toBe(false);
  });

  it("forbids an admin from granting ownership", () => {
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.ADMIN,
        actorUserId: ACTOR_ADMIN,
        target: { userId: 9, role: MembershipRole.MEMBER },
        ownerCount: 1,
        intent: { type: "setRole", newRole: MembershipRole.OWNER },
      }).allowed
    ).toBe(false);
  });

  it("lets an owner promote a member to owner", () => {
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.OWNER,
        actorUserId: ACTOR_OWNER,
        target: { userId: 9, role: MembershipRole.MEMBER },
        ownerCount: 1,
        intent: { type: "setRole", newRole: MembershipRole.OWNER },
      }).allowed
    ).toBe(true);
  });

  it("forbids demoting the last owner", () => {
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.OWNER,
        actorUserId: ACTOR_OWNER,
        target: { userId: 9, role: MembershipRole.OWNER },
        ownerCount: 1,
        intent: { type: "setRole", newRole: MembershipRole.ADMIN },
      }).allowed
    ).toBe(false);
  });

  it("forbids removing the last owner", () => {
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.OWNER,
        actorUserId: ACTOR_OWNER,
        target: { userId: 9, role: MembershipRole.OWNER },
        ownerCount: 1,
        intent: { type: "remove" },
      }).allowed
    ).toBe(false);
  });

  it("lets an owner demote a co-owner when another owner remains", () => {
    expect(
      assertCanManageMember({
        actorRole: MembershipRole.OWNER,
        actorUserId: ACTOR_OWNER,
        target: { userId: 9, role: MembershipRole.OWNER },
        ownerCount: 2,
        intent: { type: "setRole", newRole: MembershipRole.ADMIN },
      }).allowed
    ).toBe(true);
  });
});

describe("canManageMember", () => {
  it("hides controls for your own row", () => {
    expect(
      canManageMember({
        actorRole: MembershipRole.OWNER,
        actorUserId: ACTOR_OWNER,
        target: { userId: ACTOR_OWNER, role: MembershipRole.OWNER },
        ownerCount: 2,
      })
    ).toBe(false);
  });

  it("hides owner rows from admins", () => {
    expect(
      canManageMember({
        actorRole: MembershipRole.ADMIN,
        actorUserId: ACTOR_ADMIN,
        target: { userId: 9, role: MembershipRole.OWNER },
        ownerCount: 2,
      })
    ).toBe(false);
  });

  it("hides the last owner even from another owner", () => {
    expect(
      canManageMember({
        actorRole: MembershipRole.OWNER,
        actorUserId: ACTOR_OWNER,
        target: { userId: 9, role: MembershipRole.OWNER },
        ownerCount: 1,
      })
    ).toBe(false);
  });

  it("shows member/admin rows to admins", () => {
    expect(
      canManageMember({
        actorRole: MembershipRole.ADMIN,
        actorUserId: ACTOR_ADMIN,
        target: { userId: 9, role: MembershipRole.MEMBER },
        ownerCount: 1,
      })
    ).toBe(true);
  });
});
