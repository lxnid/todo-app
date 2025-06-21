import { useAuth } from '../firebase';

const Navbar = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">Todo App</div>
        
        {user && (
          <div className="flex items-center space-x-4">
            <span className="hidden md:inline">{user.email}</span>
            <button 
              onClick={signOut}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;