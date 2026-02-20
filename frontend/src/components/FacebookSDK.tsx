"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { code: string; accessToken?: string };
          status: string;
        }) => void,
        options: Record<string, unknown>
      ) => void;
      getLoginStatus: (
        callback: (response: { status: string }) => void
      ) => void;
    };
    _fbSDKLoaded?: boolean;
  }
}

export function FacebookSDK() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) return;

    // If FB is already available (loaded in a prior render), skip
    if (window.FB) return;

    // If we already started loading, just make sure fbAsyncInit is set
    if (window._fbSDKLoaded) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: true,
          version: "v21.0",
        });
      };
      return;
    }

    // Mark that we've started loading — never remove the script
    window._fbSDKLoaded = true;

    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);

    // No cleanup — the SDK must persist across navigations
  }, []);

  return null;
}
