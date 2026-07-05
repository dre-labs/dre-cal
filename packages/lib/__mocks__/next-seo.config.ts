vi.mock("@calcom/lib/next-seo.config", () => ({
  default: {
    headSeo: {
      siteName: "DRE Cal",
    },
    defaultNextSeo: {
      title: "DRE Cal",
      description: "Scheduling infrastructure for everyone.",
    },
  },
  seoConfig: {
    headSeo: {
      siteName: "DRE Cal",
    },
  },
  buildSeoMeta: vi.fn().mockReturnValue({}),
}));
