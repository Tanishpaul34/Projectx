'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Settings() {
  const [brandVoice, setBrandVoice] = useState('Professional');
  const [approvalMode, setApprovalMode] = useState('Manual Approval');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('brand_voice, approval_mode')
          .eq('id', user.id)
          .single();

        if (profile) {
          setBrandVoice(profile.brand_voice || 'Professional');
          setApprovalMode(profile.approval_mode || 'Manual Approval');
        }
      }
      setLoading(false);
    };
    fetchUserAndProfile();
  }, []);

  const saveSettings = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ brand_voice: brandVoice, approval_mode: approvalMode })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } else {
      alert('Settings saved successfully!');
    }
  };

  if (loading) return <div className="p-8 text-[var(--color-neon-cyan)] font-mono animate-pulse">Loading settings...</div>;

  return (
    <div className="p-8 relative z-10">
      <h1 className="text-3xl font-bold text-[var(--color-neon-yellow)] mb-8 drop-shadow-[0_0_8px_var(--color-neon-yellow)] uppercase tracking-wider">AI Configuration</h1>

      <div className="bg-[#111] border-2 border-[var(--color-neon-pink)] p-8 shadow-[0_0_15px_rgba(255,0,255,0.2)] max-w-2xl">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[var(--color-neon-cyan)] mb-4">Brand Voice Tone</h2>
          <p className="text-gray-400 mb-4 text-sm">Select the tone the AI will use when generating responses to your reviews.</p>
          <div className="grid grid-cols-2 gap-4">
            {['Professional', 'Friendly', 'Gen-Z', 'Minimalist'].map(voice => (
              <label
                key={voice}
                className={`flex items-center p-4 border-[1px] cursor-pointer transition-all duration-300 ${brandVoice === voice ? 'border-[var(--color-neon-cyan)] bg-[rgba(0,255,255,0.1)] shadow-[0_0_10px_rgba(0,255,255,0.5)]' : 'border-gray-700 hover:border-gray-500'}`}
              >
                <input
                  type="radio"
                  name="brandVoice"
                  value={voice}
                  checked={brandVoice === voice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  className="mr-3 accent-[var(--color-neon-cyan)] bg-transparent border-[var(--color-neon-cyan)]"
                />
                <span className={brandVoice === voice ? 'text-[var(--color-neon-cyan)] font-bold' : 'text-gray-300'}>{voice}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-[var(--color-neon-pink)] mb-4">Approval Mode</h2>
          <p className="text-gray-400 mb-4 text-sm">Determine how AI-generated responses are handled.</p>
          <div className="space-y-4">
            {[
              { id: 'Manual Approval', desc: 'AI drafts responses, but a human must click "Send".' },
              { id: 'Fully Autonomous', desc: 'AI automatically posts responses without human intervention.' }
            ].map(mode => (
              <label
                key={mode.id}
                className={`flex flex-col p-4 border-[1px] cursor-pointer transition-all duration-300 ${approvalMode === mode.id ? 'border-[var(--color-neon-pink)] bg-[rgba(255,0,255,0.1)] shadow-[0_0_10px_rgba(255,0,255,0.5)]' : 'border-gray-700 hover:border-gray-500'}`}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="approvalMode"
                    value={mode.id}
                    checked={approvalMode === mode.id}
                    onChange={(e) => setApprovalMode(e.target.value)}
                    className="mr-3 accent-[var(--color-neon-pink)]"
                  />
                  <span className={approvalMode === mode.id ? 'text-[var(--color-neon-pink)] font-bold' : 'text-gray-300'}>{mode.id}</span>
                </div>
                <span className="text-sm text-gray-500 ml-7">{mode.desc}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={saveSettings}
          className="w-full py-4 bg-transparent border-2 border-[var(--color-neon-yellow)] text-[var(--color-neon-yellow)] font-bold uppercase tracking-widest hover:bg-[var(--color-neon-yellow)] hover:text-black transition-all duration-300 shadow-[0_0_10px_var(--color-neon-yellow)] hover:shadow-[0_0_20px_var(--color-neon-yellow)]"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}
