import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Giphy",
  description:
    "GIPHY is your top source for the best & newest GIFs & Animated Stickers online. Find everything from funny GIFs, reaction GIFs, unique GIFs and more.",
  installed: true,
  categories: ["other"],
  logo: "icon.svg",
  publisher: "DRE Cal",
  slug: "giphy",
  title: "Giphy",
  type: "giphy_other",
  url: "https://cal.dre.app/apps/giphy",
  variant: "other",
  extendsFeature: "EventType",
  email: "support@dre.app",
  dirName: "giphy",
  isOAuth: false,
} as AppMeta;

export default metadata;
