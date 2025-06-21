import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../firebase';

type Task = {
  id: string;
  description: string;
  status: boolean;
};

const TodoList = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Ensure user document exists
  useEffect(() => {
    const ensureUserDocExists = async () => {
      if (!user) return;
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log('Creating user document for:', user.uid);
          await setDoc(userDocRef, {
            email: user.email,
            createdAt: new Date()
          });
          console.log('User document created successfully');
        } else {
          console.log('User document already exists');
        }
      } catch (err: any) {
        console.error('Error ensuring user document exists:', err);
        setError(`Error setting up user profile: ${err.message}.`);
      }
    };
    
    ensureUserDocExists();
  }, [user]);

  // Fetch tasks for the current user
  useEffect(() => {
    if (!user) return;

    console.log('Setting up tasks listener for user:', user.uid);

    // Reference to the tasks subcollection for this user
    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    
    const unsubscribe = onSnapshot(tasksRef, 
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && !snapshot.metadata.hasPendingWrites) {
            // Initial load or new task added
            setTasks(prevTasks => [...prevTasks, { id: change.doc.id, ...change.doc.data() } as Task]);
          }
          if (change.type === 'modified') {
            // Task updated
            setTasks(prevTasks =>
              prevTasks.map(task =>
                task.id === change.doc.id
                  ? { id: change.doc.id, ...change.doc.data() } as Task
                  : task
              )
            );
          }
          if (change.type === 'removed') {
            // Task deleted
            setTasks(prevTasks => prevTasks.filter(task => task.id !== change.doc.id));
          }
        });
        setError(null);
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        setError(`Error fetching tasks: ${err.message}.`);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Add a new task
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDescription.trim() || !user) return;

    setIsAddingTask(true);
    try {
      console.log('Adding task for user:', user.uid);
      
      // First ensure the user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('Creating user document before adding task');
        await setDoc(userDocRef, {
          email: user.email,
          createdAt: new Date()
        });
      }
      
      // Reference to the tasks subcollection for this user
      const tasksRef = collection(db, 'users', user.uid, 'tasks');
      
      const newTask = {
        description: newTaskDescription,
        status: false
      };
      
      console.log('New task data:', newTask);
      
      const docRef = await addDoc(tasksRef, newTask);
      console.log('Task added with ID:', docRef.id);
      
      // Clear form
      setNewTaskDescription('');
      setError(null);
    } catch (error: any) {
      console.error('Error adding task:', error);
      setError(`Error adding task: ${error.message}. This might be due to Firestore security rules. Please check your Firebase console and ensure rules allow authenticated users to write to their own documents.`);
    } finally {
      setIsAddingTask(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (id: string, currentStatus: boolean) => {
    if (!user) return;
    
    try {
      // Update local state immediately for better UX
      setTasks(prevTasks => 
        prevTasks.map(task =>
          task.id === id ? { ...task, status: !currentStatus } : task
        )
      );

      // Reference to the specific task document
      const taskRef = doc(db, 'users', user.uid, 'tasks', id);
      
      // Update in Firestore
      await updateDoc(taskRef, {
        status: !currentStatus
      });
    } catch (error: any) {
      // Revert local state on error
      setTasks(prevTasks => 
        prevTasks.map(task =>
          task.id === id ? { ...task, status: currentStatus } : task
        )
      );
      console.error('Error updating task:', error);
      setError(`Error updating task: ${error.message}.`);
    }
  };

  // Delete a task
  const deleteTask = async (id: string) => {
    if (!user) return;
    
    try {
      // Remove from local state immediately
      setTasks(prevTasks => prevTasks.filter(task => task.id !== id));

      // Reference to the specific task document
      const taskRef = doc(db, 'users', user.uid, 'tasks', id);
      await deleteDoc(taskRef);
    } catch (error: any) {
      // Restore the task in local state on error
      const taskToRestore = tasks.find(task => task.id === id);
      if (taskToRestore) {
        setTasks(prevTasks => [...prevTasks, taskToRestore]);
      }
      console.error('Error deleting task:', error);
      setError(`Error deleting task: ${error.message}.`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Your Tasks</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={addTask} className="space-y-4 mb-6 p-4 border rounded bg-gray-50">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
          <textarea
            id="description"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Enter task description"
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            required
          />
        </div>
        
        <button 
          type="submit"
          className={`w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${isAddingTask ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isAddingTask}
        >
          {isAddingTask ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      <ul className="space-y-4">
        {tasks.map((task) => (
          <li 
            key={task.id} 
            className="p-4 border rounded bg-white shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <p className={`${task.status ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                {task.description}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => updateTaskStatus(task.id, task.status)}
                  className={`px-2 py-1 rounded text-xs ${task.status ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                >
                  {task.status ? 'Completed' : 'In Progress'}
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="px-2 py-1 rounded text-xs bg-red-100 text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      {tasks.length === 0 && (
        <p className="text-center text-gray-500 mt-4">No tasks yet. Add one above!</p>
      )}
    </div>
  );
};

export default TodoList;