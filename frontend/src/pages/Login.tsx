import React, { useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  goToRegister: () => void;
  loading: boolean;
  error?: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, goToRegister, loading, error }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLogin(username.trim(), password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#F3F4F6]">CourtIntel Demo</h1>
          <p className="text-[#F3F4F6BF] mt-2">Log in to manage your simulated hearings.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#000000] bg-opacity-75 rounded-2xl p-8 shadow-2xl space-y-5">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          <div className="text-center text-sm text-[#F3F4F6BF]">
            No account yet?{" "}
            <button type="button" className="text-[#1F4FFF]" onClick={goToRegister}>
              Create one
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

