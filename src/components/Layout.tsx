import { type ReactNode } from 'react';
import { useAuth } from '../firebase';
import Navbar from './Navbar';
import Auth from './Auth';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  // If no user is logged in, only show the Auth component
  if (!user) {
    return <Auth />;
  }

  // If user is logged in, show the Navbar and the main app content
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;