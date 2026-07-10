"use client";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { TextAreaField } from "@calcom/ui/components/form/inputs/Input";
import { Label } from "@calcom/ui/components/form/inputs/Label";
import { TextField } from "@calcom/ui/components/form/inputs/TextField";
import ImageUploader from "@calcom/ui/components/image-uploader/ImageUploader";
import { showToast } from "@calcom/ui/components/toast";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import type { OrganizationProfileFormValues } from "./actions";
import { updateOrganizationProfile } from "./actions";

type OrganizationProfile = OrganizationProfileFormValues & {
  id: number;
};

export function OrganizationProfileForm({ organization }: { organization: OrganizationProfile }) {
  const { t } = useLocale();
  const [name, setName] = useState(organization.name);
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl);
  const [bio, setBio] = useState(organization.bio);
  const [bannerUrl, setBannerUrl] = useState(organization.bannerUrl);
  const [isPending, startTransition] = useTransition();

  const values = useMemo(
    () => ({
      name,
      logoUrl,
      bio,
      bannerUrl,
    }),
    [name, logoUrl, bio, bannerUrl]
  );

  const isDirty =
    values.name !== organization.name ||
    values.logoUrl !== organization.logoUrl ||
    values.bio !== organization.bio ||
    values.bannerUrl !== organization.bannerUrl;
  const isDisabled = isPending || !isDirty || !name.trim();
  const organizationLogo = logoUrl || getPlaceholderAvatar(null, name);

  const handleBannerUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1000000) {
      showToast(t("image_size_limit_exceed"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBannerUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(() => {
      void (async () => {
        const result = await updateOrganizationProfile(values);
        if (result.ok) {
          showToast(t("settings_updated_successfully"), "success");
          return;
        }

        showToast(result.message || t("error_updating_settings"), "error");
      })();
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="border-subtle border-x px-4 pt-8 pb-10 sm:px-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div
              aria-hidden
              className="h-16 w-16 shrink-0 rounded-full border border-subtle bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${organizationLogo}")` }}
            />
            <div>
              <Label>{t("organization_logo")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <ImageUploader
                  target={t("organization_logo")}
                  id="organization-logo-upload"
                  buttonMsg={t("upload_logo")}
                  handleAvatarChange={setLogoUrl}
                  imageSrc={organizationLogo}
                  triggerButtonColor="secondary"
                  testId="organization-logo"
                />
                {logoUrl && (
                  <Button color="minimal" type="button" onClick={() => setLogoUrl(null)}>
                    {t("remove")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <TextField
            name="organizationName"
            label={t("organization_name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <TextAreaField
            name="organizationBio"
            label={t("about")}
            value={bio ?? ""}
            onChange={(event) => setBio(event.target.value)}
            placeholder={t("organization_about_description")}
            rows={4}
          />

          <div>
            <Label>{t("organization_banner")}</Label>
            <div
              className="mt-2 flex aspect-[3/1] w-full items-center justify-center overflow-hidden rounded-lg border border-subtle bg-subtle bg-cover bg-center bg-no-repeat"
              style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}>
              {!bannerUrl && <span className="text-sm text-subtle">{t("no_banner_uploaded")}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button color="secondary" type="button" className="relative overflow-hidden">
                <input
                  aria-label={t("upload_banner")}
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleBannerUpload}
                />
                {t("upload_banner")}
              </Button>
              {bannerUrl && (
                <Button color="minimal" type="button" onClick={() => setBannerUrl(null)}>
                  {t("remove")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <SectionBottomActions align="end">
        <Button loading={isPending} disabled={isDisabled} color="primary" type="submit">
          {t("update")}
        </Button>
      </SectionBottomActions>
    </form>
  );
}
