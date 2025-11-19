
import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, AlertTriangle, Fingerprint, Key } from 'lucide-react';
import { cryptoVault } from '../services/crypto';
import { logger } from '../services/logger';

interface AuthGuardProps {
  onAuthenticated: () => void;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ onAuthenticated }) => {
  const [hasVault, setHasVault] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const salt = localStorage.getItem('gemibaby_vault_salt');
    if (salt) {
      setHasVault(true);
      logger.info('Secure vault detected. Waiting for user unlock.', 'Auth');
    } else {
      logger.info('No secure vault found. Initialization required.', 'Auth');
    }
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const salt = localStorage.getItem('gemibaby_vault_salt');
      if (!salt) throw new Error("Vault corrupted");

      const success = await cryptoVault.login(password, salt);
      if (success) {
        onAuthenticated();
      } else {
        setError("Access Denied: Invalid Credentials");
        setPassword('');
      }
    } catch (e) {
       setError("Cryptographic Error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 4) {
      setError("Password too weak");
      return;
    }

    setLoading(true);
    try {
      // Migrate existing data if any
      logger.system('Starting vault initialization and data migration...', 'Auth');
      
      // Register creates the key
      const salt = await cryptoVault.register(password);
      localStorage.setItem('gemibaby_vault_salt', salt);
      
      // Encrypt existing projects if they exist in plain text
      const existingProjects = localStorage.getItem('gemibaby_projects');
      if (existingProjects && !existingProjects.startsWith('iv:')) {
         const encrypted = await cryptoVault.encrypt(existingProjects);
         localStorage.setItem('gemibaby_projects', encrypted);
         logger.info(`Migrated ${existingProjects.length} bytes to secure storage.`, 'Auth');
      }

      onAuthenticated();
    } catch (e: any) {
      setError(e.message);
      logger.error('Registration failed', 'Auth', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gem-900 flex items-center justify-center p-4 bg-noise">
      <div className="w-full max-w-md bg-gem-800/50 backdrop-blur-xl border border-gem-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gem-accent shadow-[0_0_30px_rgba(56,189,248,0.6)]" />

        <div className="text-center mb-8">
           <div className="mx-auto w-16 h-16 bg-gem-900 rounded-full flex items-center justify-center mb-4 border border-gem-700 relative">
              {hasVault ? <Lock className="w-8 h-8 text-gem-accent" /> : <Fingerprint className="w-8 h-8 text-pink-400" />}
              <div className="absolute inset-0 rounded-full animate-pulse border border-white/5"></div>
           </div>
           <h1 className="text-2xl font-bold text-white tracking-tight">GemiBaby Secure Core</h1>
           <p className="text-slate-400 text-sm mt-2">
             {hasVault ? "Local Identity Detected. Decrypting Environment..." : "Initialize Secure Local Enclave"}
           </p>
        </div>

        <form onSubmit={hasVault ? handleUnlock : handleRegister} className="space-y-4">
           <div>
             <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1 font-bold">
                {hasVault ? "Master Key" : "Create Master Key"}
             </label>
             <div className="relative">
               <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
               <input 
                 type="password" 
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 className="w-full bg-gem-900 border border-gem-700 rounded-lg py-3 pl-10 text-white focus:border-gem-accent focus:outline-none transition-all"
                 placeholder="••••••••"
                 autoFocus
               />
             </div>
           </div>

           {!hasVault && (
             <div>
               <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1 font-bold">
                  Confirm Key
               </label>
               <div className="relative">
                 <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                 <input 
                   type="password" 
                   value={confirm}
                   onChange={e => setConfirm(e.target.value)}
                   className="w-full bg-gem-900 border border-gem-700 rounded-lg py-3 pl-10 text-white focus:border-gem-accent focus:outline-none transition-all"
                   placeholder="••••••••"
                 />
               </div>
             </div>
           )}

           {error && (
             <div className="text-red-400 text-xs flex items-center gap-2 bg-red-500/10 p-3 rounded border border-red-500/20">
               <AlertTriangle className="w-4 h-4" /> {error}
             </div>
           )}

           <button 
             type="submit" 
             disabled={loading}
             className={`w-full py-3 rounded-lg font-bold text-gem-900 transition-all flex items-center justify-center gap-2
               ${hasVault 
                 ? 'bg-gem-accent hover:bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]' 
                 : 'bg-pink-500 hover:bg-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.2)]'}`}
           >
             {loading ? "Processing Crypto..." : (hasVault ? "Unlock Enclave" : "Initialize Vault")}
             {!loading && (hasVault ? <Unlock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />)}
           </button>
        </form>
        
        <div className="mt-6 text-center">
           <p className="text-[10px] text-slate-600 uppercase tracking-widest">
              AES-GCM 256-bit Local Encryption
           </p>
        </div>
      </div>
    </div>
  );
};

export default AuthGuard;