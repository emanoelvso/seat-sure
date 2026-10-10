import type { StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AltArrowLeftIcon, AltArrowRightIcon } from "@solar-icons/react/outline";
import { usePathname } from "@storybook/nextjs-vite/navigation.mock";
import { expect, userEvent, waitFor } from "storybook/test";
import { AccountSidebar } from "./account-sidebar";
import minimizedMeta, {
  ExpandedAtBoundary,
  MinimizedAtBoundary,
} from "./account-sidebar-minimized.stories";

function atWidth(width: number) {
  return {
    viewport: {
      options: {
        sidebar: {
          name: `${width}px`,
          styles: { width: `${width}px`, height: "900px" },
        },
      },
    },
  };
}

const meta = {
  ...minimizedMeta,
  title: "Features/Account/AccountSidebarToggle",
  parameters: { ...minimizedMeta.parameters, ...atWidth(1440) },
};
export default meta;
type Story = StoryObj<typeof meta>;
type Context = Parameters<NonNullable<Story["play"]>>[0];

async function checkToggle(context: Context, expanded: boolean) {
  const { canvas } = context;
  const label = expanded ? "Collapse sidebar" : "Expand sidebar";
  const toggle = canvas.getByRole("button", { name: label });
  const sidebar = canvas.getByRole("complementary");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("type", "button");
  await expect(toggle).toHaveAttribute("title", label);
  await expect(toggle).toHaveAttribute("aria-expanded", String(expanded));
  await expect(toggle).toHaveAttribute("aria-controls", sidebar.id);
  await expect(sidebar.id).not.toBe("");
  const rect = toggle.getBoundingClientRect();
  await expect(rect.width).toBe(32);
  await expect(rect.height).toBe(32);
  await expect(rect.right - sidebar.getBoundingClientRect().right).toBe(16);
  await expect(rect.top - sidebar.getBoundingClientRect().top).toBe(-16);
  const logo = canvas.getByRole("link", { name: "SeatSure" });
  await expect(rect.bottom).toBeLessThanOrEqual(logo.getBoundingClientRect().top);
  const icon = toggle.querySelector("svg")!;
  await expect(icon).toHaveAttribute("aria-hidden", "true");
  const Arrow = expanded ? AltArrowLeftIcon : AltArrowRightIcon;
  const reference = new DOMParser().parseFromString(
    renderToStaticMarkup(<Arrow size={18} />),
    "text/html",
  );
  await expect(
    Array.from(icon.querySelectorAll("path"), (path) => path.getAttribute("d")),
  ).toEqual(
    Array.from(reference.querySelectorAll("path"), (path) => path.getAttribute("d")),
  );
  return toggle;
}

export const CollapseAndExpandOnDesktop: Story = {
  play: async (context) => {
    await ExpandedAtBoundary.play!(context);
    const sidebar = context.canvas.getByRole("complementary");
    const toggle = await checkToggle(context, true);
    for (let index = 0; index < 2; index++) {
      await userEvent.click(toggle);
      await MinimizedAtBoundary.play!(context);
      await expect(await checkToggle(context, false)).toBe(toggle);
      await expect(context.canvas.getByRole("complementary")).toBe(sidebar);
      await userEvent.click(toggle);
      await ExpandedAtBoundary.play!(context);
      await expect(await checkToggle(context, true)).toBe(toggle);
    }
  },
};

export const ExpandAndCollapseOnSmallScreen: Story = {
  parameters: atWidth(375),
  play: async (context) => {
    await MinimizedAtBoundary.play!(context);
    const toggle = await checkToggle(context, false);
    await userEvent.click(toggle);
    await ExpandedAtBoundary.play!(context);
    await checkToggle(context, true);
    await userEvent.click(toggle);
    await MinimizedAtBoundary.play!(context);
    await checkToggle(context, false);
    await expect(document.documentElement.scrollWidth).toBe(window.innerWidth);
  },
};

export const KeepCollapsedWhenResizing: Story = {
  tags: ["!dev", "!autodocs"],
  play: async (context) => {
    const { page } = await import("vitest/browser");
    await userEvent.click(await checkToggle(context, true));
    for (const width of [1023, 1024, 375, 1440]) {
      await page.viewport(width, 900);
      await MinimizedAtBoundary.play!(context);
      await checkToggle(context, false);
    }
  },
};

export const KeepExpandedWhenResizing: Story = {
  tags: ["!dev", "!autodocs"],
  parameters: atWidth(375),
  play: async (context) => {
    const { page } = await import("vitest/browser");
    await userEvent.click(await checkToggle(context, false));
    for (const width of [1024, 1023, 1440, 375]) {
      await page.viewport(width, 900);
      await ExpandedAtBoundary.play!(context);
      await checkToggle(context, true);
    }
  },
};

