import "../../test/setup";

import { beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider, useI18n } from "@/i18n/client";
import { getMessages } from "@/i18n/messages";
import LanguageSwitcher from "@/components/I18n/LanguageSwitcher";
import { given, then, when } from "@/test/bdd";

function SignOutLabel() {
  const { t } = useI18n();
  return <div data-testid="sign-out-label">{t("auth.sign_out")}</div>;
}

describe("LanguageSwitcher (BDD)", () => {
  beforeEach(() => {
    document.cookie = "locale=; Max-Age=0; Path=/";
  });

  it("Given zh-CN, When toggled, Then it switches to English instantly and writes cookie", async () => {
    let view: ReturnType<typeof render> | null = null;

    await given("the app is rendered in zh-CN", async () => {
      view = render(
        <I18nProvider locale="zh-CN" messages={getMessages("zh-CN")}>
          <LanguageSwitcher />
          <SignOutLabel />
        </I18nProvider>,
      );
    });

    await then("it shows zh-CN UI initially", async () => {
      if (!view) throw new Error("Expected rendered view");
      const switchButton = view.getByRole("button");
      expect(switchButton.textContent).toContain("中");
      expect(switchButton.getAttribute("aria-label")).toContain("English");
      expect(view.getByTestId("sign-out-label").textContent).toContain("退出");
    });

    await when("the user toggles language", async () => {
      if (!view) throw new Error("Expected rendered view");
      const user = userEvent.setup();
      await user.click(view.getByRole("button"));
    });

    await then("it updates UI without a full refresh and persists cookie", async () => {
      if (!view) throw new Error("Expected rendered view");
      const switchButton = view.getByRole("button");
      expect(switchButton.textContent).toContain("EN");
      expect(switchButton.getAttribute("aria-label")).toContain("Chinese");
      expect(view.getByTestId("sign-out-label").textContent).toContain(
        "Sign out",
      );
      expect(document.cookie).toContain("locale=en");
    });
  });
});
