import { describe, expect, it } from "vitest";
import { detectInAppBrowser } from "./in-app-browser";

const UA = {
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/489.0.0.40.108;FBBV/672117480;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.53.109;]",
  messengerIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/482.0.0.40.110;FBBV/668000000;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.1]",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 355.0.0.20.103 (iPhone15,3; iOS 18_1; en_NZ; en; scale=3.00; 1290x2796; 654000000)",
  whatsappAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 WhatsApp/2.24.22.79",
  safari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36",
};

describe("detectInAppBrowser", () => {
  it.each([
    ["facebookIos", "facebook"],
    ["facebookAndroid", "facebook"],
    ["messengerIos", "messenger"],
    ["instagram", "instagram"],
    ["whatsappAndroid", "whatsapp"],
  ] as const)("recognises %s as %s", (key, expected) => {
    expect(detectInAppBrowser(UA[key])).toBe(expected);
  });

  it("leaves real browsers alone", () => {
    expect(detectInAppBrowser(UA.safari)).toBeNull();
    expect(detectInAppBrowser(UA.chromeAndroid)).toBeNull();
    expect(detectInAppBrowser(undefined)).toBeNull();
  });
});
