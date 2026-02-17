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
  }
}

export function FacebookSDK() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) return;

    // Prevent double-initialization
    if (document.getElementById("facebook-jssdk")) return;

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId,
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

    return () => {
      const existingScript = document.getElementById("facebook-jssdk");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null;
}