export const KeyboardToggle: Story = {
  parameters: atWidth(1023),
  play: async (context) => {
    const home = context.canvas.getByRole("link", { name: "SeatSure" });
    home.focus();
    // The six account actions retain their order; the new control follows them.
    for (let index = 0; index < 7; index++) await userEvent.tab();
    const toggle = await checkToggle(context, false);
    await expect(toggle).toHaveFocus();
    await expect(getComputedStyle(toggle).outlineStyle).toBe("solid");
    await expect(getComputedStyle(toggle).outlineWidth).toBe("2px");
    await userEvent.keyboard("{Enter}");
    await ExpandedAtBoundary.play!(context);
    await expect(await checkToggle(context, true)).toBe(toggle);
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(" ");
    await MinimizedAtBoundary.play!(context);
    await expect(await checkToggle(context, false)).toBe(toggle);
    await expect(toggle).toHaveFocus();
  },
};

function VisitHarness() {
  const [route, setRoute] = useState("tickets");
  const [visit, setVisit] = useState(0);
  return (
    <div data-route={route}>
      <AccountSidebar key={visit} className="h-[832px]" />
      <button
        type="button"
        onClick={() => {
          usePathname.mockReturnValue("/account/settings");
          setRoute("settings");
        }}
      >
        Navigate to settings
      </button>
      <button type="button" onClick={() => setVisit((previous) => previous + 1)}>
        Start new visit
      </button>
    </div>
  );
}

export const KeepChoiceDuringAccountNavigation: Story = {
  render: () => <VisitHarness />,
  play: async (context) => {
    const original = usePathname.getMockImplementation()!;
    try {
      const sidebar = context.canvas.getByRole("complementary");
      await userEvent.click(await checkToggle(context, true));
      await userEvent.click(context.canvas.getByRole("button", { name: "Navigate to settings" }));
      const settings = context.canvas.getByRole("link", { name: "Setting" });
      await waitFor(() => expect(settings).toHaveAttribute("aria-current", "page"));
      await expect(context.canvas.getByRole("link", { name: "Tickets" })).not.toHaveAttribute("aria-current");
      await expect(context.canvas.getByRole("complementary")).toBe(sidebar);
      await expect(sidebar.getBoundingClientRect().width).toBe(96);
      await checkToggle(context, false);
    } finally {
      usePathname.mockImplementation(original);
    }
  },
};

export const FreshVisitUsesResponsiveDefault: Story = {
  render: () => <VisitHarness />,
  play: async (context) => {
    const sidebar = context.canvas.getByRole("complementary");
    await userEvent.click(await checkToggle(context, true));
    await MinimizedAtBoundary.play!(context);
    await userEvent.click(context.canvas.getByRole("button", { name: "Start new visit" }));
    await expect(context.canvas.getByRole("complementary")).not.toBe(sidebar);
    await ExpandedAtBoundary.play!(context);
    await checkToggle(context, true);
  },
};

export const DistinctControlledSidebars: Story = {
  render: () => (
    <div className="flex gap-8">
      <AccountSidebar className="h-[832px]" />
      <AccountSidebar className="h-[832px]" />
    </div>
  ),
  play: async ({ canvas }) => {
    const sidebars = canvas.getAllByRole("complementary");
    // This fixture renders two account shells on one page. Give their duplicate
    // landmarks distinct names, as a page embedding both shells would need to.
    for (const [index, sidebar] of sidebars.entries()) {
      sidebar.setAttribute("aria-label", `Account sidebar ${index + 1}`);
      sidebar.querySelector("nav")!.setAttribute("aria-label", `Account ${index + 1}`);
    }
    const toggles = canvas.getAllByRole("button", { name: "Collapse sidebar" });
    await expect(sidebars[0].id).not.toBe(sidebars[1].id);
    for (const [index, toggle] of toggles.entries()) {
      await expect(toggle).toHaveAttribute("aria-controls", sidebars[index].id);
    }
    await userEvent.click(toggles[0]);
    await expect(sidebars[0].getBoundingClientRect().width).toBe(96);
    await expect(sidebars[1].getBoundingClientRect().width).toBe(240);
  },
};

// This is server-produced HTML inserted without hydration. It verifies that
// CSS owns the first-paint default, including the control's accessible state.
export const ServerRenderedResponsiveDefault: Story = {
  tags: ["!dev", "!autodocs"],
  render: () => {
    const original = usePathname.getMockImplementation()!;
    let html: string;
    try {
      usePathname.mockReturnValue("/account/tickets");
      html = renderToStaticMarkup(<AccountSidebar className="h-[832px]" />);
    } finally {
      usePathname.mockImplementation(original);
    }
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  },
  play: async (context) => {
    const { page } = await import("vitest/browser");
    const sidebar = context.canvas.getByRole("complementary");
    for (const width of [1023, 1024, 1440, 375]) {
      await page.viewport(width, 900);
      await waitFor(() => expect(sidebar.getBoundingClientRect().width).toBe(width < 1024 ? 96 : 240));
      if (width < 1024) await MinimizedAtBoundary.play!(context);
      else await ExpandedAtBoundary.play!(context);
      await checkToggle(context, width >= 1024);
      await expect(context.canvas.queryByRole("button", {
        name: width < 1024 ? "Collapse sidebar" : "Expand sidebar",
      })).toBeNull();
    }
  },
};
