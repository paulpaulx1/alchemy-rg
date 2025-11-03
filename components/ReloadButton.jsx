// components/ReloadButton.js
"use client";
export default function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
    >
      Try Again
    </button>
  );
}
