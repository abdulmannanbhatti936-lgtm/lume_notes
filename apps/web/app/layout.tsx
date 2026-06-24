import { Geist, Geist_Mono } from "next/font/google";

// @ts-ignore
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@workspace/ui/components/sonner";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: {
    default: "Lume Notes - Abdul Mannan Bhatti",
    template: "%s | Lume Notes",
  },
  description:
    "Advanced note-taking for teams. Smart writing assistance, secure organization, and seamless collaboration. Built by Abdul Mannan Bhatti.",
  authors: [
    {
      name: "Abdul Mannan Bhatti",
      url: "https://github.com/abdulmannanbhatti936-lgtm",
    },
  ],
  creator: "Abdul Mannan Bhatti",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Lume Notes",
    description:
      "Advanced note-taking for teams. Smart writing assistance, secure organization, and seamless collaboration.",
    type: "website",
    url: "http://portfolio-two-black-48.vercel.app/",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="module">
          import * as pdfjsLib from
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
          window.pdfjsLib = pdfjsLib; pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
        </script>
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
