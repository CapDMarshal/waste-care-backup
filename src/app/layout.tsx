import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/components";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { AsyncStyleLoader } from "@/components/shared/AsyncStyleLoader";
import "./globals.css";

export const metadata: Metadata = {
  title: "WasteCare - Smart Waste Management",
  description: "Smart waste management application for reporting and tracking waste issues in your community",
  keywords: ["waste management", "environment", "community", "reporting", "sustainability"],
  authors: [{ name: "WasteCare Team" }],
  creator: "WasteCare Team",
  publisher: "WasteCare Team",
  applicationName: "WasteCare Backup",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WasteCare Backup",
    startupImage: "/icons/apple-touch-startup-image.png",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logos/wastecare-no-text.png", sizes: "16x16", type: "image/png" },
      { url: "/logos/wastecare-no-text.png", sizes: "32x32", type: "image/png" },
      { url: "/logos/wastecare-no-text.png", sizes: "192x192", type: "image/png" },
      { url: "/logos/wastecare-no-text.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logos/wastecare-no-text.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/logos/wastecare-no-text.png",
        color: "#16a34a",
      },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "WasteCare Backup",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#16a34a",
    "msapplication-config": "/browserconfig.xml",
    "google-site-verification": "Xc0I0NlFkYLtm1os5ld86ki1HSGsZlIQhJWWu3DgXa8",
  },
  openGraph: {
    type: "website",
    title: "WasteCare - Smart Waste Management",
    description: "Smart waste management application for reporting and tracking waste issues in your community",
    siteName: "WasteCare",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "WasteCare - Smart Waste Management",
    description: "Smart waste management application for reporting and tracking waste issues in your community",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.maptiler.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="https://api.maptiler.com" />
        
        {/* Use system fonts with similar characteristics to CircularStd */}
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        `}} />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (typeof window === 'undefined') return;

                var RETRY_KEY = '__wastecare_zombie_retry__';
                var MAX_RETRY = 2;

                var getRetryCount = function () {
                  try {
                    return Number(sessionStorage.getItem(RETRY_KEY) || '0');
                  } catch (e) {
                    return 0;
                  }
                };

                var setRetryCount = function (count) {
                  try {
                    sessionStorage.setItem(RETRY_KEY, String(count));
                  } catch (e) {
                  }
                };

                var hardReload = function (reason) {
                  try {
                    if (window.__WASTECARE_RELOAD_LOCK__) return;
                    window.__WASTECARE_RELOAD_LOCK__ = true;
                    var nextCount = getRetryCount() + 1;
                    setRetryCount(nextCount);
                    if (nextCount > MAX_RETRY) {
                      return;
                    }
                    window.location.reload();
                  } catch (e) {
                    window.location.reload();
                  }
                };

                var checkReactMounted = function (reason) {
                  if (window.location.pathname.indexOf('/dashboard') !== 0) return;

                  window.setTimeout(function () {
                    if (!window.__WASTECARE_REACT_MOUNTED__) {
                      hardReload(reason + ':react-not-mounted');
                    }
                  }, 1500);
                };

                // Disable BFCache eligibility in many browsers.
                window.addEventListener('unload', function () {});

                checkReactMounted('initial');

                window.addEventListener('pageshow', function (event) {
                  if (event.persisted && window.location.pathname.indexOf('/dashboard') === 0) {
                    hardReload('pageshow:persisted');
                  }
                  checkReactMounted('pageshow');
                });

                window.addEventListener('popstate', function () {
                  if (window.location.pathname.indexOf('/dashboard') === 0) {
                    hardReload('popstate:dashboard');
                  }
                  checkReactMounted('popstate');
                });
              })();
            `,
          }}
        />
        
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AsyncStyleLoader />
        <AuthProvider>
          <ClientProviders>
            <Suspense fallback={<div>Memuat halaman...</div>}>
              {children}
            </Suspense>
          </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
