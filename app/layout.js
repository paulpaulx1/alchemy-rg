// app/layout.js
import Link from 'next/link';
import './globals.css';
import GlobalNavigation from './components/GlobalNavigation';

export const metadata = {
  title: 'Raj Gupta | Artist',
  description: 'The artistic works of Raj Gupta',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="site-wrapper">
          <header className="site-header">
            <Link href="/" className="site-title">RAJ GUPTA</Link>
            <GlobalNavigation/>
          </header>
          <main className="site-main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}