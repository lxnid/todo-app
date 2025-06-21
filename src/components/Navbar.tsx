import { FaUser } from 'react-icons/fa';
import { useAuth } from '../firebase';

const Navbar = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-sky-500 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">TODO</div>
        
        {user && (
          <div className="flex items-center space-x-4">
            <span><FaUser /></span>
            <span className="text-sm">{user.email}</span>
            <button 
              onClick={signOut}
              className="bg-white text-sky-500 cursor-pointer opacity-90 hover:opacity-100 hover:scale-105 transition-all ease-out duration-300 px-3 py-1 rounded-lg text-xs font-medium"
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