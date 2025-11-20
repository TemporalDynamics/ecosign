import React from 'react';
import HeaderPublic from './HeaderPublic';
import FooterPublic from './FooterPublic';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <HeaderPublic />
      <main className="flex-grow">
        <div className="max-w-3xl mx-auto px-4 pt-24 pb-24">
          {children}
        </div>
      </main>
      <FooterPublic />
    </div>
  );
}
