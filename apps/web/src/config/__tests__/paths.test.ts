import { describe, expect, it } from "vitest";
import { paths } from "@/config/paths";

describe("paths.home", () => {
  it("links to the home page", () => {
    expect(paths.home.getHref()).toBe("/");
  });
});

describe("paths.events", () => {
  it("links to the unfiltered events list without a type", () => {
    expect(paths.events.getHref()).toBe("/events");
  });

  it.each([
    ["SHOW", "/events?type=SHOW"],
    ["CONCERT", "/events?type=CONCERT"],
    ["SPORT", "/events?type=SPORT"],
    ["FESTIVAL", "/events?type=FESTIVAL"],
  ] as const)("links %s to %s", (type, href) => {
    expect(paths.events.getHref(type)).toBe(href);
  });
});

describe("paths.eventTickets", () => {
  it("links to the tickets page of the event", () => {
    expect(paths.eventTickets.getHref("e-1")).toBe("/events/e-1/tickets");
  });

  it("encodes a slash in the event id", () => {
    expect(paths.eventTickets.getHref("e/1")).toBe("/events/e%2F1/tickets");
  });

  it("encodes a space in the event id", () => {
    expect(paths.eventTickets.getHref("e 1")).toBe("/events/e%201/tickets");
  });
});

describe("paths.eventSeats", () => {
  it("links to the seat page of the ticket type with the quantity, encoding both ids (SEAT-12)", () => {
    expect(paths.eventSeats.getHref("e 1", "t/2", 3)).toBe(
      "/events/e%201/tickets/t%2F2?quantity=3",
    );
  });

  it("builds its own URL from another event, ticket type and quantity (SEAT-12)", () => {
    expect(paths.eventSeats.getHref("evt-9", "tt-4", 1)).toBe(
      "/events/evt-9/tickets/tt-4?quantity=1",
    );
  });
});

describe("paths.artist", () => {
  it("links to the artist page of the slug", () => {
    expect(paths.artist.getHref("the-weeknd")).toBe("/artists/the-weeknd");
  });

  it("encodes a slash in the slug", () => {
    expect(paths.artist.getHref("ac/dc")).toBe("/artists/ac%2Fdc");
  });
});

describe("paths.login", () => {
  it("links to the login page without a redirectTo", () => {
    expect(paths.login.getHref()).toBe("/login");
  });

  it("links to the login page with an encoded redirectTo", () => {
    expect(paths.login.getHref("/events/1/tickets?quantity=2")).toBe(
      "/login?redirectTo=%2Fevents%2F1%2Ftickets%3Fquantity%3D2",
    );
  });
});

describe("paths.signup", () => {
  it("links to the signup page without a redirectTo", () => {
    expect(paths.signup.getHref()).toBe("/signup");
  });

  it("links to the signup page with an encoded redirectTo", () => {
    expect(paths.signup.getHref("/events/1/tickets?quantity=2")).toBe(
      "/signup?redirectTo=%2Fevents%2F1%2Ftickets%3Fquantity%3D2",
    );
  });
});

describe("paths.verifyEmail", () => {
  it("links to the verify-email page", () => {
    expect(paths.verifyEmail.getHref()).toBe("/verify-email");
  });
});

describe("paths.forgotPassword", () => {
  it("links to the forgot-password page", () => {
    expect(paths.forgotPassword.getHref()).toBe("/forgot-password");
  });
});

describe("paths.forgotPasswordVerify", () => {
  it("links to the forgot-password verify page", () => {
    expect(paths.forgotPasswordVerify.getHref()).toBe(
      "/forgot-password/verify",
    );
  });
});

describe("paths.resetPassword", () => {
  it("links to the reset-password page", () => {
    expect(paths.resetPassword.getHref()).toBe("/reset-password");
  });
});

describe("paths.about", () => {
  it("links to the about page (NAV-01)", () => {
    expect(paths.about.getHref()).toBe("/about");
  });

  it("links to the contact section of the about page (NAV-01)", () => {
    expect(paths.about.getHref("contact")).toBe("/about#contact");
  });
});

describe("paths.terms", () => {
  it("links to the terms page (NAV-01)", () => {
    expect(paths.terms.getHref()).toBe("/terms");
  });
});

describe("paths.session", () => {
  it("links to the session API route", () => {
    expect(paths.session.getHref()).toBe("/api/auth/session");
  });
});

describe("paths.checkoutStart", () => {
  it("builds the checkout start URL, encoding ids and seats while preserving pick order (PAY-01)", () => {
    expect(
      paths.checkoutStart.getHref("e 1", "t/2", ["b-2", "a/1", "c-3"]),
    ).toBe("/events/e%201/tickets/t%2F2/checkout?seats=b-2,a%2F1,c-3");
  });
});

describe("paths.checkout", () => {
  it("links to the checkout order page, encoding the order id", () => {
    expect(paths.checkout.getHref("order/1")).toBe("/checkout/order%2F1");
  });
});

describe("paths.checkoutSuccess", () => {
  it("links to the checkout success page, encoding the order id", () => {
    expect(paths.checkoutSuccess.getHref("order/1")).toBe(
      "/checkout/order%2F1/success",
    );
  });
});

describe("paths.sessionRefresh", () => {
  it("links to the refresh route with an encoded redirectTo (PAY-16, PAY-48)", () => {
    expect(paths.sessionRefresh.getHref("/checkout/o1")).toBe(
      "/api/auth/refresh?redirectTo=%2Fcheckout%2Fo1",
    );
  });
});

describe("paths.accountTickets", () => {
  it("links to the account tickets list (ACCT-02)", () => {
    expect(paths.accountTickets.getHref()).toBe("/account/tickets");
  });
});

describe("paths.accountTicket", () => {
  it("links to the order detail page (ORDLIST-03)", () => {
    expect(paths.accountTicket.getHref("order-1")).toBe(
      "/account/tickets/order-1",
    );
  });

  it("encodes a slash in the order id (ORDLIST-03)", () => {
    expect(paths.accountTicket.getHref("a/b")).toBe("/account/tickets/a%2Fb");
  });
});

describe("paths.accountPersonalInfo", () => {
  it("links to the account personal info page (PROFILE-02, PROFILE-09)", () => {
    expect(paths.accountPersonalInfo.getHref()).toBe("/account/personal-info");
  });
});

describe("paths.accountPayment", () => {
  it("links to the account payment page (CARD-02, CARD-12)", () => {
    expect(paths.accountPayment.getHref()).toBe("/account/payment");
  });
});
