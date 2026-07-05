import { WEBAPP_URL, IS_CALCOM } from "./constants";

export const getCalcomUrl = () => {
  if (IS_CALCOM) {
    return new URL(WEBAPP_URL).hostname.endsWith("cal.eu") ? "https://cal.eu" : "https://cal.dre.app";
  }
  return WEBAPP_URL;
};
