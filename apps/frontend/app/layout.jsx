/* eslint-disable react/prop-types */
import "../styles/globals.css";

export const metadata = {
  title: "CRMS ",
  description: "Change & Requirement Management System",
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body
        style={{ fontFamily: "Inter, sans-serif", backgroundColor: "#f3f4f6" }}
      >
        {children}
      </body>
    </html>
  );
}
