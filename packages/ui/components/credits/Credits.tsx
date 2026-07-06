"use client";

import process from "node:process";
import { APP_NAME, CALCOM_VERSION, IS_CALCOM, IS_SELF_HOSTED } from "@calcom/lib/constants";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const vercelCommitHash: string | undefined = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
let commitHash = "";
if (vercelCommitHash) {
  commitHash = `-${vercelCommitHash.slice(0, 7)}`;
}

let hostedVersionSuffix = "sh";
if (!IS_SELF_HOSTED) {
  hostedVersionSuffix = "h";
}

const CalComVersion: string = `v.${CALCOM_VERSION}-${hostedVersionSuffix}`;

function CommitHash(): ReactNode {
  if (!vercelCommitHash || !IS_CALCOM) return commitHash;

  return (
    <Link
      href={`https://cal.dre.app/releases/${vercelCommitHash}`}
      target="_blank"
      className="hover:underline">
      {commitHash}
    </Link>
  );
}

export default function Credits(): ReactElement {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <small className="mx-3 mt-1 mb-2 hidden text-[0.5rem] text-default opacity-50 lg:block">
      &copy; {new Date().getFullYear()}{" "}
      <Link href="https://cal.dre.app/credits" target="_blank" className="hover:underline">
        {APP_NAME}
      </Link>{" "}
      {hasMounted && (
        <>
          <Link href="https://cal.dre.app/releases" target="_blank" className="hover:underline">
            {CalComVersion}
          </Link>
          <CommitHash />
        </>
      )}
    </small>
  );
}
