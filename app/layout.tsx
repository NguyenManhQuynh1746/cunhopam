import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Header } from '@/components/layout/Header';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'cunhopam – Thư viện hợp âm guitar',
  description: 'Tra bài hát có hợp âm, đổi tông, xem sơ đồ ngón bấm, nghe thử và lưu playlist.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <AppProvider>
          <Header />
          <Navbar />
          <main className="wrap flex-1 py-8">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}

