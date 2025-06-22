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
	MdCalendarToday,
	MdClose,
	MdEdit,
	MdSave,
} from "react-icons/md";

type Task = {
	id: string;
	description: string;
	status: boolean;
	createdAt: Date | null;
	dueDate: Date | null;
	modifiedAt: Date | null;
};

type SortOption = "createdAsc" | "createdDesc" | "dueAsc" | "dueDesc";

const TodoList = () => {
	const { user } = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [newTaskDescription, setNewTaskDescription] = useState("");
	const [newTaskDueDate, setNewTaskDueDate] = useState<string>("");
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isAddingTask, setIsAddingTask] = useState(false);
	const [showCompleted, setShowCompleted] = useState(true);
	const [sortOption, setSortOption] = useState<SortOption>("createdDesc");
	const [includeTime, setIncludeTime] = useState(false);
	const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [editingTaskDescription, setEditingTaskDescription] = useState("");

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
				const updatedTasks: Task[] = snapshot.docs.map((docSnap) => {
					const data = docSnap.data();
					return {
						id: docSnap.id,
						description: data.description,
						status: data.status,
						createdAt: data.createdAt
							? new Date(data.createdAt.toDate())
							: null,
						dueDate: data.dueDate
							? new Date(data.dueDate.toDate())
							: null,
						modifiedAt: data.modifiedAt
							? new Date(data.modifiedAt.toDate())
							: null,
					};
				});
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

			// Create a due date with or without time component
			let dueDate = null;
			if (newTaskDueDate) {
				if (includeTime) {
					dueDate = new Date(newTaskDueDate);
				} else {
					// Create date without time component (set to start of day)
					dueDate = new Date(
						newTaskDueDate.split("T")[0] + "T00:00:00"
					);
				}
			}

			const newTask = {
				description: newTaskDescription,
				status: false,
				createdAt: new Date(),
				dueDate: dueDate,
			};

			console.log("New task data:", newTask);

			const docRef = await addDoc(tasksRef, newTask);
			console.log("Task added with ID:", docRef.id);

			// Clear form
			setNewTaskDescription("");
			setNewTaskDueDate("");
			setShowDatePicker(false);
			setError(null);
		} catch (error: any) {
			console.error("Error adding task:", error);
			setError(`Error adding task: ${error.message}.`);
		} finally {
			setIsAddingTask(false);
		}
	};

	// Update task description
	const updateTaskDescription = async (id: string) => {
		if (!user || !editingTaskDescription.trim()) return;

		try {
			// Reference to the specific task document
			const taskRef = doc(db, "users", user.uid, "tasks", id);

			// Update in Firestore
			await updateDoc(taskRef, {
				description: editingTaskDescription.trim(),
				modifiedAt: new Date(),
			});

			// Clear editing state
			setEditingTaskId(null);
			setEditingTaskDescription("");
		} catch (error: any) {
			console.error("Error updating task description:", error);
			setError(`Error updating task: ${error.message}.`);
		}
	};

	// Start editing a task
	const startEditing = (task: Task) => {
		setEditingTaskId(task.id);
		setEditingTaskDescription(task.description);
	};

	// Cancel editing
	const cancelEditing = () => {
		setEditingTaskId(null);
		setEditingTaskDescription("");
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

	// Sort tasks based on the selected sort option
	const sortTasks = (tasksToSort: Task[]): Task[] => {
		const sortedTasks = [...tasksToSort];

		switch (sortOption) {
			case "createdAsc":
				return sortedTasks.sort((a, b) => {
					if (!a.createdAt) return 1;
					if (!b.createdAt) return -1;
					return a.createdAt.getTime() - b.createdAt.getTime();
				});
			case "createdDesc":
				return sortedTasks.sort((a, b) => {
					if (!a.createdAt) return 1;
					if (!b.createdAt) return -1;
					return b.createdAt.getTime() - a.createdAt.getTime();
				});
			case "dueAsc":
				return sortedTasks.sort((a, b) => {
					if (!a.dueDate) return 1;
					if (!b.dueDate) return -1;
					return a.dueDate.getTime() - b.dueDate.getTime();
				});
			case "dueDesc":
				return sortedTasks.sort((a, b) => {
					if (!a.dueDate) return 1;
					if (!b.dueDate) return -1;
					return b.dueDate.getTime() - a.dueDate.getTime();
				});
			default:
				return sortedTasks;
		}
	};

	// Format date for display
	const formatDate = (
		date: Date | null,
		includeTime: boolean = true
	): string => {
		if (!date) return "No date";

		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "short",
			day: "numeric",
		};

		if (includeTime) {
			options.hour = "2-digit";
			options.minute = "2-digit";
		}

		return date.toLocaleDateString("en-US", options);
	};

	// Toggle date picker visibility
	const toggleDatePicker = () => {
		setShowDatePicker(!showDatePicker);
	};

	// Clear due date
	const clearDueDate = (e: React.MouseEvent) => {
		e.stopPropagation();
		setNewTaskDueDate("");
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
				<form onSubmit={addTask} className="flex gap-2">
					<div className="relative flex-grow">
						<input
							type="text"
							value={newTaskDescription}
							onChange={(e) =>
								setNewTaskDescription(e.target.value)
							}
							onKeyDown={handleKeyDown}
							placeholder="Enter new task"
							className="w-full px-6 py-4 pr-10 border border-gray-400 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500 opacity-50 hover:opacity-100 transition-all ease-out duration-300"
							required
						/>
					</div>
					<div className="flex items-center gap-2">
						<div className="relative">
							<button
								type="button"
								onClick={toggleDatePicker}
								className="flex items-center justify-center p-2 bg-gray-200 hover:bg-gray-300 hover:scale-110 rounded-full transition-all ease-out duration-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
							>
								<MdCalendarToday className="text-gray-700" />
								{newTaskDueDate && (
									<span className="ml-2 text-xs text-gray-700">
										{newTaskDueDate.split("T")[0]}
									</span>
								)}
							</button>

							{newTaskDueDate && (
								<button
									type="button"
									onClick={clearDueDate}
									className="absolute -right-2 -top-2 bg-red-100 hover:bg-red-200 rounded-full p-1 text-xs"
								>
									<MdClose className="text-red-500" />
								</button>
							)}

							{showDatePicker && (
								<div className="absolute z-10 mt-1 p-3 bg-white border border-gray-300 rounded-lg shadow-lg">
									<div className="mb-2">
										<input
											type={
												includeTime
													? "datetime-local"
													: "date"
											}
											value={newTaskDueDate}
											onChange={(e) =>
												setNewTaskDueDate(
													e.target.value
												)
											}
											min={
												new Date()
													.toISOString()
													.split(".")[0]
											}
											className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
										/>
									</div>
									<div className="flex items-center mb-2">
										<input
											id="includeTime"
											type="checkbox"
											checked={includeTime}
											onChange={() =>
												setIncludeTime(!includeTime)
											}
											className="mr-2"
										/>
										<label
											htmlFor="includeTime"
											className="text-xs text-gray-600"
										>
											Add time
										</label>
									</div>
									<button
										type="button"
										onClick={toggleDatePicker}
										className="w-full py-1 text-xs bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
									>
										Apply
									</button>
								</div>
							)}
						</div>
						<button
							type="submit"
							className={`cursor-pointer hover:scale-110 ease-out duration-500 bg-sky-500 text-white p-2 rounded-full hover:bg-sky-600 btn-press transition-all ${
								isAddingTask
									? "opacity-50 cursor-not-allowed"
									: ""
							}`}
							disabled={isAddingTask}
						>
							<MdOutlineAdd />
						</button>
					</div>
				</form>
			</div>

			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold text-gray-700">
					Tasks
					<span className="ml-2 text-sm text-gray-500">
						({tasks.filter((task) => !task.status).length})
					</span>
				</h2>
				<div className="flex items-center">
					<label
						htmlFor="sortOption"
						className="mr-2 text-sm text-gray-600"
					>
						Sort by:
					</label>
					<select
						id="sortOption"
						value={sortOption}
						onChange={(e) =>
							setSortOption(e.target.value as SortOption)
						}
						className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
					>
						<option value="createdDesc">Newest first</option>
						<option value="createdAsc">Oldest first</option>
						<option value="dueAsc">Due date (earliest)</option>
						<option value="dueDesc">Due date (latest)</option>
					</select>
				</div>
			</div>

      <ul className={`space-y-2 ${showCompleted ? "max-h-[25vh] overflow-auto px-3" : "max-h-[60vh] overflow-auto px-3"}`}>
				{sortTasks(tasks)
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
							<div className="flex flex-col flex-grow mr-2">
								{editingTaskId === task.id ? (
									<div className="flex gap-2">
										<input
											type="text"
											value={editingTaskDescription}
											onChange={(e) =>
												setEditingTaskDescription(
													e.target.value
												)
											}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													updateTaskDescription(
														task.id
													);
												}
											}}
											className="flex-grow px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
											autoFocus
										/>
										<button
											onClick={() =>
												updateTaskDescription(task.id)
											}
											className="text-sky-500 hover:text-sky-600 focus:outline-none btn-press transition-all text-xl"
										>
											<MdSave />
										</button>
										<button
											onClick={cancelEditing}
											className="text-gray-500 hover:text-gray-600 focus:outline-none btn-press transition-all text-xl"
										>
											<MdClose />
										</button>
									</div>
								) : (
									<p
										className={`${
											task.status
												? "line-through text-gray-400"
												: "text-gray-700"
										}`}
									>
										{task.description}
									</p>
								)}
								{task.dueDate && (
									<p
										className={`text-xs mt-1 ${
											task.status
												? "text-gray-400"
												: new Date() > task.dueDate
												? "text-red-500"
												: "text-sky-600"
										}`}
									>
										Due: {formatDate(task.dueDate, false)}
									</p>
								)}
								<div className="flex gap-5">
									{task.createdAt && (
										<p className="text-xs text-gray-400 mt-1">
											Created:{" "}
											{formatDate(task.createdAt)}
										</p>
									)}
									{task.modifiedAt && (
										<p className="text-xs text-gray-400 mt-1">
											Modified:{" "}
											{formatDate(task.modifiedAt)}
										</p>
									)}
								</div>
							</div>
							<div className="flex gap-2">
								{!task.status && !editingTaskId && (
									<button
										onClick={() => startEditing(task)}
										className="text-gray-500 hover:text-sky-500 focus:outline-none btn-press transition-all text-xl"
									>
										<MdEdit />
									</button>
								)}
								<button
									onClick={() => deleteTask(task.id)}
									className="text-gray-500 hover:text-red-500 focus:outline-none btn-press transition-all text-xl"
								>
									<MdDelete />
								</button>
							</div>
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
						className="w-full flex items-center cursor-pointer text-xl justify-between px-0 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
					>
						<div className="flex items-center">
							<h2 className="text-lg font-semibold text-gray-600">
								Completed Tasks
							</h2>
							<span className="ml-2 text-sm text-gray-500">
								({tasks.filter((task) => task.status).length})
							</span>
						</div>
						{showCompleted ? (
							<MdKeyboardArrowUp />
						) : (
							<MdKeyboardArrowDown />
						)}
					</button>
					{showCompleted && (
						<ul className="space-y-2 my-1 max-h-[35vh] overflow-auto px-2 transition-all">
							{sortTasks(tasks)
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
											className="text-gray-500 hover:text-sky-500 focus:outline-none btn-press transition-all text-xl px-2"
										>
											{task.status ? (
												<MdCheckBox />
											) : (
												<MdCheckBoxOutlineBlank />
											)}
										</button>
										<div className="flex flex-col flex-grow mr-2">
											<p
												className={`${
													task.status
														? "line-through text-gray-400"
														: "text-gray-700"
												}`}
											>
												{task.description}
											</p>
											{task.dueDate && (
												<p
													className={`text-xs mt-1 ${
														task.status
															? "text-gray-400"
															: new Date() >
															  task.dueDate
															? "text-red-500"
															: "text-sky-600"
													}`}
												>
													Due:{" "}
													{formatDate(
														task.dueDate,
														false
													)}
												</p>
											)}
											<div className="flex gap-5">
												{task.createdAt && (
													<p className="text-xs text-gray-400 mt-1">
														Created:{" "}
														{formatDate(
															task.createdAt
														)}
													</p>
												)}
												{task.modifiedAt && (
													<p className="text-xs text-gray-400 mt-1">
														Modified:{" "}
														{formatDate(
															task.modifiedAt
														)}
													</p>
												)}
											</div>
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
					)}
				</div>
			)}
		</div>
	);
};

export default TodoList;
