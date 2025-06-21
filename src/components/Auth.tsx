import { useState } from "react";
import { useAuth } from "../firebase";
import { FcGoogle } from "react-icons/fc";

const Auth = () => {
	const { user, loading, error, signIn, signUp, signOut } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLogin, setIsLogin] = useState(true);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (isLogin) {
				await signIn(email, password);
			} else {
				await signUp(email, password);
			}
			// Clear form after successful auth
			setEmail("");
			setPassword("");
		} catch (err) {
			// Error is handled by the useAuth hook
			console.error("Authentication error:", err);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen">
				Loading...
			</div>
		);
	}

	if (user) {
		return (
			<div className="p-4 border rounded mb-4">
				<p className="mb-2">Logged in as: {user.email}</p>
				<button
					onClick={signOut}
					className="bg-white text-sky-500 cursor-pointer opacity-90 hover:opacity-100 hover:scale-105 transition-all ease-out duration-300 px-3 py-1 rounded-lg text-xs font-medium"
				>
					Sign Out
				</button>
			</div>
		);
	}

	return (
		<div className="flex justify-center items-center min-h-screen bg-gray-100">
			<div className="w-[50%] flex justify-center items-center">
				<div className="w-full max-w-xl bg-white overflow-hidden">
					<div className="p-4 text-sky-500 absolute top-10 left-10">
						<h1 className="text-2xl font-bold">TODO</h1>
					</div>

					<div className="p-6">
						<div className="mb-20 space-y-2 px-4">
							<h2 className="text-3xl font-bold">
								{isLogin ? "Welcome back" : "Welcome aboard"}
							</h2>
							<p className="text-sm text-gray-500">
								Empower Your Day, One Task at a Time – Stay
								Organized, Stay Ahead!
							</p>
						</div>

						{error && (
							<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
								{error}
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-8">
							<div>
								<input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Email address"
									required
									className="w-full px-4 py-4 bg-gray-100 border border-gray-300 rounded-md opacity-80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
								/>
							</div>

							<div>
								<input
									id="password"
									type="password"
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									placeholder="Password"
									required
									className="w-full px-4 py-4 bg-gray-100 border border-gray-300 rounded-md opacity-80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
								/>
							</div>

							<button
								type="submit"
								className="w-full bg-sky-500 text-white py-4 px-4 cursor-pointer rounded-md hover:bg-sky-600 transition duration-200"
							>
								{isLogin ? "Log in" : "Sign up"}
							</button>

							<div className="text-3xl flex items-center justify-center py-3 cursor-pointer bg-white border border-gray-300 hover:border-gray-400 rounded-lg opacity-80 hover:opacity-100 transition-all ease-out duration-300">
								<FcGoogle />
								<span className="text-sm px-2">
									&nbsp;{isLogin ? "Sign in" : "Sign up"} with
									Google
								</span>
							</div>

							<div className="text-center mt-4">
								{isLogin ? (
									<p className="text-sm">
										<span className="text-gray-400">
											Don't have an accound?
										</span>
										<button
											type="button"
											className="opacity-100 text-sky-500 cursor-pointer"
											onClick={() => setIsLogin(!isLogin)}
										>
											&nbsp;Sign up
										</button>
									</p>
								) : (
									<p className="text-sm">
										<span className="text-gray-400">
											Already have an account?
										</span>
										<button
											type="button"
											className="opacity-100 text-sky-500 cursor-pointer"
											onClick={() => setIsLogin(!isLogin)}
										>
											&nbsp;Log in
										</button>
									</p>
								)}
							</div>
						</form>
					</div>
				</div>
			</div>
			<div className="w-[50%] md:flex hidden justify-center items-center bg-sky-500 h-screen">
				<div className="w-[100%] h-[100%] bg-[url('https://images.pexels.com/photos/32589785/pexels-photo-32589785.jpeg?_gl=1*1srf0bj*_ga*MjEwOTg5MzIwNC4xNzUwNTAzOTY4*_ga_8JE65Q40S6*czE3NTA1MDM5NjckbzEkZzEkdDE3NTA1MDQwMDkkajE4JGwwJGgw')] bg-cover"></div>
			</div>
		</div>
	);
};

export default Auth;
