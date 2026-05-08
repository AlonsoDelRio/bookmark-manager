import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bookmark } from "lucide-react";
import styles from "./AuthPage.module.css";

type Mode = "signin" | "signup";

export function AuthPage() {
    const { signIn, signUp } = useAuth();
    const [mode, setMode] = useState<Mode>("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (mode === "signin") {
                await signIn(email, password);
            } else {
                await signUp(email, password);
                setSuccess(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.successIcon}>✓</div>
                    <h2 className={styles.successTitle}>Check your email</h2>
                    <p className={styles.successText}>
                        We sent a confirmation link to <strong>{email}</strong>.
                        Click it to activate your account, then sign in.
                    </p>
                    <button
                        className={styles.link}
                        onClick={() => { setMode("signin"); setSuccess(false); }}
                    >
                        Back to sign in
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <Bookmark size={22} strokeWidth={1.5} />
                    </div>
                    <h1 className={styles.title}>Markd</h1>
                    <p className={styles.subtitle}>
                        {mode === "signin" ? "Welcome back" : "Create your account"}
                    </p>
                </div>

                <form onSubmit={(e) => { void handleSubmit(e); }} className={styles.form}>
                    <div className={styles.field}>
                        <label className={styles.label}>Email</label>
                        <input
                            className={styles.input}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Password</label>
                        <input
                            className={styles.input}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                            required
                            minLength={6}
                            autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button className={styles.btn} type="submit" disabled={loading}>
                        {loading
                            ? "Loading…"
                            : mode === "signin"
                                ? "Sign in"
                                : "Create account"}
                    </button>
                </form>

                <p className={styles.toggle}>
                    {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                    <button
                        className={styles.link}
                        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                    >
                        {mode === "signin" ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}
