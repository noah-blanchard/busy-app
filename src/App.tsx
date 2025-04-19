import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	"https://aqabbiooegdfrigcouxi.supabase.co",
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYWJiaW9vZWdkZnJpZ2NvdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwOTQ0NzcsImV4cCI6MjA2MDY3MDQ3N30.MZOHtaDo7Ftomij_4_nYiUw6oAXbhQIBz_sc039LunA",
);

type User = "nono" | "lili";

function App() {
	const [user, setUser] = useState<User | null>(null);
	const [otherBusy, setOtherBusy] = useState(false);
	const [iAmBusy, setIAmBusy] = useState(false);
	const [loading, setLoading] = useState(false);

	const saveUser = (u: User) => {
		localStorage.setItem("user", u);
		setUser(u);
	};

	const getOther = (u: User): User => (u === "nono" ? "lili" : "nono");

	const fetchStatus = async (target: User) => {
		const { data, error } = await supabase
			.from("statuses")
			.select("is_busy")
			.eq("user_id", target)
			.single();

		if (error) {
			console.error("Erreur fetchStatus:", error);
			return;
		}

		setOtherBusy(data?.is_busy ?? false);
	};

	const toggleBusy = async () => {
		if (!user) return;
		setLoading(true);
		const { error } = await supabase
			.from("statuses")
			.update({ is_busy: !iAmBusy })
			.eq("user_id", user);

		if (error) {
			console.error("Erreur update:", error);
		} else {
			setIAmBusy(!iAmBusy);
		}

		setLoading(false);
	};

	const fetchInitBusy = async (u: User) => {
		const { data, error } = await supabase
			.from("statuses")
			.select("is_busy")
			.eq("user_id", u)
			.single();

		if (error) {
			console.error("Erreur update:", error);
		}

		setIAmBusy(data?.is_busy ?? false);
	};

	useEffect(() => {
		const u = localStorage.getItem("user") as User | null;
		if (u) {
			setUser(u);
			fetchInitBusy(u);
		}
	}, []);

	useEffect(() => {
		if (!user) return;

		const other = getOther(user);

		// fetch initial status of the other user
		fetchStatus(other);

		// subscribe to real-time updates
		const channel = supabase
			.channel("status-changes")
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "statuses",
					filter: `user_id=eq.${other}`,
				},
				(payload) => {
					const updated = payload.new as { is_busy: boolean };
					setOtherBusy(updated.is_busy);
					console.log(`[Realtime] ${other} updated to`, updated.is_busy);
				},
			)
			.subscribe();

		// clean up on unmount
		return () => {
			supabase.removeChannel(channel);
		};
	}, [user]);

	return (
		<div style={{ textAlign: "center", padding: 40 }}>
			{!user ? (
				<>
					<h2>Tu es ?</h2>
					<button onClick={() => saveUser("nono")}>Nono</button>
					<button onClick={() => saveUser("lili")}>Lili</button>
				</>
			) : (
				<>
					<h2>Hello {user} 👋</h2>
					<button onClick={toggleBusy} disabled={loading}>
						{loading
							? "Updating..."
							: iAmBusy
								? "I am available !"
								: "I am busy !"}
					</button>
					<p style={{ marginTop: 20 }}>
						{getOther(user)} is {otherBusy ? "busy 🛑" : "available ✅"}
					</p>
				</>
			)}
		</div>
	);
}

export default App;
