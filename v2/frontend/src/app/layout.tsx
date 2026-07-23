import "./globals.css";

export const metadata = {
  title: "Skylark Drones BI Agent",
  description: "Conversational business intelligence over monday.com boards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-50 min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
