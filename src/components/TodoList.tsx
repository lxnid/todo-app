import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
	collection,
	onSnapshot,
	addDoc,
	deleteDoc,
	doc,
	updateDoc,
	setDoc,
	getDoc,
} from "firebase/firestore";
import { useAuth } from "../firebase";
import {
	MdCheckBox,
	MdCheckBoxOutlineBlank,
	MdDelete,
	MdOutlineAdd,
	MdKeyboardArrowDown,
	MdKeyboardArrowUp,
} from "react-icons/md";

type Task = {
	id: string;
	description: string;
	status: boolean;
};

const TodoList = () => {
	const { user } = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [newTaskDescription, setNewTaskDescription] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isAddingTask, setIsAddingTask] = useState(false);
	const [showCompleted, setShowCompleted] = useState(true);

	// Ensure user document exists
	useEffect(() => {
		const ensureUserDocExists = async () => {
			if (!user) return;

			try {
				const userDocRef = doc(db, "users", user.uid);
				const userDoc = await getDoc(userDocRef);

				if (!userDoc.exists()) {
					console.log("Creating user document for:", user.uid);
					await setDoc(userDocRef, {
						email: user.email,
						createdAt: new Date(),
					});
					console.log("User document created successfully");
				} else {
					console.log("User document already exists");
				}
			} catch (err: any) {
				console.error("Error ensuring user document exists:", err);
				setError(`Error setting up user profile: ${err.message}.`);
			}
		};

		ensureUserDocExists();
	}, [user]);

	// Fetch tasks for the current user
	useEffect(() => {
		if (!user) return;

		console.log("Setting up tasks listener for user:", user.uid);

		// Reference to the tasks subcollection for this user
		const tasksRef = collection(db, "users", user.uid, "tasks");

		const unsubscribe = onSnapshot(
			tasksRef,
			(snapshot) => {
				// Always build the full list from the snapshot to avoid duplicates
				const updatedTasks: Task[] = snapshot.docs.map((docSnap) => ({
					id: docSnap.id,
					...(docSnap.data() as Omit<Task, "id">),
				}));
				setTasks(updatedTasks);
				setError(null);
			},
			(err) => {
				console.error("Error fetching tasks:", err);
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
			console.log("Adding task for user:", user.uid);

			// First ensure the user document exists
			const userDocRef = doc(db, "users", user.uid);
			const userDoc = await getDoc(userDocRef);

			if (!userDoc.exists()) {
				console.log("Creating user document before adding task");
				await setDoc(userDocRef, {
					email: user.email,
					createdAt: new Date(),
				});
			}

			// Reference to the tasks subcollection for this user
			const tasksRef = collection(db, "users", user.uid, "tasks");

			const newTask = {
				description: newTaskDescription,
				status: false,
			};

			console.log("New task data:", newTask);

			const docRef = await addDoc(tasksRef, newTask);
			console.log("Task added with ID:", docRef.id);

			// Clear form
			setNewTaskDescription("");
			setError(null);
		} catch (error: any) {
			console.error("Error adding task:", error);
			setError(
				`Error adding task: ${error.message}. This might be due to Firestore security rules. Please check your Firebase console and ensure rules allow authenticated users to write to their own documents.`
			);
		} finally {
			setIsAddingTask(false);
		}
	};

	// Update task status
	const updateTaskStatus = async (id: string, currentStatus: boolean) => {
		if (!user) return;

		try {
			// Update local state immediately for better UX
			setTasks((prevTasks) =>
				prevTasks.map((task) =>
					task.id === id ? { ...task, status: !currentStatus } : task
				)
			);

			// Reference to the specific task document
			const taskRef = doc(db, "users", user.uid, "tasks", id);

			// Update in Firestore
			await updateDoc(taskRef, {
				status: !currentStatus,
			});
		} catch (error: any) {
			// Revert local state on error
			setTasks((prevTasks) =>
				prevTasks.map((task) =>
					task.id === id ? { ...task, status: currentStatus } : task
				)
			);
			console.error("Error updating task:", error);
			setError(`Error updating task: ${error.message}.`);
		}
	};

	// Delete a task
	const deleteTask = async (id: string) => {
		if (!user) return;

		try {
			// Remove from local state immediately
			setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));

			// Reference to the specific task document
			const taskRef = doc(db, "users", user.uid, "tasks", id);
			await deleteDoc(taskRef);
		} catch (error: any) {
			// Restore the task in local state on error
			const taskToRestore = tasks.find((task) => task.id === id);
			if (taskToRestore) {
				setTasks((prevTasks) => [...prevTasks, taskToRestore]);
			}
			console.error("Error deleting task:", error);
			setError(`Error deleting task: ${error.message}.`);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			addTask(e as unknown as React.FormEvent);
		}
	};

	return (
		<div className="max-w-screen w-full flex-col mx-auto mt-8">
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					<p className="font-bold">Error:</p>
					<p>{error}</p>
				</div>
			)}

			<div className="mb-10">
				<form onSubmit={addTask} className="flex items-center gap-1.5">
					<div className="relative flex-grow">
						<input
							type="text"
							value={newTaskDescription}
							onChange={(e) =>
								setNewTaskDescription(e.target.value)
							}
							onKeyDown={handleKeyDown}
							placeholder="Enter new task"
							className="w-full px-6 py-4 pr-10 border border-gray-400 rounded-l-full rounded-r-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500 opacity-50 hover:opacity-100 transition-all ease-out duration-300"
							required
						/>
					</div>
					<button
						type="submit"
						className={`ml-2 cursor-pointer hover:scale-110 ease-out duration-500 bg-sky-500 text-white p-2 rounded-full hover:bg-sky-600 btn-press transition-all ${
							isAddingTask ? "opacity-50 cursor-not-allowed" : ""
						}`}
						disabled={isAddingTask}
					>
						<MdOutlineAdd />
					</button>
				</form>
			</div>

			<ul className="space-y-2 max-h-[55vh] overflow-auto w-full px-3">
				{/* filter incompleted tasks */}
				{tasks
					.filter((task) => !task.status)
					.map((task) => (
						<li
							key={task.id}
							className="p-5 border-b hover:border border-gray-300 cursor-pointer rounded-2xl bg-gray-100 hover:bg-sky-100 hover:scale-[102%] ease-in-out duration-400 shadow-sm flex justify-between items-center task-item transition-all"
						>
							<button
								onClick={() =>
									updateTaskStatus(task.id, task.status)
								}
								className="text-gray-500 hover:text-sky-500 focus:outline-none btn-press transition-all text-xl px-2"
							>
								{task.status ? (
									<MdCheckBox />
								) : (
									<MdCheckBoxOutlineBlank />
								)}
							</button>
							<div className="flex items-center flex-grow mr-2">
								<p
									className={`$${"{"}task.status ? "line-through text-gray-400" : "text-gray-700"}`}
								>
									{task.description}
								</p>
							</div>
							<button
								onClick={() => deleteTask(task.id)}
								className="text-gray-500 hover:text-red-500 focus:outline-none btn-press transition-all text-xl"
							>
								<MdDelete />
							</button>
						</li>
					))}
			</ul>

			{tasks.filter((task) => !task.status).length === 0 && (
				<p className="text-center text-gray-500 mt-4">
					No tasks yet. Add one above!
				</p>
			)}

			{/* completed tasks */}
			{tasks.filter((task) => task.status).length > 0 && (
				<div className="mt-8 w-full pt-4">
					<button
						onClick={() => setShowCompleted(!showCompleted)}
						className="w-full flex items-center cursor-pointer text-xl justify-between px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
					>
						<div className="flex items-center">
							<h2 className="text-lg font-semibold text-gray-600">
								Completed Tasks
							</h2>
							<span className="ml-2 text-sm text-gray-500">
								({tasks.filter((task) => task.status).length})
							</span>
						</div>
						{showCompleted ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
					</button>
					{showCompleted && (
						<ul className="space-y-2 my-1 max-h-[20vh] overflow-auto px-4 transition-all">
							{tasks
								.filter((task) => task.status)
								.map((task) => (
									<li
										key={task.id}
										className="p-5 border-b hover:border border-gray-300 cursor-pointer rounded-2xl bg-gray-100 hover:bg-sky-100 hover:scale-[102%] ease-in-out duration-400 shadow-sm flex justify-between items-center task-item transition-all opacity-60"
									>
										<button
											onClick={() =>
												updateTaskStatus(
													task.id,
													task.status
												)
											}
											className="text-gray-400 hover:text-sky-500 focus:outline-none btn-press transition-all text-xl px-2"
										>
											<MdCheckBox />
										</button>
										<div className="flex items-center flex-grow mr-2">
											<p className="line-through text-gray-400">
												{task.description}
											</p>
										</div>
										<button
											onClick={() => deleteTask(task.id)}
											className="text-gray-400 hover:text-red-500 focus:outline-none btn-press transition-all text-xl"
										>
											<MdDelete />
										</button>
									</li>
								))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
};

export default TodoList;
