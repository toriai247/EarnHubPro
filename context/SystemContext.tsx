
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { SystemConfig } from '../types';

interface SystemContextType {
  config: SystemConfig | null;
  loading: boolean;
  refreshConfig: () => Promise<void>;
  isFeatureEnabled: (feature: keyof SystemConfig) => boolean;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase.from('system_config').select('*').maybeSingle();
      if (data) {
        setConfig(data as SystemConfig);
      } else if (!error) {
        // Init if empty
        const defaultCfg = {
            is_tasks_enabled: true,
            is_games_enabled: true,
            is_invest_enabled: true,
            is_invite_enabled: true,
            is_video_enabled: true,
            is_deposit_enabled: true,
            is_withdraw_enabled: true,
            maintenance_mode: false
        };
        await supabase.from('system_config').insert(defaultCfg);
        setConfig(defaultCfg as SystemConfig);
      }
    } catch (e) {
      console.error("Failed to load system config:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    
    // Subscribe to realtime changes
    const sub = supabase
        .channel('system_config_changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_config' }, (payload) => {
            setConfig(payload.new as SystemConfig);
        })
        .subscribe();

    return () => {
        sub.unsubscribe();
    };
  }, []);

  const isFeatureEnabled = (feature: keyof SystemConfig) => {
      if (!config) return true; // Default to true if loading or error to avoid blocking
      return !!config[feature];
  };

  return (
    <SystemContext.Provider value={{ config, loading, refreshConfig: fetchConfig, isFeatureEnabled }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
