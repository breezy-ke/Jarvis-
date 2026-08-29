export const metadata = {
  title: "J.A.R.V.I.S.",
  description: "Just A Rather Very Intelligent System — Brian's Personal AI",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#020b14",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="JARVIS" />
      </head>
      <body style={{ margin: 0, background: "#020b14" }}>{children}</body>
    </html>
  );
}
