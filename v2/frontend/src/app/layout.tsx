import "./globals.css";

export const metadata = {
  title: "Skylark Drones BI Agent",
  description: "Conversational business intelligence over monday.com boards",
};

// Applies the persisted theme before hydration so there's no flash of the
// wrong theme. Defaults to light (brand-matched look).
const themeInit = `(function(){try{var t=localStorage.getItem("bi-agent-theme");if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="bg-slate-50 text-brand-navy dark:bg-slate-950 dark:text-slate-50 min-h-screen selection:bg-brand-teal selection:text-white transition-colors">
        {children}
      </body>
    </html>
  );
}
