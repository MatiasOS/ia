import { buildVerificationLinks } from "@openscan/utils";
import type { VerifyLinkParams } from "@openscan/utils";

export function injectVerificationLinks(data: unknown, params: VerifyLinkParams): unknown {
  if (data && typeof data === "object") {
    const links = buildVerificationLinks(params);
    if (links.length > 0) {
      return { ...(data as object), verificationLinks: links };
    }
  }
  return data;
}
