// app/layout.js
import './globals.css';

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
            <a href="/" className="site-title">RAJ GUPTA</a>
          </header>
          <main className="site-main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}